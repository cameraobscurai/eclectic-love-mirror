import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

export const Route = createFileRoute('/admin/email-preview')({
  head: () => ({ meta: [{ title: 'Email preview' }, { name: 'robots', content: 'noindex' }] }),
  component: EmailPreview,
})

function EmailPreview() {
  const name = 'style-board-ready'
  const entry = TEMPLATES[name]
  if (!entry) return <div style={{ padding: 40 }}>Template not found.</div>
  const Component = entry.component
  const data = entry.previewData ?? {}
  const subject = typeof entry.subject === 'function' ? entry.subject(data) : entry.subject

  return (
    <div style={{ minHeight: '100vh', background: '#f1f1f1', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#1a1a1a80', marginBottom: 8 }}>
          Preview · {entry.displayName ?? name}
        </div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1a1a1a', marginBottom: 24 }}>
          {subject}
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #1a1a1a14', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <Component {...data} />
        </div>
      </div>
    </div>
  )
}
