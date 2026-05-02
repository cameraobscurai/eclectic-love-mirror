import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { FitText } from "@/components/ui/FitText";

interface CategoryGalleryOverviewProps {
  groups: Array<{
    id: BrowseGroupId;
    products: CollectionProduct[];
  }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-[color:var(--archive-rule)] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase"
              style={{
                letterSpacing: "var(--label-tracking-micro)",
                color: "var(--archive-text-muted)",
              }}
            >
              Hive Signature Collection
            </p>
            <h1
              className="mt-2 text-charcoal"
              style={{ fontSize: "clamp(2rem, 5vw, 4.25rem)", lineHeight: 0.95 }}
            >
              Browse by category
            </h1>
          </div>

          <p className="max-w-[30rem] text-[13px] leading-relaxed text-charcoal/55 lg:text-right">
            A quieter front door into the archive — choose a family, then drop into the full inventory.
          </p>
        </div>
      </div>

      <ul
        className="grid h-full min-h-0 w-full grid-cols-2 auto-rows-fr gap-px bg-[color:var(--archive-rule)] md:grid-cols-3 xl:grid-cols-6"
      >
        {groups.map((group, idx) => {
          const cover = CATEGORY_COVERS[group.id];
          const fallbackHero = group.products.find((p) => p.primaryImage)?.primaryImage;
          const heroSrc = cover ?? (fallbackHero ? withCdnWidth(fallbackHero.url, 900) : null);
          const heroAlt = cover
            ? BROWSE_GROUP_LABELS[group.id]
            : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[group.id];
          const label = BROWSE_GROUP_LABELS[group.id];
          const delay = reduced ? 0 : Math.min(idx * 0.025, 0.24);

          return (
            <motion.li
              key={group.id}
              className="relative min-h-[200px] min-w-0 bg-white md:min-h-[230px] xl:min-h-0"
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.45,
                delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                type="button"
                onClick={() => onSelectCategory(group.id)}
                className="group relative block h-full w-full overflow-hidden bg-[color:var(--cream)] text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
                aria-label={`${label} — ${group.products.length} pieces`}
              >
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    alt={heroAlt}
                    loading={idx < 6 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-cream" />
                )}

                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/18 to-transparent opacity-95 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px bg-white/40 transition-opacity duration-300 group-hover:opacity-80"
                />

                <div className="absolute inset-x-0 bottom-0 px-3 py-3 sm:px-4 sm:py-4">
                  <div className="flex items-end gap-2 text-cream">
                    <div className="min-w-0 flex-1">
                      <FitText
                        as="h2"
                        text={label}
                        fontTemplate={'500 ${size}px "Saol Display", "Cormorant Garamond", "Times New Roman", serif'}
                        minSize={11}
                        maxSize={23}
                        letterSpacingEm={0.05}
                        className="font-display uppercase leading-none"
                        style={{ letterSpacing: "0.05em" }}
                      />
                    </div>
                    <span className="mb-0.5 shrink-0 text-[10px] uppercase tracking-[0.22em] text-cream/72">
                      {group.products.length}
                    </span>
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
