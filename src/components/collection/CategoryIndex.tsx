import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CategoryFacet } from "@/lib/phase3-catalog";

interface CategoryIndexProps {
  facets: CategoryFacet[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  /**
   * compact: used inside the sticky filter header on desktop — single wrap row,
   *   small uppercase labels, charcoal underline on the active one.
   * expanded: used in the overview body as the "Browse by Category" block —
   *   larger typographic rows in a multi-column grid.
   */
  variant: "compact" | "expanded";
}

export function CategoryIndex({
  facets,
  activeSlug,
  onSelect,
  variant,
}: CategoryIndexProps) {
  const reduced = useReducedMotion();

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2 py-3">
        {facets.map((f) => {
          const active = activeSlug === f.slug;
          return (
            <button
              key={f.slug}
              onClick={() => onSelect(f.slug)}
              className={cn(
                "relative whitespace-nowrap text-[11px] uppercase tracking-[0.18em] py-1 transition-colors",
                active
                  ? "text-charcoal"
                  : "text-charcoal/55 hover:text-charcoal",
              )}
            >
              {f.display}{" "}
              <span
                className={cn(
                  "ml-0.5 tabular-nums",
                  active ? "text-charcoal/60" : "text-charcoal/35",
                )}
              >
                ({f.count})
              </span>
              {active && (
                <motion.div
                  layoutId="collection-desktop-nav-active"
                  className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-charcoal"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 35 }
                  }
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // expanded — overview body "Browse by Category"
  return (
    <section aria-labelledby="browse-by-category-heading">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h2
          id="browse-by-category-heading"
          className="text-[11px] uppercase tracking-[0.3em] text-charcoal/60 font-sans"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Browse by Category
        </h2>
        <span className="text-[11px] uppercase tracking-[0.2em] text-charcoal/40">
          {facets.length} categories
        </span>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 border-t border-charcoal/10">
        {facets.map((f) => (
          <li key={f.slug} className="border-b border-charcoal/10">
            <button
              onClick={() => onSelect(f.slug)}
              className="group flex w-full items-center justify-between py-3 text-left transition-colors hover:text-charcoal"
            >
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="text-sm text-charcoal truncate">
                  {f.display}
                </span>
                <span className="text-[11px] tabular-nums text-charcoal/40">
                  {f.count}
                </span>
              </span>
              <span
                aria-hidden
                className="text-charcoal/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-charcoal/70"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
