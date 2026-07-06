/**
 * BOH zoom — tile → full canvas.
 *
 * Motion model (settles the prototype's FLIP pattern against the snapshot
 * spec): the SNAPSHOT is the shared element. A fixed-position frame sized
 * frameW×frameH transforms from the tile's rect to a centered canvas
 * (viewport minus the 340px tools rail) with the snapshot filling it. The
 * live same-origin iframe mounts UNDERNEATH the snapshot immediately; when
 * it fires onLoad and the transition has landed, the snapshot fades out.
 * Same nodes throughout — no remount, no white flash, and the page is
 * "already there" the moment the morph finishes.
 *
 * Pencil overlay: reads `[data-boh]` nodes from the iframe document
 * (same-origin), positions outline+chip affordances via
 * getBoundingClientRect, resolves label/destination from EDIT_POINTS.
 * Repositions on iframe scroll/resize. If the site ever moves to another
 * subdomain than /admin, this layer dies — the dependency is deliberate.
 *
 * Requires public routes to send `frame-ancestors 'self'` (not DENY).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { T, PAGE_TOOLS, resolveEditPoint, type BohPage } from '../../lib/boh/boh.config'

interface Pencil {
  key: string
  label: string
  route: string
  top: number
  left: number
  width: number
  height: number
}

interface Props {
  page: BohPage
  snapshotUrl: string | null
  fromRect: { left: number; top: number; width: number }
  onClose: () => void
  onNavigate: (route: string) => void
}

export function BohZoom({ page, snapshotUrl, fromRect, onClose, onNavigate }: Props) {
  const [phase, setPhase] = useState<'from' | 'open' | 'closing'>('from')
  const [iframeReady, setIframeReady] = useState(false)
  const [pencils, setPencils] = useState<Pencil[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // — enter
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase('open')),
    )
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  // — exit
  const close = useCallback(() => {
    if (reduced) return onClose()
    setPhase('closing')
    setTimeout(onClose, T.zoomMs + 30)
  }, [onClose, reduced])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // — pencil overlay from same-origin iframe DOM
  const measurePencils = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const found: Pencil[] = []
    doc.querySelectorAll<HTMLElement>('[data-boh]').forEach((el) => {
      const ep = resolveEditPoint(el.dataset.boh!)
      if (!ep) return
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) return // hidden/collapsed nodes
      found.push({ key: ep.key, label: ep.label, route: ep.route, top: r.top, left: r.left, width: r.width, height: r.height })
    })
    setPencils(found)
  }, [])

  const onIframeLoad = useCallback(() => {
    setIframeReady(true)
    measurePencils()
    const win = iframeRef.current?.contentWindow
    win?.addEventListener('scroll', measurePencils, { passive: true })
    win?.addEventListener('resize', measurePencils)
  }, [measurePencils])

  // — FLIP geometry (prototype's frameStyle, verbatim math)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const avail = vw - T.railW
  const ts = Math.min((avail - 80) / T.frameW, (vh - 100) / T.frameH)
  const toT = `translate(${(avail - T.frameW * ts) / 2}px, ${(vh - T.frameH * ts) / 2 + 8}px) scale(${ts})`
  const fromT = `translate(${fromRect.left}px, ${fromRect.top}px) scale(${fromRect.width / T.frameW})`
  const open = phase === 'open'

  const frameStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: T.frameW,
    height: T.frameH,
    transformOrigin: 'top left',
    transform: reduced ? toT : open ? toT : fromT,
    transition: reduced ? 'none' : `transform ${T.zoomMs}ms ${T.zoomEase}`,
    zIndex: 60,
    overflow: 'hidden',
    boxShadow: '0 40px 140px rgba(0,0,0,0.6)',
    background: T.page,
  }

  return createPortal(
    <>
      {/* backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(16,15,14,0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.45s ease',
        }}
      />

      {/* the frame: iframe under, snapshot over, pencils on top */}
      <div style={frameStyle}>
        <iframe
          ref={iframeRef}
          title={page.name}
          src={page.route}
          onLoad={onIframeLoad}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            pointerEvents: open ? 'auto' : 'none',
          }}
        />
        {snapshotUrl && (
          <img
            src={snapshotUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              opacity: iframeReady && open ? 0 : 1,
              transition: 'opacity 0.5s ease 0.1s',
            }}
          />
        )}
        {open &&
          iframeReady &&
          pencils.map((p) => (
            <button
              key={p.key + p.top}
              onClick={() => onNavigate(p.route)}
              className="boh-pencil"
              style={{
                position: 'absolute',
                top: p.top,
                left: p.left,
                width: p.width,
                height: p.height,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                className="boh-pencil-chip"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: '8px 14px',
                  background: T.chipBg,
                  border: '1px solid rgba(235,230,220,0.3)',
                  color: T.ink,
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  fontFamily: T.sans,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </span>
            </button>
          ))}
      </div>

      {/* zoom chrome */}
      {open && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: T.railW,
              zIndex: 70,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              padding: '20px 40px',
              animation: 'bohFadeIn 0.35s ease',
              fontFamily: T.sans,
            }}
          >
            <button
              onClick={close}
              style={{
                background: 'rgba(25,24,23,0.92)',
                border: '1px solid rgba(235,230,220,0.25)',
                color: T.ink,
                padding: '10px 16px',
                fontSize: 11,
                letterSpacing: '0.2em',
                cursor: 'pointer',
              }}
            >
              ← ALL PAGES
            </button>
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 20, color: T.ink }}>
              {page.num} — {page.name}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{page.route}</div>
            <div style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: '0.16em', color: T.dim }}>ESC</div>
          </div>

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: T.railW,
              zIndex: 70,
              background: '#1D1C1A',
              borderLeft: `1px solid ${T.hairline}`,
              padding: '88px 30px 30px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              animation: reduced ? undefined : `bohRailIn 0.45s ${T.zoomEase}`,
              fontFamily: T.sans,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.26em', color: T.dim }}>PAGE TOOLS</div>
            <div style={{ marginTop: 6 }}>
              {(PAGE_TOOLS[page.slug] ?? []).map((t) => (
                <button
                  key={t.route}
                  onClick={() => onNavigate(t.route)}
                  className="boh-rail-item"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: `1px solid ${T.hairline}`,
                    padding: '18px 0',
                    cursor: 'pointer',
                    color: T.ink,
                    transition: 'padding 0.2s',
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: '0.18em' }}>{t.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{t.sub}</div>
                  <div style={{ marginTop: 8, fontFamily: T.mono, fontSize: 10, color: T.dim }}>{t.route}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 26, fontSize: 10, letterSpacing: '0.16em', color: T.dim, lineHeight: 1.9 }}>
              EVERY TOOL OPENS THE EXISTING ADMIN. HOVER THE PAGE TO FIND ✎ EDIT POINTS.
            </div>
          </div>
        </>
      )}
    </>,
    document.body,
  )
}
