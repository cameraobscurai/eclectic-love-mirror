import type { ReactNode } from "react";
import type { GalleryCategory } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead
//
// Reactive CSS Grid composition. Every position / size value uses clamp(),
// vw, % or grid placement — never a hardcoded px offset (except 1px borders).
//
// Desktop grid (≥640px):
//   ┌──────────────────────────────────────────┐
//   │ counter (.) (.) (.) │ . │ . │ . │ . │   │
//   │ heading heading heading heading panels  │
//   │ heading heading heading heading panels  │
//   │ pills   pills   pills   pills   pills   │
//   └──────────────────────────────────────────┘
//
// Mobile (<640px): single column — counter, panels, heading, pills.
// ---------------------------------------------------------------------------

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
      {/* Scoped styles — keep grid and responsive logic with the component. */}
      <style>{`
        /* ----------------------------------------------------------------
           Masthead = full-viewport-ish dark stage. Heading anchors lower-
           left, panels float vertically centered on the right edge, ghost
           panel hides behind the map (only ~30px peeks out the left side).

           Absolute positioning — NOT grid — because the composition is
           intentionally layered, not gridded. The only overlap allowed:
           the panel's left edge kisses the tail "RY" of "GALLERY".
           ---------------------------------------------------------------- */
        .gallery-hero-stage {
          position: relative;
          width: 100%;
          /* Lock the stage to exactly one viewport (minus nav). Using
             min-height let the section grow taller than the viewport,
             which pushed everything down and created the void up top. */
          height: calc(100svh - var(--nav-h));
          min-height: 560px;
          padding: clamp(24px, 3vw, 44px);
          padding-bottom: clamp(20px, 2.5vw, 36px);
          overflow: hidden;
        }

        /* Counter — sits below the anchored heading and above the pills. */
        .gallery-hero-counter {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          bottom: calc(clamp(20px, 2.5vw, 36px) + clamp(42px, 6vh, 68px));
          margin: 0;
          z-index: 1;
        }

        /* Heading — bottom anchored above the pills, full bleed allowed.
           Panels overlap the right edge so "RY" sits behind the glass. */
        .gallery-hero-heading {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          bottom: clamp(118px, 15vh, 168px);
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          text-transform: uppercase;
          color: var(--cream);
          line-height: 1;
          letter-spacing: -0.01em;
          font-size: clamp(72px, 9.2vw, 148px);
          white-space: nowrap;
          z-index: 1;
        }

        /* Panels group — vertically centered on the heading so the map
           overlaps the top half of "THE GALLERY" and "RY" passes behind. */
        .gallery-hero-panels {
          position: absolute;
          right: clamp(24px, 3vw, 44px);
          /* Heading center ≈ pills_bottom + heading_bottom_offset + heading_height/2.
             Position panel center on that line. */
          bottom: calc(clamp(118px, 15vh, 168px) + clamp(72px, 9.2vw, 148px) / 2 - clamp(95px, 13.5vh, 140px));
          width: clamp(420px, 46vw, 720px);
          height: clamp(190px, 27vh, 280px);
          z-index: 2;
        }

        /* Pills — bottom-anchored, full-width, left-aligned. */
        .gallery-hero-pills {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          right: clamp(24px, 3vw, 44px);
          bottom: clamp(20px, 2.5vw, 36px);
          z-index: 1;
        }

        /* Map glass panel — light, frosty, cream-tinted (not dark on dark). */
        .gallery-glass-map {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr;
          border: 1px solid rgba(245,242,237,0.18);
          background: rgba(245,242,237,0.06);
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 24px 56px rgba(0,0,0,0.45);
          overflow: hidden;
          z-index: 2;
        }

        /* Ghost panel — light frosted sliver peeking from behind the map. */
        .gallery-glass-ghost {
          position: absolute;
          right: calc(100% - 30px);
          top: 8%;
          width: clamp(140px, 14vw, 210px);
          height: clamp(140px, 22vh, 220px);
          background: rgba(245,242,237,0.04);
          border: 1px solid rgba(245,242,237,0.10);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          transform: rotate(-2.5deg);
          pointer-events: none;
          z-index: 1;
        }

        /* Wide frosted band sitting BEHIND the heading — sandwich layer. */
        .gallery-hero-haze {
          position: absolute;
          left: 0;
          right: 0;
          bottom: clamp(96px, 13vh, 148px);
          height: clamp(180px, 22vh, 260px);
          background: linear-gradient(
            180deg,
            rgba(245,242,237,0) 0%,
            rgba(245,242,237,0.045) 45%,
            rgba(245,242,237,0.02) 100%
          );
          backdrop-filter: blur(18px) saturate(120%);
          -webkit-backdrop-filter: blur(18px) saturate(120%);
          border-top: 1px solid rgba(245,242,237,0.06);
          border-bottom: 1px solid rgba(245,242,237,0.04);
          pointer-events: none;
          z-index: 0;
        }

        /* ----------------------------------------------------------------
           Mobile (≤768px): map is a desktop flourish — hide it entirely so
           the hero is just counter + heading + pills. The project grid
           below is what matters on mobile. Mapbox JS is also guarded at
           runtime (see GalleryMap mobile guard) so it never even loads.
           ---------------------------------------------------------------- */
        @media (max-width: 768px) {
          .gallery-hero-stage {
            min-height: 0;
            max-height: 45vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            gap: clamp(14px, 4vw, 22px);
            padding: clamp(20px, 5vw, 28px);
            padding-top: 12vh;
            overflow: visible;
          }
          .gallery-hero-counter,
          .gallery-hero-heading,
          .gallery-hero-pills {
            position: static;
            transform: none;
            inset: auto;
            width: 100%;
            height: auto;
          }
          .gallery-hero-counter {
            order: 1;
            font-size: 9px;
            letter-spacing: 0.28em;
          }
          .gallery-hero-heading {
            order: 2;
            font-size: clamp(48px, 12vw, 72px);
            white-space: normal;
            line-height: 0.95;
            padding-bottom: 4px;
          }
          .gallery-hero-pills { order: 3; }
          /* Map is a desktop-only conceit. Hide both panels and ghost. */
          .gallery-hero-panels,
          .gallery-glass-map,
          .gallery-glass-ghost,
          .gallery-hero-haze {
            display: none !important;
          }
          /* Tighten pills so 4 filters wrap to 2 lines max, never stack
             vertically. Smaller padding + smaller text + smaller gap. */
          .gallery-hero-pills .gallery-pill {
            padding: 7px 12px !important;
            font-size: 9px !important;
            letter-spacing: 0.2em !important;
          }
          .gallery-hero-pills .gallery-pill-row {
            gap: 6px !important;
          }
        }
      `}</style>

      <section aria-labelledby="gallery-heading">
        <div className="gallery-hero-stage">
          {/* Frosted haze band behind the heading */}
          <div className="gallery-hero-haze" aria-hidden="true" />

          {/* Heading */}
          <h1 id="gallery-heading" className="gallery-hero-heading">
            The Gallery
          </h1>

          {/* Panels area */}
          <div className="gallery-hero-panels">
            <div className="gallery-glass-ghost" aria-hidden="true" />
            <div className="gallery-glass-map">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-cream/55 m-0">
                  Where We've Built
                </p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cream/45 tabular-nums m-0">
                  {visibleCount.toString().padStart(2, "0")} Locations
                </p>
              </div>
              <div className="min-h-0 px-3 sm:px-4 pb-3 sm:pb-4">
                {mapSlot}
              </div>
            </div>
          </div>

          {/* Pills */}
          <div className="gallery-hero-pills">
            <div className="gallery-pill-row flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const isActive = active === f;
                const count = counts[f] ?? 0;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChange(f)}
                    aria-pressed={isActive}
                    className={[
                      "gallery-pill inline-flex items-center gap-2 px-4 py-2 border transition-colors",
                      "text-[10px] uppercase tracking-[0.22em]",
                      "focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal",
                      isActive
                        ? "bg-cream text-charcoal border-cream"
                        : "bg-transparent text-cream/70 border-cream/20 hover:text-cream hover:border-cream/40",
                    ].join(" ")}
                  >
                    <span>{f === "All" ? "ALL" : f.toUpperCase()}</span>
                    <span
                      className={
                        isActive
                          ? "text-charcoal/55 tabular-nums"
                          : "text-cream/40 tabular-nums"
                      }
                    >
                      {count.toString().padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
            {active !== "All" && (
              <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-cream/40">
                Showing {visibleCount} of {total}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
