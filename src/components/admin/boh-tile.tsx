/**
 * BOH tile — one page in the grid.
 *
 * The tile is a snapshot, never a live page (grid stays free: no sixteen
 * WebGL heroes breathing in miniature). The zoom is where the page comes
 * alive. The tile's only jobs: show the freshest capture, expose its rect
 * for the FLIP transition, and degrade quietly (charcoal placeholder when
 * empty, shimmer while a sweep is mid-capture, small retry when a single
 * capture failed — one bad page never poisons the grid).
 */
import { forwardRef } from 'react'
import { T, type BohPage } from '../../lib/boh/boh.config'
import type { SnapshotRow } from '../../lib/boh/boh.functions'

interface Props {
  page: BohPage
  snapshot: SnapshotRow | undefined
  /** static poster for the home tile — never scraped */
  posterOverride?: string
  badge?: string | null
  onOpen: (rect: DOMRect) => void
  onRetry: () => void
}

export const BohTile = forwardRef<HTMLDivElement, Props>(function BohTile(
  { page, snapshot, posterOverride, badge, onOpen, onRetry },
  ref,
) {
  const status = posterOverride ? 'fresh' : snapshot?.status ?? 'empty'
  const src = posterOverride ?? snapshot?.url ?? null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        aria-label={`Open ${page.name}`}
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        className="boh-tile-btn"
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: `${T.frameW}/${T.frameH}`,
          background: T.panel,
          border: `1px solid ${T.hairline}`,
          cursor: 'pointer',
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.25s',
        }}
      >
        {src && status !== 'empty' ? (
          <img
            src={src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: status === 'pending' ? 0.45 : 1,
              transition: 'opacity 0.4s',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              fontFamily: T.serif,
              fontStyle: 'italic',
              fontSize: 22,
              color: T.dim,
            }}
          >
            {status === 'pending' ? 'Capturing…' : page.name}
          </div>
        )}

        {status === 'pending' && <div className="boh-shimmer" />}

        {badge && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              padding: '4px 8px',
              background: T.chipBg,
              border: `1px solid rgba(196,115,90,0.5)`,
              color: T.attention,
              fontSize: 9,
              letterSpacing: '0.14em',
              fontFamily: T.sans,
            }}
          >
            {badge}
          </span>
        )}
      </button>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 12,
        }}
      >
        <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 19, color: T.ink }}>
          <span style={{ color: T.dim }}>{page.num}</span>
          <span style={{ display: 'inline-block', width: 12 }} />
          {page.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          {status === 'failed' && (
            <button
              onClick={onRetry}
              style={{
                background: 'none',
                border: 'none',
                color: T.attention,
                fontSize: 9,
                letterSpacing: '0.14em',
                cursor: 'pointer',
                fontFamily: T.sans,
                padding: 0,
              }}
            >
              CAPTURE FAILED · RETRY
            </button>
          )}
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>{page.route}</span>
        </div>
      </div>
    </div>
  )
})
