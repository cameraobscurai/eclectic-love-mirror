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
          /* min-height (not height) so short viewports don't clip. */
          min-height: clamp(520px, 78vh, 880px);
          padding: clamp(24px, 3vw, 44px);
          padding-bottom: clamp(20px, 2.5vw, 36px);
          overflow: hidden;
        }

        /* Counter — sits directly above the heading, lower-left. */
        .gallery-hero-counter {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          /* Bottom = pills offset + heading height + small gap. */
          bottom: calc(clamp(64px, 8.5vw, 136px) + clamp(72px, 10vh, 140px) + 12px);
          margin: 0;
          z-index: 1;
        }

        /* Heading — lower-left quadrant, one line, bleeds RIGHT toward the
           panels. Sized so the panel's left edge kisses the tail "RY" of
           "GALLERY", not the middle. zIndex: 1 — under the panels. */
        .gallery-hero-heading {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          bottom: clamp(72px, 10vh, 140px);
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          text-transform: uppercase;
          color: var(--cream);
          line-height: 1;
          letter-spacing: -0.01em;
          font-size: clamp(64px, 8.5vw, 136px);
          white-space: nowrap;
          z-index: 1;
        }

        /* Panels group — absolutely anchored to the right, vertically
           centered in the stage. The map plate's left edge lands at roughly
           45-50% of viewport width — exactly where "RY" of "GALLERY" lives. */
        .gallery-hero-panels {
          position: absolute;
          right: clamp(24px, 3vw, 44px);
          top: 50%;
          transform: translateY(-50%);
          width: clamp(420px, 46vw, 720px);
          height: clamp(300px, 40vh, 480px);
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

        /* Map glass panel — fills its parent (the panels group). */
        .gallery-glass-map {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(18,18,18,0.62);
          backdrop-filter: blur(20px) saturate(120%);
          -webkit-backdrop-filter: blur(20px) saturate(120%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            0 24px 56px rgba(0,0,0,0.55);
          overflow: hidden;
          z-index: 2;
        }

        /* Ghost panel — sits BEHIND the map. Right edge offset by 30px from
           the map's left edge — only that 30px sliver peeks out. Slight
           rotation gives it a stacked-cards feel. NEVER crosses left into
           clean letterforms. */
        .gallery-glass-ghost {
          position: absolute;
          right: calc(100% - 30px);
          top: 10%;
          width: clamp(140px, 14vw, 210px);
          height: clamp(200px, 32vh, 340px);
          background: rgba(20,20,20,0.32);
          border: 1px solid rgba(255,255,255,0.04);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          transform: rotate(-2.5deg);
          pointer-events: none;
          z-index: 1;
        }

        /* ----------------------------------------------------------------
           Mobile (≤720px): drop absolute composition entirely. Flex column.
           Order: counter → heading → pills → map. Ghost hidden.
           ---------------------------------------------------------------- */
        @media (max-width: 720px) {
          .gallery-hero-stage {
            min-height: 0;
            display: flex;
            flex-direction: column;
            gap: clamp(20px, 5vw, 32px);
            padding: clamp(20px, 5vw, 32px);
            overflow: visible;
          }
          .gallery-hero-counter,
          .gallery-hero-heading,
          .gallery-hero-panels,
          .gallery-hero-pills {
            position: static;
            transform: none;
            inset: auto;
            width: 100%;
            height: auto;
          }
          .gallery-hero-counter { order: 1; }
          .gallery-hero-heading {
            order: 2;
            font-size: clamp(56px, 14vw, 92px);
            white-space: normal;
            line-height: 0.92;
          }
          .gallery-hero-pills { order: 3; }
          .gallery-hero-panels {
            order: 4;
            height: clamp(240px, 60vw, 340px);
          }
          .gallery-glass-ghost { display: none; }
        }
      `}</style>

      <section aria-labelledby="gallery-heading">
        <div className="gallery-hero-stage">
          {/* Counter */}
          <p className="gallery-hero-counter text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-cream/45 tabular-nums m-0">
            {visibleCount.toString().padStart(2, "0")}{" "}
            {visibleCount === 1 ? "Environment" : "Environments"}
          </p>

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
            <div className="flex flex-wrap gap-2">
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
                      "inline-flex items-center gap-2 px-4 py-2 border transition-colors",
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
