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
  const dim = isAnyHovered && !isHovered;

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(product.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(product.id)}
      className="relative w-full h-full bg-white overflow-visible group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
      animate={{
        opacity: dim ? 0.12 : 1,
        zIndex: isHovered ? 50 : 1,
      }}
      transition={{
        opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ willChange: "transform, opacity" }}
      aria-label={product.title}
    >
      <motion.div
        className="absolute inset-0 origin-center"
        animate={{ scale: isHovered ? 2.6 : 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        style={{ zIndex: isHovered ? 50 : "auto", willChange: "transform" }}
      >
        {url && (
          <img
            src={url}
            alt=""
            className="w-full h-full object-contain p-[8%] pointer-events-none select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
      </motion.div>
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
