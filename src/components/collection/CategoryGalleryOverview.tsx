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
    <div className="flex h-full min-h-0 flex-col bg-white text-charcoal p-3 sm:p-4">
      {/* White grid — cards lift off the white field via soft shadow + radius.
          Mobile keeps 2 columns (silhouettes stay generous) but uses a shorter
          aspect ratio so ~4 rows fit above the fold instead of ~2. Desktop
          retains the portrait specimen frame. */}
      <ul
        className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
        style={{ background: "#ffffff" }}
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
              className="relative aspect-[5/4] sm:aspect-[4/5] min-w-0 bg-white"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "12px",
                background: "#ffffff",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
              }}
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
                style={{ touchAction: "manipulation" }}
                aria-label={label}
              >
                {/* Image fills the card edge-to-edge with object-contain so the
                    silhouette reads, while the frosted label below has actual
                    image content to sit on top of. */}
                <div className="relative flex-1">
                  {heroSrc ? (
                    <img
                      src={heroSrc}
                      alt={heroAlt}
                      loading={idx < 4 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-contain p-3 sm:p-5 md:p-6 transition-opacity duration-300 group-hover:opacity-90"
                    />
                  ) : (
                    <div className="absolute inset-0" />
                  )}
                </div>

                {/* Frosted-glass label overlay — floats over the bottom of the
                    image, inside the card frame. Name only, no count. */}
                <div
                  className="px-2.5 py-1.5 sm:px-3.5 sm:py-2.5"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(255, 255, 255, 0.65)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderTop: "0.5px solid rgba(255, 255, 255, 0.8)",
                    borderRadius: "0 0 12px 12px",
                  }}
                >
                  <h2
                    className="uppercase truncate text-[9px] sm:text-[10px]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
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
