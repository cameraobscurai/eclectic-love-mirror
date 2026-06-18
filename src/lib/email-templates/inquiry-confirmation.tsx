import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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
  projectDate?: string | null
  budget?: string | null
  scope?: string | null
  items?: ItemSnapshot[]
  inquiryId?: string
  palette?: string[]
}

const InquiryConfirmation = ({
  name = 'there',
  projectDate,
  budget,
  scope,
  items = [],
  inquiryId,
  palette = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your style brief — the Hive will be in touch shortly.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>ECLECTIC HIVE</Text>
        <Heading style={h1}>Thank you, {name}.</Heading>
        <Text style={lede}>
          WE'VE RECEIVED YOUR STYLE BRIEF. A MEMBER OF THE HIVE WILL BE IN TOUCH SHORTLY.
        </Text>

        <Hr style={hr} />

        {(projectDate || budget || scope || items.length > 0) && (
          <Section style={section}>
            <Text style={sectionLabel}>YOUR BRIEF</Text>
            {projectDate ? <Text style={body}><strong>DATE:</strong> {projectDate}</Text> : null}
            {budget ? <Text style={body}><strong>BUDGET:</strong> {budget}</Text> : null}
            {scope ? <Text style={body}><strong>SCOPE:</strong> {scope}</Text> : null}
            {items.length > 0 ? (
              <Text style={body}>
                <strong>PIECES SELECTED:</strong> {items.length}
              </Text>
            ) : null}
          </Section>
        )}

        {palette.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>YOUR COLOR PALETTE</Text>
            <table cellPadding={0} cellSpacing={0} border={0} role="presentation" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  {palette.map((hex, i) => (
                    <td
                      key={`${hex}-${i}`}
                      {...({ bgcolor: hex } as any)}
                      width="40"
                      height="40"
                      style={{ backgroundColor: hex, width: '40px', height: '40px', border: '1px solid #1a1a1a14' }}
                    >
                      &nbsp;
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={footer}>
          REPLY TO THIS EMAIL TO REACH US DIRECTLY AT INFO@ECLECTICHIVE.COM.
          {inquiryId ? ` · REF ${inquiryId.slice(0, 8).toUpperCase()}` : ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#1a1a1a' }
const container = { padding: '40px 28px', maxWidth: '560px', margin: '0 auto' }
const eyebrow = { fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: '#1a1a1a99', margin: '0 0 16px' }
const h1 = { fontFamily: 'Georgia, "Cormorant Garamond", serif', fontSize: '30px', fontWeight: 400, margin: '0 0 14px', color: '#1a1a1a', letterSpacing: '-0.01em' }
const lede = { fontSize: '12px', letterSpacing: '0.12em', lineHeight: '1.7', color: '#1a1a1a', margin: '0' }
const hr = { borderColor: '#1a1a1a14', margin: '28px 0' }
const section = { marginBottom: '4px' }
const sectionLabel = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1a1a80', margin: '0 0 10px' }
const body = { fontSize: '12px', letterSpacing: '0.08em', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 6px' }
const footer = { fontSize: '10px', letterSpacing: '0.18em', color: '#1a1a1a80', margin: '0', lineHeight: '1.6' }

export const template = {
  component: InquiryConfirmation,
  subject: 'We received your inquiry — Eclectic Hive',
  displayName: 'Inquiry Confirmation (submitter)',
  previewData: {
    name: 'Jane',
    projectDate: '2026-09-12',
    budget: '$15k–$25k',
    scope: 'Full styling',
    palette: ['#d4cdc4', '#8a7361', '#3c2e25', '#c9a98c'],
    items: [
      { rms_id: 'RMS-001', title: 'Birch Lounge Chair', category: 'Seating' },
      { rms_id: 'RMS-002', title: 'Pampas Tall Vessel', category: 'Styling' },
    ],
    inquiryId: 'demo-id',
  },
} satisfies TemplateEntry
