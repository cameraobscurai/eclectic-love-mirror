import { memo } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  product: CollectionProduct;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

function CollectionWallTileImpl({ product, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const url = product.primaryImage?.url ?? null;
  // Optional editorial backdrop — its own slot on the product, never part
  // of the gallery. Renders full-bleed behind the cutout when present.
  const backdropUrl = product.cardBackgroundUrl ?? null;
  const dim = isAnyHovered && !isHovered;

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(product.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(product.id)}
      className="relative w-full h-full bg-white overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
      animate={{
        opacity: dim ? 0.45 : 1,
      }}
      transition={{
        opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ willChange: "opacity" }}
      aria-label={product.title}
    >
      {backdropUrl && (
        <div className="absolute inset-0">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover pointer-events-none select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      )}
      {url && (
        <div className="absolute inset-0">
          <img
            src={url}
            alt=""
            className="w-full h-full object-contain p-[8%] pointer-events-none select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      )}
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
