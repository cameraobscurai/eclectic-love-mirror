import { memo } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";

interface Props {
  product: CollectionProduct;
  index?: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

function CollectionWallTileImpl({ product, index = 999, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const rawUrl = product.primaryImage?.url ?? null;
  const url = rawUrl ? withCdnWidth(rawUrl, 600) : null;
  const srcSet = rawUrl ? buildCdnSrcSet(rawUrl, [320, 480, 720, 960]) || undefined : undefined;
  const dim = isAnyHovered && !isHovered;
  const eager = index < 12;

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
            srcSet={srcSet}
            sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, 48vw"
            alt={product.primaryImage?.altText ?? product.title}
            className="w-full h-full object-contain p-[8%] pointer-events-none select-none"
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            {...({ fetchPriority: eager ? "high" : "low" } as Record<string, string>)}
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
