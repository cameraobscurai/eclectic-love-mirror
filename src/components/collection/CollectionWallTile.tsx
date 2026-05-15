import { memo } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { getTilePreset } from "@/lib/collection-tile-presets";


interface Props {
  product: CollectionProduct;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

// Wall tile uses a chunkier base pad (p-[8%]) than the grid tile because
// cells are larger; per-family presets only adjust top/bottom asymmetry
// for wide-low silhouettes so settees and chesterfields share a baseline.
const WIDE_LOW_GROUPS = new Set(["sofas", "benches-ottomans", "coffee-tables", "cocktail-tables", "rugs", "furs-pelts"]);

function CollectionWallTileImpl({ product, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const url = product.primaryImage?.url ?? null;
  const dim = isAnyHovered && !isHovered;
  const group = getProductBrowseGroup(product);
  const padClass = group && WIDE_LOW_GROUPS.has(group) ? "p-[18%]" : "p-[8%]";
  // Carry the dining width-cap into wall view so banquettes/wide tables
  // don't blow out next to chairs/pedestals.
  const preset = getTilePreset(group);
  const maxAspect = preset.maxAspect;

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
      <div className="absolute inset-0 flex items-center justify-center">
        {url && (
          <div
            className="h-full max-w-full"
            style={maxAspect ? { aspectRatio: String(maxAspect) } : { width: "100%" }}
          >
            <img
              src={url}
              alt=""
              className={`w-full h-full object-contain ${padClass} pointer-events-none select-none`}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
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
