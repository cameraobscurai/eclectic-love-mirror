import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { PRODUCT_TILE_IMAGE_CLASS } from "@/lib/collection-tile-presets";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";
import { NormalizedProductImage } from "./NormalizedProductImage";
import { resolveFit } from "./categoryFit";
import { physicalScale } from "./productPhysicalScale";

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
  const fit = resolveFit(product.categorySlug ?? null);
  const itemScale = physicalScale(product);
  const scaledFit = itemScale === 1
    ? fit
    : {
        ...fit,
        primaryTarget: fit.primaryTarget * itemScale,
        secondaryMax: fit.secondaryMax * itemScale,
        clampMin: fit.clampMin * itemScale,
        clampMax: fit.clampMax * itemScale,
        fallback: {
          ...fit.fallback,
          scale: fit.fallback.scale * itemScale,
        },
      };

  // Fallback chain: CDN-transformed → raw original URL. Some Supabase render
  // transforms 400 transiently or reject certain source formats; falling back
  // to the raw object URL keeps the tile visible instead of a question mark.
  const [useRaw, setUseRaw] = useState(false);
  useEffect(() => setUseRaw(false), [url]);

  const src = url ? (useRaw ? url : withCdnWidth(url, 1200)) : "";
  const srcSet = url && !useRaw ? buildCdnSrcSet(url, WALL_WIDTHS) : "";

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
            fit={scaledFit}
            focalX={product.coverFocalX ?? null}
            focalY={product.coverFocalY ?? null}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={product.title}
            eager
            className={`w-full h-full ${PRODUCT_TILE_IMAGE_CLASS} pointer-events-none select-none`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => {
              if (!useRaw) setUseRaw(true);
            }}
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
    prev.product.primaryImage?.url === next.product.primaryImage?.url &&
    prev.product.categorySlug === next.product.categorySlug &&
    prev.product.dimensions === next.product.dimensions &&
    prev.cellAspect === next.cellAspect,
);

