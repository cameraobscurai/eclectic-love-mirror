import type { GalleryCategory } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead
//
// Issue header: eyebrow, live "{n} Environments" headline, lead paragraph,
// and the category filter pills with live counts. Honors the v0 layout.
// ---------------------------------------------------------------------------

export type CategoryFilter = "All" | GalleryCategory;

interface GalleryMastheadProps {
  total: number;
  visibleCount: number;
  active: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (next: CategoryFilter) => void;
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
}: GalleryMastheadProps) {
  return (
    <section
      className="px-6 lg:px-12"
      style={{
        paddingTop: "clamp(96px, 9vw, 144px)",
        paddingBottom: "clamp(40px, 4vw, 64px)",
      }}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
              THE GALLERY
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1] tracking-[-0.01em]">
              {visibleCount} {visibleCount === 1 ? "Environment" : "Environments"}
            </h1>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[15px] leading-relaxed text-cream/70 max-w-md lg:ml-auto">
              Each project represents a complete expression of design intelligence,
              fabrication capability, and production expertise.
            </p>
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
