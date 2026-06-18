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
  palette?: string[]
  tones?: Record<string, number>
  insights?: string[]
  inspoUrls?: string[]
}

const topTones = (tones?: Record<string, number>): string[] => {
  if (!tones) return []
  return Object.entries(tones)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k.toUpperCase()} ${Math.round(v * 100)}%`)
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
  palette = [],
  tones = {},
  insights = [],
  inspoUrls = [],
}: Props) => {
  const tonesList = topTones(tones)
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New style brief from ${name}${palette.length ? ` · ${palette.length} color${palette.length === 1 ? '' : 's'}` : ''}${items.length ? ` · ${items.length} piece${items.length === 1 ? '' : 's'}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>ECLECTIC HIVE — NEW STYLE BRIEF</Text>
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

        {palette.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>COLOR PALETTE</Text>
            <table cellPadding={0} cellSpacing={0} border={0} role="presentation" style={{ borderCollapse: 'collapse', marginBottom: '6px' }}>
              <tbody>
                <tr>
                  {palette.map((hex, i) => (
                    <td
                      key={`${hex}-${i}`}
                      bgcolor={hex}
                      width="44"
                      height="44"
                      style={{ backgroundColor: hex, width: '44px', height: '44px', border: '1px solid #1a1a1a14' }}
                    >
                      &nbsp;
                    </td>
                  ))}
                </tr>
                <tr>
                  {palette.map((hex, i) => (
                    <td
                      key={`label-${hex}-${i}`}
                      style={{ fontSize: '9px', letterSpacing: '0.12em', color: '#1a1a1a80', textAlign: 'center', padding: '4px 2px 0', fontFamily: 'monospace' }}
                    >
                      {hex.toUpperCase()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            {tonesList.length > 0 ? (
              <Text style={{ ...body, color: '#1a1a1a99', marginTop: '8px' }}>
                {tonesList.join(' · ')}
              </Text>
            ) : null}
          </Section>
        ) : null}

        {insights.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>READ</Text>
            {insights.map((s, i) => (
              <Text key={i} style={body}>• {s}</Text>
            ))}
          </Section>
        ) : null}

        {inspoUrls.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>INSPIRATION ({inspoUrls.length})</Text>
            <table cellPadding={0} cellSpacing={6} border={0} role="presentation" style={{ borderCollapse: 'separate' }}>
              <tbody>
                <tr>
                  {inspoUrls.slice(0, 8).map((url, i) => (
                    <td key={i} style={{ padding: '0' }}>
                      <Link href={url} style={{ textDecoration: 'none' }}>
                        <img
                          src={url}
                          alt={`Inspiration ${i + 1}`}
                          width="72"
                          height="72"
                          style={{ width: '72px', height: '72px', objectFit: 'cover', border: '1px solid #1a1a1a14', display: 'block' }}
                        />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <Text style={{ ...footer, marginTop: '6px' }}>
              Image links expire in 7 days. Originals live in the studio-inspo bucket.
            </Text>
          </Section>
        ) : null}

        {items.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>
              PINNED PIECES ({items.length})
            </Text>
            {items.map((item, idx) => (
              <Text key={item.rms_id ?? idx} style={body}>
                • {item.title ?? 'Untitled'}
                {item.category ? ` — ${item.category}` : ''}
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
}

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
    const palette = Array.isArray(data?.palette) ? data.palette.length : 0
    const count = Array.isArray(data?.items) ? data.items.length : 0
    const bits: string[] = []
    if (palette) bits.push(`${palette} color${palette === 1 ? '' : 's'}`)
    if (count) bits.push(`${count} piece${count === 1 ? '' : 's'}`)
    const suffix = bits.length ? ` (${bits.join(', ')})` : ''
    return `New Hive style brief — ${name}${suffix}`
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
    palette: ['#d4cdc4', '#8a7361', '#3c2e25', '#c9a98c', '#1a1a1a'],
    tones: { warm: 0.62, muted: 0.41, light: 0.33 },
    insights: ['Warm desert neutrals', 'Low contrast', 'Tactile earth tones'],
    inspoUrls: [],
    items: [
      { rms_id: 'RMS-001', title: 'Birch Lounge Chair', category: 'Seating' },
      { rms_id: 'RMS-002', title: 'Pampas Tall Vessel', category: 'Styling' },
    ],
    inquiryId: 'demo-id',
  },
} satisfies TemplateEntry
