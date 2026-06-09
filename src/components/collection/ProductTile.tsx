import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { useNearViewport } from "@/hooks/useNearViewport";
import { glassNamePlate, webkitGlassBlur } from "@/lib/glass";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";
import {
  PRODUCT_TILE_ASPECT,
  PRODUCT_TILE_FRAME_ASPECT,
  PRODUCT_TILE_IMAGE_CLASS,
} from "@/lib/collection-tile-presets";
import { NormalizedProductImage } from "./NormalizedProductImage";

// One invariant portrait frame for every tile. The grid is always 3 across at
// lg, 2/3 at sm/md. NormalizedProductImage handles fit inside the frame; no
// per-product or per-category aspect overrides.

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
  onImageFailed?: (productId: string) => void;
}

const EAGER_RENDER_COUNT = 18;
const EAGER_LOAD_COUNT = 12;
const HIGH_FETCH_COUNT = 4;

const REVEAL_COLS = 6;
const REVEAL_STEP_MS = 60;
const REVEAL_MAX_DELAY_MS = 240;
const REVEAL_SKIP_INDEX = 12;

let quickViewWarmed = false;
const preloadQuickView = () => {
  if (quickViewWarmed) return;
  quickViewWarmed = true;
  void import("@/components/collection/QuickViewModal");
};

export function ProductTile({
  product,
  index,
  onOpen,
  onImageFailed,
}: ProductTileProps) {
  const tileAspect = PRODUCT_TILE_ASPECT;
  const frameAspect = PRODUCT_TILE_FRAME_ASPECT;
  const reduced = useReducedMotion();
  const renderImmediately = index < EAGER_RENDER_COUNT;

  const { ref, near } = useNearViewport<HTMLLIElement>({
    rootMargin: "600px",
    initial: renderImmediately,
  });

  const [loaded, setLoaded] = useState(false);
  const showInternals = near;

  const skipReveal = reduced || index < REVEAL_SKIP_INDEX;
  const hasImage = Boolean(product.primaryImage);
  const readyToReveal = near && (loaded || !hasImage);
  const entered = skipReveal ? true : readyToReveal;
  const revealDelayMs = skipReveal
    ? 0
    : Math.min((index % REVEAL_COLS) * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);

  const spyGroup = getProductBrowseGroup(product);

  const layoutSpring = {
    type: "spring" as const,
    stiffness: 260,
    damping: 32,
    mass: 0.8,
  };

  return (
    <motion.li
      ref={ref}
      data-spy-section={spyGroup ?? undefined}
      layout
      transition={{
        layout: reduced ? { duration: 0 } : layoutSpring,
      }}
      style={{
        background: "#ffffff",
        overflow: "hidden",
        // Fixed intrinsic size hint for content-visibility.
        // The actual rendered height is set by aspect-ratio in the frame below,
        // so this is purely a paint-skip budget hint for the browser.
        contentVisibility: index < EAGER_RENDER_COUNT ? "visible" : "auto",
        containIntrinsicSize: "auto 300px",
      }}
    >
      <div
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(4px)",
          transition: skipReveal
            ? "none"
            : `opacity 380ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms, transform 380ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms`,
          willChange: entered ? "auto" : "opacity, transform",
        }}
      >
        {showInternals ? (
          <button
            onClick={onOpen}
            onMouseEnter={preloadQuickView}
            onFocus={preloadQuickView}
            onTouchStart={preloadQuickView}
            aria-label={`Open ${product.title}`}
            className="group block w-full text-left bg-white active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4 focus-visible:ring-offset-white transition-transform duration-150"
          >
            {/* Media frame — fixed aspect ratio, no per-category height logic. */}
            <div
              className="relative w-full bg-white overflow-hidden"
              style={{ aspectRatio: tileAspect }}
            >
              {/* Skeleton overlay — fades on load */}
              <div
                aria-hidden
                className="absolute inset-0 bg-white"
                style={{
                  opacity: loaded || !product.primaryImage ? 0 : 1,
                  transition: "opacity 240ms ease-out",
                }}
              />

              {product.primaryImage ? (
                <NormalizedProductImage
                  src={withCdnWidth(product.primaryImage.url, 600)}
                  frameAspect={frameAspect}
                  visualOffsetY={spyGroup === "bar" ? 0.08 : 0}
                  srcSet={buildCdnSrcSet(product.primaryImage.url, [400, 600, 900]) || undefined}
                  sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, (min-width: 640px) 36vw, 48vw"
                  alt={product.primaryImage.altText ?? product.title}
                  width={600}
                  height={800}
                  loading={index < EAGER_LOAD_COUNT ? "eager" : "lazy"}
                  decoding="async"
                  {...({
                    fetchPriority: index < HIGH_FETCH_COUNT ? "high" : "auto",
                  } as Record<string, string>)}
                  onLoad={() => setLoaded(true)}
                  onError={() => onImageFailed?.(product.id)}
                  className={`absolute inset-0 h-full w-full ${PRODUCT_TILE_IMAGE_CLASS} will-change-opacity`}
                  style={{
                    opacity: loaded ? 1 : 0,
                    transition: "opacity 240ms ease-out",
                  }}
                />
              ) : null}

              {/* Desktop hover glass label */}
              <div
                aria-hidden
                className={[
                  "hidden md:block pointer-events-none absolute left-3 right-3 bottom-3",
                  "opacity-0 translate-y-1.5 transition-all duration-200 ease-out",
                  "group-hover:opacity-100 group-hover:translate-y-0",
                  "group-focus-visible:opacity-100 group-focus-visible:translate-y-0",
                  reduced ? "transition-none" : "",
                ].join(" ")}
              >
                <div
                  className={`${glassNamePlate} rounded-[6px] px-3 py-2`}
                  style={webkitGlassBlur}
                >
                  <p className="text-[12px] leading-[1.3] text-charcoal line-clamp-2 uppercase tracking-[0.06em]">
                    {product.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile caption below the frame */}
            <p
              className="md:hidden mt-3 h-[34px] text-[13px] leading-[1.35] line-clamp-2 transition-colors uppercase tracking-[0.06em]"
              style={{
                maxWidth: "var(--archive-tile-caption-w)",
                color: "var(--archive-text-quiet)",
              }}
            >
              {product.title}
            </p>
          </button>
        ) : (
          <div aria-hidden className="block w-full bg-white">
            <div className="w-full bg-white" style={{ aspectRatio: tileAspect }} />
            <div className="md:hidden mt-3 h-[34px]" />
          </div>
        )}
      </div>
    </motion.li>
  );
}
