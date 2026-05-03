import type { ReactNode } from "react";
import type { GalleryCategory } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead
//
// Issue header: eyebrow, live "{n} Environments" headline, lead paragraph,
// and the category filter pills with live counts. Honors the v0 layout.
// Optional `mapSlot` renders into the right column in place of the lead
// paragraph — used to hoist the interactive map above the fold.
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
        paddingTop: "clamp(72px, 6vw, 104px)",
        paddingBottom: "clamp(24px, 3vw, 40px)",
      }}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="lg:col-span-6">
            <h1 className="font-display uppercase leading-[0.92] tracking-[-0.005em] text-cream text-[clamp(60px,8vw,120px)] font-normal">
              The Gallery
            </h1>
            <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-cream/45 tabular-nums">
              {visibleCount.toString().padStart(2, "0")} {visibleCount === 1 ? "Environment" : "Environments"}
            </p>
          </div>
          <div className="lg:col-span-6">
            {mapSlot}
          </div>
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

        {/* Total — quiet, right-aligned, only when filter is active */}
        {active !== "All" && (
          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-cream/40">
            Showing {visibleCount} of {total}
          </p>
        )}
      </div>
    </section>
  );
}
