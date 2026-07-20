import { memo } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { PRODUCT_TILE_IMAGE_CLASS } from "@/lib/collection-tile-presets";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";
import { NormalizedProductImage } from "./NormalizedProductImage";

interface Props {
  product: CollectionProduct;
  cellAspect: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

const WALL_WIDTHS = [600, 900, 1200];

function CollectionWallTileImpl({ product, cellAspect, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const url = product.primaryImage?.url ?? null;
  const dim = isAnyHovered && !isHovered;

  // Route through Supabase's /render/image transform endpoint via withCdnWidth
  // so the CDN can serve right-sized variants and cache them properly. Native
  // loading="lazy" already gates off-screen requests — no IO observer needed.
  const src = url ? withCdnWidth(url, 1200) : "";
  const srcSet = url ? buildCdnSrcSet(url, WALL_WIDTHS) : "";

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(product.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(product.id)}
      className="relative w-full h-full bg-white overflow-visible group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
      animate={{
        opacity: dim ? 0.3 : 1,
      }}
      transition={{
        opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ willChange: "opacity" }}
      aria-label={product.title}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {url && (
          <NormalizedProductImage
            src={src}
            srcSet={srcSet}
            frameAspect={cellAspect}
            targetArea={0.84}
            maxW={0.97}
            maxH={0.97}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={product.title}
            className={`w-full h-full ${PRODUCT_TILE_IMAGE_CLASS} pointer-events-none select-none`}
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
    prev.product.id === next.product.id &&
    prev.cellAspect === next.cellAspect,
);
