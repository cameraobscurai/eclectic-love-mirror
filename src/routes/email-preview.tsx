import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from '@/lib/email-templates/registry'

export const Route = createFileRoute('/email-preview')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Email preview' }, { name: 'robots', content: 'noindex' }] }),
  component: EmailPreview,
})

function EmailPreview() {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const initial = search.get('t') ?? 'style-board-ready'
  const [name, setName] = useState(initial)
  const [html, setHtml] = useState<string>('')
  const entry = TEMPLATES[name]
  const data = entry?.previewData ?? {}
  const subject = useMemo(
    () => (entry ? (typeof entry.subject === 'function' ? entry.subject(data) : entry.subject) : ''),
    [entry, data],
  )

  useEffect(() => {
    let alive = true
    if (!entry) { setHtml(''); return }
    ;(async () => {
      const out = await render(React.createElement(entry.component, data))
      if (alive) setHtml(out)
    })()
    return () => { alive = false }
  }, [entry, data])

  return (
    <div style={{ minHeight: '100vh', background: '#f1f1f1', padding: '32px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#1a1a1a80' }}>
            Email preview
          </div>
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: '#fff', border: '1px solid #1a1a1a26' }}
          >
            {Object.keys(TEMPLATES).map((k) => (
              <option key={k} value={k}>{TEMPLATES[k].displayName ?? k}</option>
            ))}
          </select>
        </div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1a1a1a', marginBottom: 20 }}>
          {subject || (entry ? '' : 'Template not found.')}
        </div>
        {entry ? (
          <iframe
            title={`preview-${name}`}
            srcDoc={html}
            style={{ width: '100%', height: '80vh', border: '1px solid #1a1a1a14', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          />
        ) : null}
      </div>
    </div>
  )
}
