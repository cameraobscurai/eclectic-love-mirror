import { memo } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";

interface Props {
  product: CollectionProduct;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

// Wide-low subjects need extra vertical padding so tall-back siblings
// (e.g. settees) don't visually dominate equal-sized cells. Mirrors the
// per-subcategory media-h override on the main grid.
const WIDE_LOW_GROUPS = new Set(["sofas", "benches-ottomans"]);

function CollectionWallTileImpl({ product, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const url = product.primaryImage?.url ?? null;
  const dim = isAnyHovered && !isHovered;
  const group = getProductBrowseGroup(product);
  const padClass = group && WIDE_LOW_GROUPS.has(group) ? "p-[18%]" : "p-[8%]";

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(product.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(product.id)}
      className="relative w-full h-full bg-white overflow-visible group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
      animate={{
        opacity: dim ? 0.45 : 1,
      }}
      transition={{
        opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ willChange: "opacity" }}
      aria-label={product.title}
    >
      <div className="absolute inset-0">
        {url && (
          <img
            src={url}
            alt=""
            className={`w-full h-full object-contain ${padClass} pointer-events-none select-none`}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
      </div>
    </motion.button>
  );
}

export const CollectionWallTile = memo(
  CollectionWallTileImpl,
  (prev, next) =>
    prev.isHovered === next.isHovered &&
    prev.isAnyHovered === next.isAnyHovered &&
    prev.product.id === next.product.id,
);
