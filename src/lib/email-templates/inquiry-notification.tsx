import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ItemSnapshot {
  rms_id?: string
  title?: string
  category?: string | null
  image_url?: string | null
}

interface Props {
  name?: string
  email?: string
  phone?: string | null
  subject?: string | null
  message?: string
  projectDate?: string | null
  budget?: string | null
  scope?: string | null
  items?: ItemSnapshot[]
  inquiryId?: string
}

const InquiryNotification = ({
  name = 'A new client',
  email = '',
  phone,
  subject,
  message = '',
  projectDate,
  budget,
  scope,
  items = [],
  inquiryId,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New inquiry from ${name}${items.length ? ` · ${items.length} piece${items.length === 1 ? '' : 's'}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>ECLECTIC HIVE — NEW INQUIRY</Text>
        <Heading style={h1}>{name}</Heading>
        <Text style={meta}>
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>
          {phone ? ` · ${phone}` : ''}
        </Text>

        {subject ? (
          <Text style={subjectLine}>{subject}</Text>
        ) : null}

        <Hr style={hr} />

        {(projectDate || budget || scope) && (
          <Section style={section}>
            <Text style={sectionLabel}>PROJECT DETAILS</Text>
            {projectDate ? <Text style={body}><strong>Date:</strong> {projectDate}</Text> : null}
            {budget ? <Text style={body}><strong>Budget:</strong> {budget}</Text> : null}
            {scope ? <Text style={body}><strong>Scope:</strong> {scope}</Text> : null}
          </Section>
        )}

        {message ? (
          <Section style={section}>
            <Text style={sectionLabel}>VISION / NOTES</Text>
            <Text style={{ ...body, whiteSpace: 'pre-wrap' as const }}>{message}</Text>
          </Section>
        ) : null}

        {items.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>
              SELECTED PIECES ({items.length})
            </Text>
            {items.map((item, idx) => (
              <Text key={item.rms_id ?? idx} style={body}>
                • {item.title ?? 'Untitled'}
                {item.category ? ` — ${item.category}` : ''}
                {item.rms_id ? ` [${item.rms_id}]` : ''}
              </Text>
            ))}
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={footer}>
          Reply to this email to respond directly to {name}.
          {inquiryId ? ` · Inquiry ID: ${inquiryId}` : ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#1a1a1a' }
const container = { padding: '32px 28px', maxWidth: '620px', margin: '0 auto' }
const eyebrow = { fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#1a1a1a99', margin: '0 0 12px' }
const h1 = { fontFamily: 'Georgia, "Cormorant Garamond", serif', fontSize: '28px', fontWeight: 400, margin: '0 0 6px', color: '#1a1a1a' }
const meta = { fontSize: '13px', color: '#1a1a1aB3', margin: '0 0 6px' }
const subjectLine = { fontSize: '14px', color: '#1a1a1a', margin: '12px 0 0', fontStyle: 'italic' as const }
const link = { color: '#1a1a1a', textDecoration: 'underline' }
const hr = { borderColor: '#1a1a1a14', margin: '24px 0' }
const section = { marginBottom: '20px' }
const sectionLabel = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1a1a80', margin: '0 0 8px' }
const body = { fontSize: '14px', lineHeight: '1.65', color: '#1a1a1a', margin: '0 0 6px' }
const footer = { fontSize: '11px', color: '#1a1a1a80', margin: '0' }

export const template = {
  component: InquiryNotification,
  subject: (data: Record<string, any>) => {
    const name = data?.name || 'Anonymous'
    const count = Array.isArray(data?.items) ? data.items.length : 0
    return count > 0
      ? `New Hive inquiry — ${name} (${count} piece${count === 1 ? '' : 's'})`
      : `New Hive inquiry — ${name}`
  },
  displayName: 'Inquiry Notification (admin)',
  to: 'info@eclectichive.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    subject: 'Spring desert event',
    message: 'Planning a 60-person sunset dinner in Amangiri. Looking for warm, low textures.',
    projectDate: '2026-09-12',
    budget: '$15k–$25k',
    scope: 'Full styling',
    items: [
      { rms_id: 'RMS-001', title: 'Birch Lounge Chair', category: 'Seating' },
      { rms_id: 'RMS-002', title: 'Pampas Tall Vessel', category: 'Styling' },
    ],
    inquiryId: 'demo-id',
  },
} satisfies TemplateEntry
