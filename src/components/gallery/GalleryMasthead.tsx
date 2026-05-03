import type { ReactNode } from "react";
import type { GalleryCategory } from "@/content/gallery-projects";

export type CategoryFilter = "All" | GalleryCategory;

interface GalleryMastheadProps {
  total: number;
  visibleCount: number;
  active: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (next: CategoryFilter) => void;
  mapSlot?: ReactNode;
}

const FILTERS: CategoryFilter[] = [
  "All",
  "Luxury Weddings",
  "Meetings + Incentive Travel",
  "Social + Non-Profit",
];

export function GalleryMasthead({
  total,
  visibleCount,
  active,
  counts,
  onChange,
  mapSlot,
}: GalleryMastheadProps) {
  return (
    <>
      <style>{`
        /*
         * GALLERY MASTHEAD
         * Full-viewport dark stage. Three independent absolute layers:
         *   z:1 — heading + counter (bottom-left, bleeds right)
         *   z:1 — ghost panel (decorative, trails behind map)
         *   z:2 — map panel (center-right, floats at true viewport middle)
         *   z:3 — pills (bottom, full width)
         *
         * The section fills 100vh. <main> has no paddingTop — a spacer div
         * handles nav clearance so the section's coordinate space is 0,0 at
         * the top of the viewport, making top:50% genuinely centered.
         */

        .gmast-stage {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #0d0d0d;
          overflow: hidden;
        }

        /* ── COUNTER ─────────────────────────────────────────────────── */
        .gmast-counter {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          /* sits 10px above the top of the heading */
          bottom: calc(
            clamp(56px, 7vh, 96px) +
            clamp(60px, 7.8vw, 124px) +
            12px
          );
          margin: 0;
          font-family: var(--font-sans);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245, 242, 237, 0.42);
          z-index: 1;
          white-space: nowrap;
        }

        /* ── HEADING ─────────────────────────────────────────────────── */
        /*
         * Sits in the lower-left. "THE GALLERY" in one line.
         * At ~1280px, font-size ≈ 100px → total width ≈ 860px.
         * Map panel left edge is at ~44vw from right = ~56vw from left.
         * At 1280px that's ~717px. So "RY" (last ~12% of word) passes
         * behind the panel. At 1920px font ≈ 124px, word ≈ 1060px,
         * panel left ≈ 875px — same overlap ratio. Intentional.
         */
        .gmast-heading {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          bottom: clamp(56px, 7vh, 96px);
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(60px, 7.8vw, 124px);
          letter-spacing: -0.015em;
          line-height: 1;
          color: rgba(245, 242, 237, 0.94);
          white-space: nowrap;
          text-transform: uppercase;
          z-index: 1;
          /* heading is BEHIND the map panel — panels are z:2 */
        }

        /* ── PANELS GROUP ────────────────────────────────────────────── */
        /*
         * Absolutely positioned, right-aligned, vertically centered.
         * Width ~44vw keeps the panel's left edge at ~56vw from left,
         * which is where "RY" of "GALLERY" lands at target viewports.
         */
        .gmast-panels {
          position: absolute;
          right: clamp(24px, 3vw, 48px);
          top: 50%;
          transform: translateY(-50%);
          width: clamp(400px, 44vw, 700px);
          height: clamp(290px, 38vh, 460px);
          z-index: 2;
        }

        /* ── GHOST PANEL ─────────────────────────────────────────────── */
        /*
         * Decorative depth card. Positioned relative to .gmast-panels.
         * right: calc(100% - 30px) means its right edge is 30px left of
         * the map panel's left edge — only that 30px sliver is visible.
         * Over pure #0d0d0d the blur has nothing to frost, so we keep the
         * opacity very low and let the border edge do the work.
         */
        .gmast-ghost {
          position: absolute;
          right: calc(100% - 30px);
          top: 8%;
          width: clamp(130px, 13.5vw, 210px);
          height: clamp(190px, 30vh, 320px);
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.055);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border-radius: 10px;
          transform: rotate(-2.5deg);
          pointer-events: none;
          z-index: 1;
        }

        /* ── MAP GLASS PANEL ─────────────────────────────────────────── */
        .gmast-map-plate {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(18, 18, 18, 0.58);
          backdrop-filter: blur(22px) saturate(130%);
          -webkit-backdrop-filter: blur(22px) saturate(130%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 28px 60px rgba(0, 0, 0, 0.6);
          z-index: 2;
        }

        /* Map panel header bar */
        .gmast-map-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          flex-shrink: 0;
        }

        .gmast-map-label {
          font-family: var(--font-sans);
          font-size: 9px;
          letter-spacing: 0.30em;
          text-transform: uppercase;
          color: rgba(245, 242, 237, 0.50);
          margin: 0;
        }

        .gmast-map-count {
          font-family: var(--font-sans);
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245, 242, 237, 0.32);
          margin: 0;
        }

        /* Map slot fills remaining height */
        .gmast-map-body {
          min-height: 0;
          overflow: hidden;
        }

        /* ── PILLS ───────────────────────────────────────────────────── */
        .gmast-pills {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          right: clamp(24px, 3vw, 48px);
          bottom: clamp(18px, 2.2vw, 32px);
          z-index: 3;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .gmast-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: clamp(7px, 0.8vh, 10px) clamp(12px, 1.2vw, 18px);
          border: 1px solid rgba(245, 242, 237, 0.22);
          border-radius: 2px;
          font-family: var(--font-sans);
          font-size: clamp(8px, 0.65vw, 10px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          background: transparent;
          color: rgba(245, 242, 237, 0.55);
        }

        .gmast-pill:hover {
          color: rgba(245, 242, 237, 0.88);
          border-color: rgba(245, 242, 237, 0.40);
        }

        .gmast-pill[aria-pressed="true"] {
          background: rgba(245, 242, 237, 0.10);
          color: rgba(245, 242, 237, 0.90);
          border-color: rgba(245, 242, 237, 0.30);
        }

        .gmast-pill-count {
          font-size: 8px;
          color: rgba(245, 242, 237, 0.30);
          letter-spacing: 0.15em;
        }

        .gmast-pill[aria-pressed="true"] .gmast-pill-count {
          color: rgba(245, 242, 237, 0.45);
        }

        /* ── MOBILE ≤768px ───────────────────────────────────────────── */
        /*
         * Map is a desktop flourish. On mobile: text-only hero, max 42vh,
         * heading wraps allowed, pills flex-wrap. Map panel hidden entirely
         * and Mapbox never initialises (guard in GalleryMap.tsx).
         */
        @media (max-width: 768px) {
          .gmast-stage {
            height: auto;
            min-height: 0;
            max-height: 42vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: clamp(20px, 5vw, 28px);
            padding-top: 10vh;
            overflow: visible;
            gap: 0;
          }

          .gmast-counter,
          .gmast-heading,
          .gmast-pills {
            position: static;
            transform: none;
            inset: auto;
            width: 100%;
          }

          .gmast-counter {
            font-size: 9px;
            margin-bottom: 6px;
          }

          .gmast-heading {
            font-size: clamp(46px, 12vw, 70px);
            white-space: normal;
            line-height: 0.95;
            margin-bottom: 20px;
          }

          .gmast-panels,
          .gmast-ghost,
          .gmast-map-plate {
            display: none !important;
          }

          .gmast-pills {
            position: static;
            gap: 6px;
          }

          .gmast-pill {
            padding: 7px 11px;
            font-size: 9px;
          }
        }
      `}</style>

      {/*
       * NOTE: The parent <main> in gallery.tsx must NOT have paddingTop.
       * Add a spacer div instead:
       *   <div style={{ height: 'var(--nav-h)' }} aria-hidden="true" />
       * This keeps the section's coordinate space at 0,0 so top:50%
       * on the panels is genuinely viewport-centered.
       */}
      <section aria-labelledby="gallery-heading">
        <div className="gmast-stage">

          {/* Counter — above heading, lower-left */}
          <p className="gmast-counter">
            {visibleCount.toString().padStart(2, "0")}{" "}
            {visibleCount === 1 ? "Environment" : "Environments"}
          </p>

          {/* Heading — one line, z:1, bleeds right into panel */}
          <h1 id="gallery-heading" className="gmast-heading">
            The Gallery
          </h1>

          {/* Panels group — z:2, floats center-right */}
          <div className="gmast-panels" aria-hidden="false">

            {/* Ghost panel — decorative depth, z:1, peeks 30px left of map */}
            <div className="gmast-ghost" aria-hidden="true" />

            {/* Map glass plate — z:2, fills panels container */}
            <div className="gmast-map-plate">
              <div className="gmast-map-header">
                <p className="gmast-map-label">Where We've Built</p>
                <p className="gmast-map-count">
                  {visibleCount.toString().padStart(2, "0")} Locations
                </p>
              </div>
              <div className="gmast-map-body">
                {mapSlot}
              </div>
            </div>

          </div>

          {/* Pills — z:3, bottom-anchored */}
          <div className="gmast-pills" role="group" aria-label="Filter by category">
            {FILTERS.map((f) => {
              const isActive = active === f;
              const count = counts[f] ?? 0;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange(f)}
                  aria-pressed={isActive}
                  className="gmast-pill"
                >
                  <span>{f === "All" ? "ALL" : f.toUpperCase()}</span>
                  <span className="gmast-pill-count">
                    {count.toString().padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </section>
    </>
  );
}
