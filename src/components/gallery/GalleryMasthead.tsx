import { useRef, type ReactNode } from "react";
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
  const headingRef = useRef<HTMLHeadingElement>(null);

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
          height: calc(100svh - var(--nav-h));
          min-height: 560px;
          padding: clamp(24px, 3vw, 44px);
          padding-bottom: clamp(20px, 2.5vw, 36px);
          overflow: hidden;
        }

        /* Counter — manually placed via dev-edit. Anchored top-left of the
           stage, then translated into final position. */
        .gallery-hero-counter {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          top: calc(clamp(20px, 2.5vw, 36px) + 243px);
          transform: translateX(-43px);
          width: 151px;
          margin: 0;
          z-index: 5;
        }

        /* Heading — manually placed via dev-edit. Anchored bottom-left, then
           translated up so it sits centered through the ghost panel. */
        .gallery-hero-heading {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          bottom: clamp(20px, 2.5vw, 36px);
          transform: translate(-12px, -93px);
          width: 836px;
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          text-transform: uppercase;
          color: var(--cream);
          line-height: 1;
          letter-spacing: -0.01em;
          font-size: clamp(72px, 9.5vw, 152px);
          white-space: nowrap;
          z-index: 5;
        }

        /* Panels group — fixed offset under the nav. NOT anchored to the
           heading. Smaller, realistic map size — top-right corner only. */
        .gallery-hero-panels {
          position: absolute;
          right: clamp(24px, 3vw, 44px);
          top: clamp(20px, 3vh, 36px);
          width: clamp(340px, 34vw, 520px);
          height: clamp(300px, 46vh, 460px);
          z-index: 4;
        }

        /* Pills — bottom-anchored, full-width, left-aligned. */
        .gallery-hero-pills {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          right: clamp(24px, 3vw, 44px);
          bottom: clamp(20px, 2.5vw, 36px);
          z-index: 1;
        }

        /* Map glass plate — backdrop-filter only composites when the element
           does NOT clip its own painting context. overflow: hidden here kills
           the blur in some engines, so we move clipping to the body wrapper
           below and let the plate stay un-clipped. */
        .gallery-glass-map {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(18,18,18,0.48);
          backdrop-filter: blur(20px) saturate(130%);
          -webkit-backdrop-filter: blur(20px) saturate(130%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            0 24px 56px rgba(0,0,0,0.55);
          z-index: 2;
        }

        /* Map body — actual clipping happens here, so the parent plate keeps
           its working backdrop blur. */
        .gallery-glass-map-body {
          overflow: hidden;
          border-radius: 0 0 10px 10px;
          min-height: 0;
        }

        /* Ghost panel — its own free-floating frosted glass plate, anchored
           to the STAGE (not the map). Sits roughly center-stage, slightly
           left of the map, larger and softer. This is the plate that
           creates the soft frosted smear behind "THE GALLERY" in the
           reference. The map sits on top of its right edge. */
        .gallery-glass-ghost {
          position: absolute;
          /* Center-ish horizontally, biased slightly right so the map
             overlaps its right side and the heading passes through its
             middle. */
          left: clamp(160px, 21.5vw, 380px);
          top: clamp(92px, 12.5vh, 160px);
          width: clamp(440px, 45vw, 760px);
          height: clamp(430px, 64vh, 720px);
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(28px) saturate(120%);
          -webkit-backdrop-filter: blur(28px) saturate(120%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 30px 80px rgba(0, 0, 0, 0.45);
          transform: rotate(-1.5deg);
          pointer-events: none;
          z-index: 3;
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
          .gallery-glass-ghost {
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
          {/* Counter intentionally removed — the pills already carry the
              "n Environments" count, the second label was redundant. */}


          {/* Heading */}
          <h1
            ref={headingRef}
            id="gallery-heading"
            data-devedit
            data-devedit-label="Heading"
            className="gallery-hero-heading"
          >
            The Gallery
          </h1>

          {/* Ghost glass plate — page-anchored, sits between the heading
              and the map. Pure decoration, hence aria-hidden. */}
          <div
            id="gallery-ghost"
            data-devedit
            data-devedit-label="Ghost panel"
            className="gallery-glass-ghost"
            aria-hidden="true"
          />

          {/* Panels area — the map only */}
          <div
            id="gallery-panels"
            data-devedit
            data-devedit-label="Map panel"
            className="gallery-hero-panels"
          >
            <div className="gallery-glass-map">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-cream/55 m-0">
                  Where We've Built
                </p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cream/45 tabular-nums m-0">
                  {visibleCount.toString().padStart(2, "0")} Locations
                </p>
              </div>
              <div className="gallery-glass-map-body min-h-0 px-3 sm:px-4 pb-3 sm:pb-4">
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
