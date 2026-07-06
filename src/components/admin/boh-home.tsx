/**
 * BOH home — the whole surface.
 *
 * Layout (from prototype, which supersedes the plan's 17-tile filmstrip):
 * top bar · greeting + linked ribbon · tool rail · 3×2 page grid ·
 * collapsible category strip. Six pages zoom; eleven groups are quick
 * links with attention badges. Manual refresh sweeps sequentially and the
 * grid polls so tiles shimmer→refresh as a visible wave, not a 30s void.
 *
 * URL state: zoom pushes ?page=<slug>; back/forward and reload restore it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router' // ADAPT route id below
import {
  T, PAGES, NAV_GROUPS, TOOL_RAIL,
} from '../../lib/boh/boh.config'
import {
  getBohRibbon, getBohSnapshots, getBohAttentionBadges,
  refreshBohSnapshots, refreshOneSnapshot,
  type BohRibbon, type SnapshotRow,
} from '../../lib/boh/boh.functions'
import { BohTile } from './boh-tile'
import { BohZoom } from './boh-zoom'
import { BohCommand } from './boh-command'
import { supabase } from '@/integrations/supabase/client' // ADAPT: client (browser) supabase

const HOME_POSTER = 'https://eclectichive.com/media/home/01-poster.jpg'

export function BohHome({ firstName: firstNameProp }: { firstName?: string }) {
  const navigate = useNavigate()
  // FIX 4: derive the greeting name client-side (route is ssr:false; the
  // session lives in localStorage). Prop wins if a caller passes one.
  const [sessionName, setSessionName] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setSessionName(
        (u.user_metadata?.first_name as string | undefined) ??
          u.email?.split('@')[0] ??
          null,
      )
    })
  }, [])
  const firstName = firstNameProp ?? sessionName ?? 'there'
  const search = useSearch({ strict: false }) as { page?: string }

  const [ribbon, setRibbon] = useState<BohRibbon | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([])
  const [badges, setBadges] = useState<Record<string, { label: string } | null>>({})
  const [catsOpen, setCatsOpen] = useState(false)
  const [sweeping, setSweeping] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [zoom, setZoom] = useState<{ index: number; rect: { left: number; top: number; width: number } } | null>(null)

  const cells = useRef<(HTMLDivElement | null)[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // — data
  const loadSnapshots = useCallback(async () => setSnapshots(await getBohSnapshots()), [])
  useEffect(() => {
    getBohRibbon().then(setRibbon).catch(() => {})
    getBohAttentionBadges().then(setBadges).catch(() => {})
    loadSnapshots().catch(() => {})
  }, [loadSnapshots])

  // — restore zoom from URL (reload / back-forward)
  useEffect(() => {
    if (!search.page) { setZoom(null); return }
    const i = PAGES.findIndex((p) => p.slug === search.page)
    if (i >= 0 && !zoom) {
      const rect = cells.current[i]?.querySelector('button')?.getBoundingClientRect()
      setZoom({ index: i, rect: rect ? { left: rect.left, top: rect.top, width: rect.width } : { left: innerWidth / 2 - 150, top: innerHeight / 2 - 100, width: 300 } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.page])

  const openZoom = useCallback((index: number, rect?: DOMRect) => {
    const r = rect ?? cells.current[index]?.querySelector('button')?.getBoundingClientRect()
    if (!r) return
    setZoom({ index, rect: { left: r.left, top: r.top, width: r.width } })
    navigate({ search: ((s: { page?: string }) => ({ ...s, page: PAGES[index].slug })) as never, replace: false })
  }, [navigate])

  const closeZoom = useCallback(() => {
    const i = zoom?.index
    setZoom(null)
    navigate({ search: ((s: { page?: string }) => ({ ...s, page: undefined })) as never, replace: false })
    if (i != null) cells.current[i]?.querySelector('button')?.focus()
  }, [zoom, navigate])

  const go = useCallback((route: string) => {
    // Deep-links land on existing admin tools — real navigation, not toasts.
    window.location.assign(route)
  }, [])

  // — refresh sweep + polling wave
  const sweep = useCallback(async () => {
    if (sweeping) return
    setSweeping(true)
    pollRef.current = setInterval(loadSnapshots, 2500)
    try {
      const res = await refreshBohSnapshots()
      if (res.status === 'rate_limited') {
        // quiet: staleness text simply doesn't change
      }
    } finally {
      clearInterval(pollRef.current)
      await loadSnapshots()
      setSweeping(false)
    }
  }, [sweeping, loadSnapshots])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // — keyboard: ⌘K, arrows over the 6-tile grid
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
        return
      }
      if (cmdOpen || zoom) return
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        const btns = cells.current.map((c) => c?.querySelector('button') ?? null)
        const i = btns.indexOf(document.activeElement as HTMLButtonElement)
        if (i < 0) return
        e.preventDefault()
        const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key]!
        const t = i + delta
        if (t >= 0 && t < PAGES.length) btns[t]?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdOpen, zoom])

  // — derived
  const h = new Date().getHours()
  const tod = h < 12 ? 'MORNING' : h < 18 ? 'AFTERNOON' : 'EVENING'
  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
  const newest = snapshots.reduce<string | null>((m, s) => (s.updated_at && (!m || s.updated_at > m) ? s.updated_at : m), null)
  const staleness = newest ? relTime(newest) : null
  const snapFor = (slug: string) => snapshots.find((s) => s.route_slug === slug)

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.sans }}>
      <BohStyles />

      {/* top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 48px', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 17, letterSpacing: '0.22em' }}>ECLECTIC HIVE</span>
          <span style={{ color: T.faint }}>—</span>
          <span style={{ fontSize: 11, letterSpacing: '0.26em', color: '#CFC9BD' }}>BACK OF HOUSE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.2em', color: T.dim }}>{dateLine}</span>
          <button onClick={() => setCmdOpen(true)} className="boh-ghost-btn">⌘K · SEARCH</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <button onClick={sweep} disabled={sweeping} className="boh-ghost-btn" aria-label="Refresh page snapshots">
              {sweeping ? '↻ CAPTURING…' : '↻ REFRESH'}
            </button>
            {staleness && <span style={{ fontSize: 9, letterSpacing: '0.14em', color: T.dim }}>LAST REFRESHED {staleness}</span>}
          </div>
        </div>
      </div>

      {/* greeting + ribbon */}
      <div style={{ maxWidth: 1560, margin: '0 auto', padding: '50px 48px 0', boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 500, fontSize: 'clamp(54px, 5.5vw, 82px)', letterSpacing: '0.05em', lineHeight: 1 }}>
          {tod}, {firstName.toUpperCase()}.
        </h1>
        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, fontSize: 12, letterSpacing: '0.2em', color: T.muted }}>
          <RibbonLink onClick={() => go('/admin/products')} text={ribbon ? `${ribbon.totalItems} ITEMS` : '— ITEMS'} />
          <Dot />
          <RibbonLink onClick={() => go('/admin/photos?filter=missing')} text={ribbon ? `${ribbon.imagedPct}% IMAGED` : '—% IMAGED'} />
          <Dot />
          <RibbonLink
            onClick={() => go('/admin/insights')}
            text={ribbon ? `${ribbon.openInquiries} OPEN INQUIRIES` : '— OPEN INQUIRIES'}
            accent={!!ribbon && ribbon.openInquiries > 0}
          />
          {ribbon?.lastPublishedAt && (<><Dot /><span>PUBLISHED {relTime(ribbon.lastPublishedAt)}</span></>)}
        </div>
      </div>

      {/* tool grid — six admin tools in a 3×2 */}
      <div data-boh-grid style={{ maxWidth: 1560, margin: '0 auto', padding: '44px 48px 0', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px 28px' }}>
        {TOOL_RAIL.map((t) => {
          const count = t.countKey && ribbon ? ribbon[t.countKey] : null
          const accent = t.countKey === 'openInquiries' && ribbon && ribbon.openInquiries > 0
          return (
            <button
              key={t.label}
              onClick={() => go(t.route)}
              className="boh-tool-tile"
              style={{ background: T.panel, border: `1px solid ${T.hairline}`, padding: '28px 26px', textAlign: 'left', cursor: 'pointer', color: T.ink, fontFamily: 'inherit', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'border-color 0.2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontFamily: T.serif, fontSize: 26, letterSpacing: '0.06em', lineHeight: 1 }}>{t.label}</span>
                {count != null && (
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: accent ? T.attention : T.dim, letterSpacing: '0.08em' }}>
                    {count}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.14em', color: T.muted, lineHeight: 1.4 }}>{t.desc.toUpperCase()}</span>
                <span style={{ fontSize: 10, letterSpacing: '0.2em', color: T.faint }}>→</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* category strip */}
      <div style={{ maxWidth: 1560, margin: '0 auto', padding: '40px 48px 72px', boxSizing: 'border-box' }}>
        <button onClick={() => setCatsOpen((v) => !v)} className="boh-strip-toggle">
          <span>{catsOpen ? '▾' : '▸'}<span style={{ display: 'inline-block', width: 14 }} />HIVE SIGNATURE COLLECTION — {NAV_GROUPS.length} CATEGORY VIEWS</span>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.dim }}>/collection?group=…</span>
        </button>
        {catsOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 20, paddingTop: 12, animation: 'bohFadeIn 0.4s ease' }}>
            {NAV_GROUPS.map((g) => (
              <button key={g.slug} onClick={() => go(`/admin/products?group=${g.slug}`)} className="boh-cat-card">
                {g.image ? (
                  <img src={g.image} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', background: '#25231F', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '3/4', background: '#25231F' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 2px 0' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.16em', color: '#B9B2A3' }}>{g.name.toUpperCase()}</span>
                </div>
                {badges[g.slug] && (
                  <span
                    role="link"
                    onClick={(e) => { e.stopPropagation(); go('/admin/photos?filter=missing') }}
                    style={{ position: 'absolute', top: 8, left: 8, padding: '4px 7px', background: 'rgba(20,19,17,0.9)', border: '1px solid rgba(196,115,90,0.5)', color: T.attention, fontSize: 8, letterSpacing: '0.12em' }}
                  >
                    {badges[g.slug]!.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* overlays */}
      {zoom && (
        <BohZoom
          page={PAGES[zoom.index]}
          snapshotUrl={PAGES[zoom.index].slug === 'home' ? HOME_POSTER : snapFor(PAGES[zoom.index].slug)?.url ?? null}
          fromRect={zoom.rect}
          onClose={closeZoom}
          onNavigate={go}
        />
      )}
      {cmdOpen && <BohCommand onClose={() => setCmdOpen(false)} onZoomPage={openZoom} onNavigate={go} />}
    </div>
  )
}

// ————————————————————————————————————————————— bits
function Dot() { return <span style={{ color: T.faint }}>·</span> }

function RibbonLink({ text, onClick, accent }: { text: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="boh-ribbon-link" style={{ color: accent ? T.attention : 'inherit' }}>
      {text}
    </button>
  )
}

function relTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}M AGO`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}H AGO`
  return `${Math.round(hrs / 24)}D AGO`
}

/** Hover/focus states + keyframes that inline styles can't express. */
function BohStyles() {
  return (
    <style>{`
      @keyframes bohFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes bohRailIn { from { transform: translateX(48px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      @keyframes bohDrop { from { opacity: 0; transform: translate(-50%, -10px) } }
      @keyframes bohShimmer { from { transform: translateX(-100%) } to { transform: translateX(100%) } }
      .boh-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(235,230,220,0.07) 50%, transparent 70%); animation: bohShimmer 1.6s infinite; pointer-events: none; }
      .boh-ghost-btn { background: transparent; border: 1px solid rgba(235,230,220,0.2); color: ${T.muted}; padding: 7px 12px; font-size: 10px; letter-spacing: 0.16em; cursor: pointer; transition: all 0.2s; font-family: inherit; }
      .boh-ghost-btn:hover:not(:disabled) { border-color: rgba(235,230,220,0.45); color: ${T.ink}; }
      .boh-tile-btn:hover, .boh-tile-btn:focus-visible { border-color: ${T.hairlineHover}; }
      .boh-tile-btn:focus-visible { outline: 1px solid ${T.ink}; outline-offset: 3px; }
      .boh-rail-link { background: none; border: none; padding: 10px 0; color: ${T.muted}; font-size: 11px; letter-spacing: 0.22em; cursor: pointer; transition: color 0.2s; font-family: inherit; }
      .boh-rail-link:hover { color: ${T.ink}; }
      .boh-ribbon-link { background: none; border: none; padding: 0; font: inherit; letter-spacing: inherit; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
      .boh-ribbon-link:hover { border-bottom-color: currentColor; }
      .boh-strip-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: none; border-top: 1px solid ${T.hairline}; padding: 18px 0; color: ${T.muted}; font-size: 11px; letter-spacing: 0.2em; cursor: pointer; transition: color 0.2s; font-family: inherit; }
      .boh-strip-toggle:hover { color: ${T.ink}; }
      .boh-cat-card { position: relative; background: none; border: none; padding: 0; cursor: pointer; text-align: left; transition: opacity 0.2s; font-family: inherit; }
      .boh-cat-card:hover { opacity: 0.8; }
      .boh-rail-item:hover { padding-left: 6px !important; }
      .boh-pencil:hover { border-color: rgba(235,230,220,0.6) !important; }
      .boh-pencil .boh-pencil-chip { opacity: 0; transition: opacity 0.25s; }
      .boh-pencil:hover .boh-pencil-chip, .boh-pencil:focus-visible .boh-pencil-chip { opacity: 1; }
      @media (prefers-reduced-motion: reduce) { .boh-shimmer { animation: none } }
      @media (max-width: 900px) {
        /* Mobile: grid becomes a list, no zoom — tiles deep-link straight through. */
        [data-boh-grid] { grid-template-columns: 1fr !important; }
      }
    `}</style>
  )
}
