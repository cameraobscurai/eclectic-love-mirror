import * as React from 'react'
import {
  Body,
  Button,
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

interface PinnedPreview {
  title: string
  image_url?: string | null
  category?: string | null
}

interface Props {
  clientName?: string
  projectTitle?: string | null
  preparedByName?: string | null
  boardUrl?: string
  pinnedCount?: number
  paletteCount?: number
  pinnedPreview?: PinnedPreview[]
  palette?: string[]
}

const StyleBoardReady = ({
  clientName = 'there',
  projectTitle,
  preparedByName,
  boardUrl = 'https://eclectichive.com',
  pinnedCount = 0,
  paletteCount = 0,
  pinnedPreview = [],
  palette = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {projectTitle ? `${projectTitle} — your style board from the Hive` : 'Your style board is ready.'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>ECLECTIC HIVE · STYLE BOARD</Text>
        <Heading style={h1}>
          {projectTitle ?? 'A curation for you.'}
        </Heading>
        <Text style={lede}>
          {clientName ? `${clientName.toUpperCase()}, ` : ''}YOUR BOARD IS READY.
          {preparedByName ? ` PREPARED BY ${preparedByName.toUpperCase()}.` : ''}
        </Text>

        <Section style={{ marginTop: 32, marginBottom: 8 }}>
          <Button href={boardUrl} style={cta}>VIEW YOUR BOARD →</Button>
        </Section>

        <Hr style={hr} />

        {palette.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>PALETTE</Text>
            <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
              <tbody>
                <tr>
                  {palette.slice(0, 8).map((hex, i) => (
                    <td
                      key={`${hex}-${i}`}
                      {...({ bgcolor: hex } as any)}
                      width="40"
                      height="40"
                      style={{ backgroundColor: hex, width: 40, height: 40, border: '1px solid #1a1a1a14' }}
                    >&nbsp;</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Section>
        ) : null}

        {pinnedPreview.length > 0 ? (
          <Section style={section}>
            <Text style={sectionLabel}>
              {pinnedCount} {pinnedCount === 1 ? 'PIECE' : 'PIECES'} PINNED
            </Text>
            <table cellPadding={0} cellSpacing={0} border={0} role="presentation" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {pinnedPreview.slice(0, 4).map((item, idx) => (
                  <tr key={idx}>
                    <td width="72" style={{ padding: '0 14px 14px 0', verticalAlign: 'top' }}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          width="72"
                          height="72"
                          style={{ width: 72, height: 72, objectFit: 'cover', display: 'block', border: '1px solid #1a1a1a14', backgroundColor: '#f5f2ed' }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 72, backgroundColor: '#f5f2ed', border: '1px solid #1a1a1a14' }}>&nbsp;</div>
                      )}
                    </td>
                    <td style={{ padding: '0 0 14px 0', verticalAlign: 'top' }}>
                      <Text style={{ ...body, margin: '0 0 4px', fontFamily: 'Georgia, "Cormorant Garamond", serif', fontSize: 16, letterSpacing: 0 }}>
                        {item.title}
                      </Text>
                      {item.category ? <Text style={{ ...sectionLabel, margin: 0 }}>{item.category}</Text> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        <Section style={{ marginTop: 28 }}>
          <Button href={boardUrl} style={ctaGhost}>OPEN THE FULL BOARD</Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          REPLY TO THIS EMAIL WITH THOUGHTS · INFO@ECLECTICHIVE.COM
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#1a1a1a' }
const container = { padding: '40px 28px', maxWidth: '560px', margin: '0 auto' }
const eyebrow = { fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: '#1a1a1a99', margin: '0 0 16px' }
const h1 = { fontFamily: 'Georgia, "Cormorant Garamond", serif', fontSize: '32px', fontWeight: 400, margin: '0 0 14px', color: '#1a1a1a', letterSpacing: '-0.01em', lineHeight: 1.15 }
const lede = { fontSize: '12px', letterSpacing: '0.12em', lineHeight: '1.7', color: '#1a1a1a', margin: '0' }
const hr = { borderColor: '#1a1a1a14', margin: '28px 0' }
const section = { marginBottom: 4 }
const sectionLabel = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1a1a80', margin: '0 0 10px' }
const body = { fontSize: '12px', letterSpacing: '0.08em', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 6px' }
const footer = { fontSize: '10px', letterSpacing: '0.18em', color: '#1a1a1a80', margin: '0', lineHeight: '1.6' }
const cta = { backgroundColor: '#1a1a1a', color: '#ffffff', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, padding: '14px 22px', textDecoration: 'none', display: 'inline-block' }
const ctaGhost = { backgroundColor: 'transparent', color: '#1a1a1a', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, padding: '12px 20px', textDecoration: 'none', display: 'inline-block', border: '1px solid #1a1a1a' }

export const template = {
  component: StyleBoardReady,
  subject: (data: Record<string, any>) =>
    data?.projectTitle
      ? `${data.projectTitle} — your style board from Eclectic Hive`
      : 'Your style board is ready — Eclectic Hive',
  displayName: 'Style Board Ready (client)',
  previewData: {
    clientName: 'Jane',
    projectTitle: 'A Study in Moss & Chestnut',
    preparedByName: 'Cat Livingston',
    boardUrl: 'https://eclectichive.com/board/preview-token',
    pinnedCount: 6,
    paletteCount: 5,
    palette: ['#d4cdc4', '#8a7361', '#3c2e25', '#c9a98c', '#2e2a24'],
    pinnedPreview: [
      { title: 'Birch Lounge Chair', category: 'Seating' },
      { title: 'Pampas Tall Vessel', category: 'Styling' },
      { title: 'Moss Linen Throw', category: 'Pillows & Throws' },
      { title: 'Chestnut Side Table', category: 'Tables' },
    ],
  },
} satisfies TemplateEntry
