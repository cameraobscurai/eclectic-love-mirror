import { useEffect, useRef, type ReactNode } from "react";
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

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const stage = el.closest(".gallery-hero-stage") as HTMLElement | null;
    if (!stage) return;

    const update = () => {
      const headingRect = el.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const center = headingRect.top - stageRect.top + headingRect.height / 2;
      stage.style.setProperty("--heading-center", center + "px");
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(stage);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

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

        /* Counter — sits directly above the heading, bottom-left. */
        .gallery-hero-counter {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          /* Sits above heading: pills bottom + pills space + heading height + gap. */
          bottom: calc(
            clamp(20px, 2.5vw, 36px) +
            clamp(48px, 6vh, 72px) +
            clamp(72px, 9.2vw, 148px) +
            14px
          );
          margin: 0;
          z-index: 3;
        }

        /* Heading — anchored bottom-left, directly above the pills with equal
           margin to the left edge. Pills sit at bottom: clamp(20px, 2.5vw, 36px),
           so heading bottom = that + a small breathing gap above the pills. */
        .gallery-hero-heading {
          position: absolute;
          left: clamp(24px, 3vw, 44px);
          bottom: calc(clamp(20px, 2.5vw, 36px) + clamp(48px, 6vh, 72px));
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          text-transform: uppercase;
          color: var(--cream);
          line-height: 1;
          letter-spacing: -0.01em;
          font-size: clamp(72px, 9.2vw, 148px);
          white-space: nowrap;
          z-index: 3;
        }

        /* Panels group — pinned to the TOP, right-aligned, sitting just under
           the nav bar with the same margin as the left-edge content. Enlarged
           so its bottom edge overlaps the top of "THE GALLERY" heading. */
        .gallery-hero-panels {
          position: absolute;
          right: clamp(24px, 3vw, 44px);
          top: clamp(16px, 2vw, 28px);
          width: clamp(460px, 52vw, 820px);
          height: clamp(360px, 52vh, 560px);
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
           the map's left edge — only that 30px sliver peeks out. Lifted
           opacity so it actually reads against the charcoal field. */
        .gallery-glass-ghost {
          position: absolute;
          right: calc(100% - 30px);
          top: 10%;
          width: clamp(140px, 14vw, 210px);
          height: clamp(200px, 32vh, 340px);
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.042);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          transform: rotate(-2.5deg);
          pointer-events: none;
          z-index: 1;
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
          {/* Counter */}
          <p className="gallery-hero-counter text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-cream/45 tabular-nums m-0">
            {visibleCount.toString().padStart(2, "0")}{" "}
            {visibleCount === 1 ? "Environment" : "Environments"}
          </p>

          {/* Heading */}
          <h1 ref={headingRef} id="gallery-heading" className="gallery-hero-heading">
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
