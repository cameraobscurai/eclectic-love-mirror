import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryGalleryOverviewProps {
  groups: Array<{
    id: BrowseGroupId;
    products: CollectionProduct[];
  }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

/**
 * Category gallery — the "front door" to the archive.
 *
 * Brand-aligned with the rest of the Collection page: clinical white field,
 * 1px hairline grid, specimen-style imagery with deliberate breathing room,
 * left-aligned uppercase Cormorant labels with the count as quiet metadata.
 *
 * No gradients, no dark photographic overlays, no bouncy hover scales —
 * the same surgical/editorial register as the product grid.
 */
export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-charcoal">
      {/* Hairline grid — Casa Carta style. The grid lines are real 1px borders,
          not background bleed-through, so cells stay structurally architectural
          even on retina. The rail to the left now owns the "Browse by Category"
          framing — no internal header needed. */}
      <ul
        className="grid w-full grid-cols-2 auto-rows-fr md:grid-cols-3 xl:grid-cols-6 [&>li]:border-r [&>li]:border-b [&>li]:border-black/10"
      >
        {groups.map((group, idx) => {
          const cover = CATEGORY_COVERS[group.id];
          const fallbackHero = group.products.find((p) => p.primaryImage)
            ?.primaryImage;
          const heroSrc =
            cover ??
            (fallbackHero ? withCdnWidth(fallbackHero.url, 900) : null);
          const heroAlt = cover
            ? BROWSE_GROUP_LABELS[group.id]
            : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[group.id];
          const label = BROWSE_GROUP_LABELS[group.id];
          const delay = reduced ? 0 : Math.min(idx * 0.02, 0.2);

          return (
            <motion.li
              key={group.id}
              className="relative min-h-[260px] min-w-0 bg-white md:min-h-[280px] xl:min-h-[300px]"
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
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
                className="group relative flex h-full w-full flex-col bg-white text-left transition-colors duration-200 hover:bg-black/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
                aria-label={label}
              >
                {/* Specimen frame: image is contained inside deliberate padding,
                    not edge-to-edge. Object-contain so silhouettes read as
                    catalog plates, not lifestyle photography. */}
                <div className="relative flex-1 p-6 sm:p-8">
                  {heroSrc ? (
                    <img
                      src={heroSrc}
                      alt={heroAlt}
                      loading={idx < 6 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 m-auto h-full w-full object-contain p-6 transition-opacity duration-300 group-hover:opacity-90 sm:p-8"
                    />
                  ) : (
                    <div className="absolute inset-0" />
                  )}
                </div>

                {/* Frosted-glass label overlay — floats over the bottom of the
                    image, inside the card frame. Name only, no count. */}
                <div
                  className="absolute left-0 right-0 bottom-0 px-[14px] py-[10px]"
                  style={{
                    background: "rgba(255, 255, 255, 0.65)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderTop: "0.5px solid rgba(255, 255, 255, 0.8)",
                    borderRadius: "0 0 12px 12px",
                  }}
                >
                  <h2
                    className="uppercase truncate"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "10px",
                      letterSpacing: "0.18em",
                      color: "#1a1a1a",
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {label}
                  </h2>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
