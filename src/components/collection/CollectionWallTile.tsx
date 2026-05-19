import { memo, useState } from "react";
import { motion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { getTilePreset } from "@/lib/collection-tile-presets";
import { useNearViewport } from "@/hooks/useNearViewport";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";


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

const WALL_WIDTHS = [600, 900, 1200];

function CollectionWallTileImpl({ product, isHovered, isAnyHovered, onHover, onOpen }: Props) {
  const url = product.primaryImage?.url ?? null;
  const dim = isAnyHovered && !isHovered;
  const group = getProductBrowseGroup(product);
  const padClass = group && WIDE_LOW_GROUPS.has(group) ? "p-[18%]" : "p-[8%]";
  const preset = getTilePreset(group);
  const maxAspect = preset.maxAspect;

  // Gate src on near-viewport so a 100+ tile category doesn't all hit
  // Supabase Storage in one burst (429 throttling cause).
  const { ref, near } = useNearViewport<HTMLButtonElement>({ rootMargin: "800px" });

  // Retry once on error after jittered backoff — covers transient 429s
  // from Supabase Storage's public origin.
  const [retry, setRetry] = useState(0);
  const baseSrc = url ? withCdnWidth(url, 1200) : "";
  const baseSet = url ? buildCdnSrcSet(url, WALL_WIDTHS) : "";
  const cacheBust = retry > 0 ? (baseSrc.includes("?") ? "&" : "?") + "_r=" + retry : "";
  const finalSrc = baseSrc ? baseSrc + cacheBust : "";

  const handleError = () => {
    if (retry >= 1) return;
    const delay = 1500 + Math.random() * 1500;
    window.setTimeout(() => setRetry((r) => r + 1), delay);
  };

  return (
    <motion.button
      ref={ref}
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
        {url && near && (
          <div
            className="h-full max-w-full"
            style={maxAspect ? { aspectRatio: String(maxAspect) } : { width: "100%" }}
          >
            <img
              src={finalSrc}
              srcSet={baseSet}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              alt=""
              className={`w-full h-full object-contain ${padClass} pointer-events-none select-none`}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={handleError}
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
