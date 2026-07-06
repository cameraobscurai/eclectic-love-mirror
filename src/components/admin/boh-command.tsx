/**
 * ⌘K — searches TOOLS / PAGES / GROUPS from static registries and ITEMS via
 * a debounced server search. Enter on a PAGE zooms it; anything else
 * navigates. In the prototype despite the plan deferring it; kept because
 * it proved cheap — delete this file and its mount point to defer again.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { T, PAGES, NAV_GROUPS, TOOL_RAIL } from '../../lib/boh/boh.config'
import { searchBohProducts } from '../../lib/boh/boh.functions'

interface Result {
  kind: 'TOOL' | 'PAGE' | 'GROUP' | 'ITEM'
  label: string
  route: string
  pageIndex?: number
}

interface Props {
  onClose: () => void
  onZoomPage: (index: number) => void
  onNavigate: (route: string) => void
}

export function BohCommand({ onClose, onZoomPage, onNavigate }: Props) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [items, setItems] = useState<Result[]>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const statics = useMemo<Result[]>(
    () => [
      ...TOOL_RAIL.map((t) => ({
        kind: 'TOOL' as const,
        label: t.label.charAt(0) + t.label.slice(1).toLowerCase(),
        route: t.route,
      })),
      ...PAGES.map((p, i) => ({ kind: 'PAGE' as const, label: p.name, route: p.route, pageIndex: i })),
      ...NAV_GROUPS.map((g) => ({
        kind: 'GROUP' as const,
        label: g.name,
        route: `/admin/products?group=${g.slug}`,
      })),
    ],
    [],
  )

  useEffect(() => {
    clearTimeout(debounce.current)
    if (q.trim().length < 2) return setItems([])
    debounce.current = setTimeout(async () => {
      try {
        const rows = await searchBohProducts({ data: { q } })
        setItems(
          rows.map((r) => ({
            kind: 'ITEM' as const,
            label: `${r.name} — ${r.group}`,
            route: `/admin/products?id=${r.id}`,
          })),
        )
      } catch {
        setItems([])
      }
    }, 180)
  }, [q])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? statics.filter((r) => (r.label + ' ' + r.route).toLowerCase().includes(needle))
      : statics
    return [...filtered, ...items].slice(0, 10)
  }, [q, statics, items])

  useEffect(() => setSel(0), [results.length])

  const exec = (r: Result) => {
    onClose()
    if (r.kind === 'PAGE' && r.pageIndex !== undefined) setTimeout(() => onZoomPage(r.pageIndex!), 60)
    else onNavigate(r.route)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
      else if (e.key === 'Enter' && results[sel]) exec(results[sel])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(12,11,10,0.6)' }} />
      <div
        style={{
          position: 'fixed',
          top: '14vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          maxWidth: '92vw',
          zIndex: 81,
          background: T.panel,
          border: '1px solid rgba(235,230,220,0.18)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
          animation: 'bohDrop 0.25s ease',
          fontFamily: T.sans,
        }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools, pages, products…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(235,230,220,0.14)',
            outline: 'none',
            padding: '20px 22px',
            color: T.ink,
            fontFamily: T.sans,
            fontSize: 15,
          }}
        />
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
          {results.map((r, i) => (
            <button
              key={r.kind + r.route}
              onClick={() => exec(r)}
              onMouseEnter={() => setSel(i)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 14,
                width: '100%',
                textAlign: 'left',
                background: i === sel ? 'rgba(235,230,220,0.08)' : 'transparent',
                border: 'none',
                padding: '12px 22px',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 44, flexShrink: 0, fontSize: 9, letterSpacing: '0.16em', color: T.dim }}>{r.kind}</span>
              <span style={{ fontSize: 13, color: T.ink }}>{r.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 10, color: T.dim }}>{r.route}</span>
            </button>
          ))}
          {results.length === 0 && (
            <div style={{ padding: '28px 22px', fontSize: 11, letterSpacing: '0.18em', color: T.dim, textAlign: 'center' }}>
              NO MATCHES
            </div>
          )}
        </div>
        <div
          style={{
            borderTop: `1px solid ${T.hairline}`,
            padding: '12px 22px',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: T.dim,
            display: 'flex',
            gap: 18,
          }}
        >
          <span>↑↓ NAVIGATE</span>
          <span>ENTER OPEN</span>
          <span>ESC CLOSE</span>
        </div>
      </div>
    </>,
    document.body,
  )
}
