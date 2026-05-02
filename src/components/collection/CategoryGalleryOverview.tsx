import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  BROWSE_GROUP_TIER,
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
 * Editorial category landing for /collection. Replaces the All Inventory
 * grid so the user never has to wait for 876 tiles to render. Each card is a
 * single hero image + category name + count — click to enter that category's
 * grid (a real working size, never more than ~150 pieces).
 *
 * Register: Casa Carta archive — restrained type, generous negative space,
 * no shadows, no rounded corners. The hero image earns the visual weight.
 */
export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="collection-overview-heading" className="pb-16">
      <div className="mb-10 flex items-baseline justify-between gap-4">
        <p
          id="collection-overview-heading"
          className="text-[10px] uppercase tracking-[0.32em] text-charcoal/55"
        >
          Browse the Archive
        </p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 tabular-nums">
          {groups.length} categories
        </p>
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16">
        {groups.map((group, idx) => {
          const hero = group.products.find((p) => p.primaryImage)?.primaryImage;
          const label = BROWSE_GROUP_LABELS[group.id];
          const tier = BROWSE_GROUP_TIER[group.id];
          // Stagger capped — never more than ~360ms even with 18 cards.
          const delay = reduced ? 0 : Math.min(idx * 0.04, 0.36);

          return (
            <motion.li
              key={group.id}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.4,
                delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                type="button"
                onClick={() => onSelectCategory(group.id)}
                className="group block w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
              >
                {/* Hero frame — 4:5 portrait. Soft cream wash so empty
                    space reads as architecture, not error. */}
                <div
                  className="relative w-full overflow-hidden bg-cream"
                  style={{ aspectRatio: "4 / 5" }}
                >
                  {hero ? (
                    <img
                      src={withCdnWidth(hero.url, 800)}
                      alt={hero.altText ?? label}
                      loading={idx < 6 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.025]"
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3
                    className="font-display text-charcoal leading-none tracking-tight uppercase"
                    style={{
                      fontSize: "clamp(1.05rem, 1.4vw, 1.5rem)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </h3>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 tabular-nums">
                    {group.products.length}
                  </span>
                </div>

                {tier === "safety-net" && (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-charcoal/35">
                    Archive
                  </p>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
