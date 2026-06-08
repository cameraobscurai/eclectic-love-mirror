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

const BodySchema = z.object({
  inquiry_id: z.string().uuid(),
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

        let parsed: z.infer<typeof BodySchema>
        try {
          parsed = BodySchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid body' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data: inquiry, error: fetchError } = await supabase
          .from('inquiries')
          .select('id, name, email, phone, subject, message, item_snapshots, metadata')
          .eq('id', parsed.inquiry_id)
          .maybeSingle()

        if (fetchError || !inquiry) {
          return Response.json({ error: 'Inquiry not found' }, { status: 404 })
        }

        const template = TEMPLATES[TEMPLATE_NAME]
        if (!template) {
          return Response.json({ error: 'Template missing' }, { status: 500 })
        }

        const meta = (inquiry.metadata ?? {}) as Record<string, any>
        const templateData = {
          name: inquiry.name,
          email: inquiry.email,
          phone: inquiry.phone,
          subject: inquiry.subject,
          message: inquiry.message,
          projectDate: meta.project_date ?? null,
          budget: meta.budget ?? null,
          scope: meta.scope ?? null,
          items: Array.isArray(inquiry.item_snapshots) ? inquiry.item_snapshots : [],
          inquiryId: inquiry.id,
        }

        const recipient = template.to!
        const messageId = crypto.randomUUID()
        const idempotencyKey = `inquiry-${inquiry.id}`
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
            reply_to: inquiry.email,
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

        return Response.json({ success: true, queued: true })
      },
    },
  },
})
