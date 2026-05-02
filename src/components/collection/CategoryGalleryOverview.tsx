import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryGalleryOverviewProps {
  /**
   * Browse-group buckets in display order. Empty groups MUST be omitted by
   * the caller — every entry is rendered as a real, populated card.
   */
  groups: Array<{
    id: BrowseGroupId;
    products: CollectionProduct[];
  }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

/**
 * Single-fold category landing for /collection.
 *
 * The whole gallery sits inside the viewport — no scrolling required to see
 * the full taxonomy. CSS Grid does the heavy lifting:
 *   - The wrapper is sized by the route to the available viewport height.
 *   - The <ul> uses `grid-template-rows: repeat(N, minmax(0,1fr))` so all
 *     rows divide the available height equally.
 *   - Each card is a single image cell with a thin label strip at the
 *     bottom — no aspect-ratio lock fighting the row height.
 *
 * Layouts (for 18 categories):
 *   - mobile (<sm):  2 cols × 9 rows  — scrolls vertically (intentional;
 *                    one fold on a phone can't show 18 hero images legibly)
 *   - sm/md:         3 cols × 6 rows
 *   - lg+:           6 cols × 3 rows  — landscape, fully in fold
 */
export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <ul
      className="
        grid h-full w-full
        grid-cols-2 grid-rows-9
        sm:grid-cols-3 sm:grid-rows-6
        lg:grid-cols-6 lg:grid-rows-3
        gap-px bg-[color:var(--archive-rule)]
      "
    >
      {groups.map((group, idx) => {
        const hero = group.products.find((p) => p.primaryImage)?.primaryImage;
        const label = BROWSE_GROUP_LABELS[group.id];
        // Stagger capped — never more than ~360ms even with 18 cards.
        const delay = reduced ? 0 : Math.min(idx * 0.03, 0.36);

        return (
          <motion.li
            key={group.id}
            className="relative min-h-0 min-w-0 bg-white"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reduced ? 0 : 0.5,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <button
              type="button"
              onClick={() => onSelectCategory(group.id)}
              className="group relative block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-inset"
              aria-label={`${label} — ${group.products.length} pieces`}
            >
              {/* Hero image fills the entire cell */}
              {hero ? (
                <img
                  src={withCdnWidth(hero.url, 700)}
                  alt={hero.altText ?? label}
                  loading={idx < 6 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.04]"
                />
              ) : (
                <div className="absolute inset-0 bg-cream" />
              )}

              {/* Bottom gradient + label strip — readable on any image. */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none bg-gradient-to-t from-charcoal/75 via-charcoal/15 to-transparent"
              />

              <div className="absolute inset-x-0 bottom-0 px-3 py-3 lg:px-4 lg:py-4 flex items-baseline justify-between gap-2 text-white">
                <h3
                  className="font-display leading-none tracking-tight uppercase truncate"
                  style={{
                    fontSize: "clamp(0.85rem, 1.2vw, 1.25rem)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </h3>
                <span
                  className="text-[10px] uppercase tracking-[0.18em] tabular-nums text-white/70 flex-shrink-0"
                >
                  {group.products.length}
                </span>
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
