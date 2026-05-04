import { useRef, type ReactNode } from "react";

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

// Region filter — replaces the old category filter. "All" + the set of
// regions actually present in the gallery data (passed in via `filters`).
export type CategoryFilter = string;

interface GalleryMastheadProps {
  total: number;
  visibleCount: number;
  active: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (next: CategoryFilter) => void;
  /** Ordered filter list, e.g. ["All", "Colorado", "Utah", ...]. */
  filters: CategoryFilter[];
  mapSlot?: ReactNode;
}

export function GalleryMasthead({
  total,
  visibleCount,
  active,
  counts,
  onChange,
  filters,
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

        /* Map glass plate — LIGHT-on-dark glassmorphism. The stage is
           charcoal, so the plates need to read as a luminous frosted
           membrane, not a faint smudge. Brighter base tint, stronger
           inner highlight, lighter border. backdrop-filter only composites
           when the element does NOT clip its own painting context, so
           clipping moves to the body wrapper below. */
        .gallery-glass-map {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: 1fr;
          border: 1px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.10);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 0 0 1px rgba(255,255,255,0.04),
            0 30px 70px rgba(0,0,0,0.55);
          border-radius: 10px;
          z-index: 2;
        }

        /* Map body — actual clipping happens here, so the parent plate keeps
           its working backdrop blur. With the header row removed, the body
           fills the plate so we round all four corners now. */
        .gallery-glass-map-body {
          overflow: hidden;
          border-radius: 10px;
          min-height: 0;
        }

        /* Ghost panel — its own free-floating frosted glass plate, anchored
           to the STAGE (not the map). LIGHT-on-dark, more luminous than the
           map plate so the heading reads as if it's passing through a
           halo of frost. */
        .gallery-glass-ghost {
          position: absolute;
          left: clamp(160px, 21.5vw, 380px);
          top: clamp(92px, 12.5vh, 160px);
          width: clamp(440px, 45vw, 760px);
          height: clamp(430px, 64vh, 720px);
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(36px) saturate(150%);
          -webkit-backdrop-filter: blur(36px) saturate(150%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.20),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            0 40px 90px rgba(0, 0, 0, 0.5);
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

        /* ----------------------------------------------------------------
           Cohesion mode — hide the desktop map + ghost flourishes and
           let the heading sit on the same vertical rhythm as the other
           pages (Atelier, Collection). Heading translate is neutralized
           since it was originally tuned to thread through the ghost.
           ---------------------------------------------------------------- */
        .gallery-hero-stage.hide-flourishes .gallery-hero-panels,
        .gallery-hero-stage.hide-flourishes .gallery-glass-map,
        .gallery-hero-stage.hide-flourishes .gallery-glass-ghost {
          display: none !important;
        }
        .gallery-hero-stage.hide-flourishes {
          height: auto;
          min-height: 0;
          padding-top: calc(clamp(64px, 7vw, 112px));
          padding-bottom: clamp(48px, 5vw, 80px);
          overflow: visible;
        }
        .gallery-hero-stage.hide-flourishes .gallery-hero-heading {
          position: static;
          transform: none;
          width: auto;
          max-width: 100%;
          white-space: normal;
        }
        .gallery-hero-stage.hide-flourishes .gallery-hero-pills {
          position: static;
          margin-top: clamp(32px, 4vw, 56px);
          inset: auto;
        }
      `}</style>

      {/* Map + ghost panel temporarily hidden for site-wide cohesion pass.
          Re-enable by removing the `hide-flourishes` modifier. */}
      <section aria-labelledby="gallery-heading">
        <div className="gallery-hero-stage hide-flourishes">
          {/* Counter intentionally removed — the pills already carry the
              "n Environments" count, the second label was redundant. */}


          {/* Heading */}
          <h1
            ref={headingRef}
            id="gallery-heading"
            data-devedit-lock="size"
            data-devedit-label="Heading (size locked — clamp font)"
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

          {/* Panels area — the map only. Header row removed; the map
              speaks for itself inside the frosted plate. */}
          <div
            id="gallery-panels"
            data-devedit
            data-devedit-label="Map panel"
            className="gallery-hero-panels"
          >
            <div className="gallery-glass-map">
              <div className="gallery-glass-map-body min-h-0 p-3 sm:p-4">
                {mapSlot}
              </div>
            </div>
          </div>

          {/* Pills */}
          <div className="gallery-hero-pills">
            <div className="gallery-pill-row flex flex-wrap gap-2">
              {filters.map((f) => {
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
