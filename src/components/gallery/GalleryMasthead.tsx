import type { ReactNode } from "react";
import type { GalleryCategory } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead
//
// Layered composition (per owner concept):
//   • Base layer: oversized "THE GALLERY" headline + "{n} Environments" tag
//   • Overlay layer: two glassmorphic panels floating ON TOP of the headline,
//     overlapping the type. Left panel is a soft blurred plate (atmospheric).
//     Right panel hosts the live map. Both extend above the headline's top.
//   • Below: category filter pills.
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
    <section
      className="px-6 lg:px-12"
      style={{
        paddingTop: "clamp(56px, 5vw, 88px)",
        paddingBottom: "clamp(24px, 3vw, 40px)",
      }}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Layered composition wrapper */}
        <div className="relative">
          {/* BASE: oversized headline */}
          <div className="relative z-0">
            <h1 className="font-display uppercase leading-[0.9] tracking-[-0.01em] text-cream text-[clamp(80px,14vw,240px)] font-normal whitespace-nowrap">
              The Gallery
            </h1>
          </div>

          {/* OVERLAY: glassmorphic panels, absolutely positioned on top.
              They start ABOVE the headline and overlap downward through it. */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10"
            style={{
              top: "clamp(-90px, -7vw, -60px)",
              bottom: "clamp(-30px, -2vw, -10px)",
            }}
          >
            <div className="relative h-full w-full">
              {/* Left soft glass panel — atmospheric blur, no content */}
              <div
                aria-hidden="true"
                className="absolute hidden md:block"
                style={{
                  left: "18%",
                  right: "38%",
                  top: "0",
                  bottom: "20%",
                }}
              >
                <div
                  className="h-full w-full border border-cream/10"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,242,237,0.10) 0%, rgba(245,242,237,0.04) 60%, rgba(245,242,237,0.02) 100%)",
                    backdropFilter: "blur(28px) saturate(115%)",
                    WebkitBackdropFilter: "blur(28px) saturate(115%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(245,242,237,0.10), 0 30px 80px -20px rgba(0,0,0,0.55)",
                  }}
                />
              </div>

              {/* Right glass panel — hosts the map. Pointer events back on. */}
              <div
                className="pointer-events-auto absolute"
                style={{
                  right: "0",
                  left: "auto",
                  width: "min(56%, 760px)",
                  top: "clamp(8px, 1vw, 24px)",
                  bottom: "8%",
                }}
              >
                <div
                  className="relative h-full w-full overflow-hidden border border-cream/15"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,242,237,0.10) 0%, rgba(245,242,237,0.04) 100%)",
                    backdropFilter: "blur(20px) saturate(120%)",
                    WebkitBackdropFilter: "blur(20px) saturate(120%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(245,242,237,0.12), 0 40px 100px -20px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Header row inside glass */}
                  <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cream/55">
                      Where We've Built
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-cream/45 tabular-nums">
                      {visibleCount.toString().padStart(2, "0")} Locations
                    </p>
                  </div>
                  {/* Map slot — fills the rest. We pass the map in and let
                      it size to the container. */}
                  <div className="absolute inset-x-0 bottom-0 top-[44px]">
                    {mapSlot ? (
                      <div className="h-full w-full [&_.eh-map]:!h-full [&_.eh-map]:border-0 [&>div>div:first-child]:hidden">
                        {mapSlot}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environments count — sits below the headline, base layer */}
          <p className="relative z-0 mt-6 text-[11px] uppercase tracking-[0.28em] text-cream/45 tabular-nums">
            {visibleCount.toString().padStart(2, "0")}{" "}
            {visibleCount === 1 ? "Environment" : "Environments"}
          </p>
        </div>

        {/* Filter pills */}
        <div className="mt-10 flex flex-wrap gap-2">
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

        {/* Total — quiet, only when filter is active */}
        {active !== "All" && (
          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-cream/40">
            Showing {visibleCount} of {total}
          </p>
        )}
      </div>
    </section>
  );
}
