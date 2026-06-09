import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Eclectic Hive'
const SENDER_DOMAIN = 'notify.eclectichive.com'
const FROM_DOMAIN = 'eclectichive.com'
const TEMPLATE_NAME = 'inquiry-notification'

const ItemSnapshotSchema = z.object({
  rms_id: z.string().max(100).optional().nullable(),
  title: z.string().max(300).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable(),
})

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional().nullable(),
  subject: z.string().max(250).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  project_date: z.string().max(100).optional().nullable(),
  budget: z.string().max(100).optional().nullable(),
  scope: z.string().max(500).optional().nullable(),
  items: z.array(ItemSnapshotSchema).max(50).optional().default([]),
  inquiry_id: z.string().max(100).optional().nullable(),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/notify-inquiry')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server misconfigured' }, { status: 500 })
        }

        let body: z.infer<typeof BodySchema>
        try {
          body = BodySchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const template = TEMPLATES[TEMPLATE_NAME]
        if (!template) {
          return Response.json({ error: 'Template missing' }, { status: 500 })
        }

        const templateData = {
          name: body.name,
          email: body.email,
          phone: body.phone,
          subject: body.subject,
          message: body.message,
          projectDate: body.project_date,
          budget: body.budget,
          scope: body.scope,
          items: body.items ?? [],
          inquiryId: body.inquiry_id ?? undefined,
        }

        const recipient = template.to!
        const messageId = crypto.randomUUID()
        const idempotencyKey = body.inquiry_id ? `inquiry-${body.inquiry_id}` : `inquiry-${messageId}`
        const normalizedEmail = recipient.toLowerCase()

        // Suppression check
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (suppressed) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: TEMPLATE_NAME,
            recipient_email: recipient,
            status: 'suppressed',
          })
          return Response.json({ success: false, reason: 'suppressed' })
        }

        // Unsubscribe token (reuse or create)
        let unsubscribeToken: string
        const { data: existingToken } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existingToken && !existingToken.used_at) {
          unsubscribeToken = existingToken.token
        } else {
          unsubscribeToken = generateToken()
          await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: 'email', ignoreDuplicates: true },
            )
          const { data: stored } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (stored?.token) unsubscribeToken = stored.token
        }

        // Render
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        // Log pending then enqueue
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: TEMPLATE_NAME,
          recipient_email: recipient,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: recipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            reply_to: body.email,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: TEMPLATE_NAME,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: TEMPLATE_NAME,
            recipient_email: recipient,
            status: 'failed',
            error_message: enqueueError.message,
          })
          return Response.json({ error: 'Failed to enqueue' }, { status: 500 })
        }

        // --- Submitter confirmation (fire-and-forget; failures don't break admin flow) ---
        try {
          const CONFIRM_TEMPLATE = 'inquiry-confirmation'
          const confirmTpl = TEMPLATES[CONFIRM_TEMPLATE]
          if (confirmTpl && body.email) {
            const submitterEmail = body.email.toLowerCase()
            const { data: subSuppressed } = await supabase
              .from('suppressed_emails')
              .select('id')
              .eq('email', submitterEmail)
              .maybeSingle()

            if (!subSuppressed) {
              const confirmData = {
                name: body.name,
                projectDate: body.project_date,
                budget: body.budget,
                scope: body.scope,
                items: body.items ?? [],
                inquiryId: body.inquiry_id ?? undefined,
              }
              const confirmMessageId = crypto.randomUUID()
              const confirmIdempotency = body.inquiry_id
                ? `inquiry-confirm-${body.inquiry_id}`
                : `inquiry-confirm-${confirmMessageId}`

              // Unsubscribe token for submitter
              let subToken: string
              const { data: existingSubToken } = await supabase
                .from('email_unsubscribe_tokens')
                .select('token, used_at')
                .eq('email', submitterEmail)
                .maybeSingle()
              if (existingSubToken && !existingSubToken.used_at) {
                subToken = existingSubToken.token
              } else {
                subToken = generateToken()
                await supabase
                  .from('email_unsubscribe_tokens')
                  .upsert(
                    { token: subToken, email: submitterEmail },
                    { onConflict: 'email', ignoreDuplicates: true },
                  )
                const { data: storedSub } = await supabase
                  .from('email_unsubscribe_tokens')
                  .select('token')
                  .eq('email', submitterEmail)
                  .maybeSingle()
                if (storedSub?.token) subToken = storedSub.token
              }

              const confirmElement = React.createElement(confirmTpl.component, confirmData)
              const confirmHtml = await render(confirmElement)
              const confirmText = await render(confirmElement, { plainText: true })
              const confirmSubject =
                typeof confirmTpl.subject === 'function'
                  ? confirmTpl.subject(confirmData)
                  : confirmTpl.subject

              await supabase.from('email_send_log').insert({
                message_id: confirmMessageId,
                template_name: CONFIRM_TEMPLATE,
                recipient_email: body.email,
                status: 'pending',
              })

              const { error: confirmEnqueueError } = await supabase.rpc('enqueue_email', {
                queue_name: 'transactional_emails',
                payload: {
                  message_id: confirmMessageId,
                  to: body.email,
                  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                  reply_to: `info@${FROM_DOMAIN}`,
                  sender_domain: SENDER_DOMAIN,
                  subject: confirmSubject,
                  html: confirmHtml,
                  text: confirmText,
                  purpose: 'transactional',
                  label: CONFIRM_TEMPLATE,
                  idempotency_key: confirmIdempotency,
                  unsubscribe_token: subToken,
                  queued_at: new Date().toISOString(),
                },
              })

              if (confirmEnqueueError) {
                await supabase.from('email_send_log').insert({
                  message_id: confirmMessageId,
                  template_name: CONFIRM_TEMPLATE,
                  recipient_email: body.email,
                  status: 'failed',
                  error_message: confirmEnqueueError.message,
                })
              }
            }
          }
        } catch (err) {
          console.warn('Submitter confirmation failed:', err)
        }

        return Response.json({ success: true, queued: true })
      },
    },
  },
})

