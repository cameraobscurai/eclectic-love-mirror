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
  total, visibleCount, active, counts, onChange, mapSlot,
}: GalleryMastheadProps) {
  return (
    <>
      <style>{`
        .gmast-stage {
          position: relative;
          width: 100%;
          height: calc(100vh - var(--nav-h));
          background: #0d0d0d;
          overflow: hidden;
        }

        /* COUNTER — bottom left, just above heading */
        .gmast-counter {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          bottom: calc(clamp(48px, 6vh, 80px) + clamp(72px, 9vw, 140px) + 10px);
          margin: 0;
          font-family: var(--font-sans);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245,242,237,0.42);
          z-index: 1;
          white-space: nowrap;
        }

        /* HEADING — bottom left, one line, bleeds right */
        .gmast-heading {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          bottom: clamp(48px, 6vh, 80px);
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(72px, 9vw, 140px);
          letter-spacing: -0.015em;
          line-height: 1;
          color: rgba(245,242,237,0.94);
          white-space: nowrap;
          text-transform: uppercase;
          z-index: 1;
        }

        /* PANELS — independently centered at 38% from top */
        /* NOT anchored to heading — floats in upper-center-right */
        .gmast-panels {
          position: absolute;
          right: clamp(24px, 3vw, 48px);
          top: 38%;
          transform: translateY(-50%);
          width: clamp(400px, 44vw, 700px);
          height: clamp(290px, 38vh, 460px);
          z-index: 2;
        }

        /* GHOST — peeks 30px left of map panel */
        .gmast-ghost {
          position: absolute;
          right: calc(100% - 30px);
          top: 8%;
          width: clamp(130px, 13vw, 200px);
          height: clamp(190px, 30vh, 320px);
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.055);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border-radius: 10px;
          transform: rotate(-2.5deg);
          pointer-events: none;
          z-index: 1;
        }

        /* MAP GLASS PLATE */
        .gmast-map-plate {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr;
          border-radius: 10px;
          background: rgba(18,18,18,0.58);
          backdrop-filter: blur(22px) saturate(130%);
          -webkit-backdrop-filter: blur(22px) saturate(130%);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 28px 60px rgba(0,0,0,0.6);
          z-index: 2;
          overflow: hidden;
        }

        .gmast-map-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .gmast-map-label {
          font-family: var(--font-sans);
          font-size: 9px;
          letter-spacing: 0.30em;
          text-transform: uppercase;
          color: rgba(245,242,237,0.50);
          margin: 0;
        }

        .gmast-map-count {
          font-family: var(--font-sans);
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245,242,237,0.32);
          margin: 0;
        }

        .gmast-map-body {
          min-height: 0;
          overflow: hidden;
        }

        /* PILLS — bottom full width */
        .gmast-pills {
          position: absolute;
          left: clamp(24px, 3vw, 48px);
          right: clamp(24px, 3vw, 48px);
          bottom: clamp(16px, 2vw, 28px);
          z-index: 3;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .gmast-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px clamp(12px, 1.2vw, 18px);
          border: 1px solid rgba(245,242,237,0.22);
          border-radius: 2px;
          font-family: var(--font-sans);
          font-size: clamp(8px, 0.65vw, 10px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          background: transparent;
          color: rgba(245,242,237,0.55);
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .gmast-pill:hover {
          color: rgba(245,242,237,0.88);
          border-color: rgba(245,242,237,0.40);
        }

        .gmast-pill[aria-pressed="true"] {
          background: rgba(245,242,237,0.10);
          color: rgba(245,242,237,0.92);
          border-color: rgba(245,242,237,0.35);
        }

        .gmast-pill-count {
          font-size: 8px;
          color: rgba(245,242,237,0.30);
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .gmast-stage {
            height: auto;
            min-height: 0;
            max-height: 44vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: clamp(20px, 5vw, 28px);
            padding-top: 8vh;
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
          .gmast-counter { margin-bottom: 6px; }
          .gmast-heading {
            font-size: clamp(44px, 11vw, 68px);
            white-space: normal;
            line-height: 0.95;
            margin-bottom: 18px;
          }
          .gmast-panels,
          .gmast-ghost,
          .gmast-map-plate { display: none !important; }
          .gmast-pills { position: static; gap: 6px; }
          .gmast-pill { padding: 7px 11px; font-size: 9px; }
        }
      `}</style>

      <section aria-labelledby="gallery-heading">
        <div className="gmast-stage">
          <p className="gmast-counter">
            {visibleCount.toString().padStart(2, "0")}{" "}
            {visibleCount === 1 ? "Environment" : "Environments"}
          </p>

          <h1 id="gallery-heading" className="gmast-heading">
            The Gallery
          </h1>

          <div className="gmast-panels">
            <div className="gmast-ghost" aria-hidden="true" />
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

          <div className="gmast-pills" role="group" aria-label="Filter projects by category">
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
            {active !== "All" && (
              <span className="gmast-pill-count" style={{ alignSelf: "center", marginLeft: 6 }}>
                Showing {visibleCount} of {total}
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
