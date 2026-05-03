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
        .gallery-hero-grid {
          display: grid;
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding-inline: clamp(16px, 4vw, 48px);
          /* Generous breathing room above; nav-h is already applied by <main>. */
          padding-top: clamp(24px, 4vh, 56px);
          padding-bottom: clamp(32px, 4vh, 56px);
          column-gap: clamp(16px, 3vw, 48px);
          row-gap: clamp(16px, 2.5vw, 32px);
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          /* counter row absorbs free vertical space, pushing heading to the
             lower-left and letting the panels float in the middle. */
          grid-template-rows: 1fr auto auto;
          grid-template-areas:
            "counter panels"
            "heading panels"
            "pills   pills";
          /* Vertically center the panels inside the panels row group. */
          align-items: center;
          /* Reactive minimum height — drives the "panels float in the middle" feel. */
          min-height: clamp(420px, 62vh, 720px);
        }
        .gallery-hero-counter {
          grid-area: counter;
          align-self: end; /* sits just above the heading */
        }
        .gallery-hero-heading {
          grid-area: heading;
          font-family: var(--font-display);
          text-transform: uppercase;
          color: var(--cream);
          font-weight: 400;
          line-height: 0.92;
          letter-spacing: -0.01em;
          /* One line, lower-left quadrant, intentionally bleeds right under the panels. */
          font-size: clamp(44px, 5.8vw, 92px);
          white-space: nowrap;
          margin: 0;
          align-self: end;
          padding-block: 0.02em;
        }
        .gallery-hero-panels {
          grid-area: panels;
          /* Span both the counter and heading rows so the panels float
             vertically centered across the full upper content height. */
          grid-row: 1 / 3;
          position: relative;
          align-self: center;
          justify-self: end;
          width: 100%;
          height: clamp(240px, 34vh, 380px);
          z-index: 2;
        }
        .gallery-hero-pills { grid-area: pills; }

        /* Map glass panel — fills its grid cell, no absolute children. */
        .gallery-glass-map {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr;
          border: 1px solid color-mix(in oklab, var(--cream) 15%, transparent);
          background: linear-gradient(
            135deg,
            color-mix(in oklab, var(--cream) 10%, transparent) 0%,
            color-mix(in oklab, var(--cream) 4%, transparent) 100%
          );
          backdrop-filter: blur(20px) saturate(120%);
          -webkit-backdrop-filter: blur(20px) saturate(120%);
          box-shadow:
            inset 0 1px 0 color-mix(in oklab, var(--cream) 12%, transparent),
            0 clamp(20px, 4vw, 60px) clamp(40px, 8vw, 100px) -20px rgba(0,0,0,0.6);
          overflow: hidden;
          z-index: 2;
        }

        /* Ghost panel — flat matte, no metallic gradient, no shadow. */
        .gallery-glass-ghost {
          position: absolute;
          left: clamp(-18%, -8vw, -6%);
          top: clamp(8%, 2vw, 14%);
          width: 62%;
          height: 78%;
          pointer-events: none;
          background: rgba(22,22,22,0.40);
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1;
        }

        @media (max-width: 640px) {
          .gallery-hero-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto auto;
            grid-template-areas:
              "counter"
              "panels"
              "heading"
              "pills";
            align-items: stretch;
            min-height: 0;
          }
          .gallery-hero-heading {
            font-size: clamp(44px, 11vw, 72px);
            white-space: normal;
          }
          .gallery-hero-panels {
            grid-row: auto;
            justify-self: stretch;
            height: clamp(200px, 56vw, 320px);
          }
          .gallery-glass-ghost {
            left: -6%;
            width: 50%;
          }
        }
      `}</style>

      <section aria-labelledby="gallery-heading">
        <div className="gallery-hero-grid">
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
