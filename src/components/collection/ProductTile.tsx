import { useCallback, useState } from "react";
// framer-motion removed — no motion props needed on tile
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { useNearViewport } from "@/hooks/useNearViewport";
import {
  PRODUCT_TILE_ASPECT,
  PRODUCT_TILE_FRAME_ASPECT,
  PRODUCT_TILE_IMAGE_CLASS,
  PRODUCT_TILE_OVERRIDES,
} from "@/lib/collection-tile-presets";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { NormalizedProductImage } from "./NormalizedProductImage";
import { resolveFit } from "./categoryFit";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
  onImageFailed?: (productId: string) => void;
  alignToSharedBaseline?: boolean;
}

const EAGER_RENDER_COUNT = 18;
const EAGER_LOAD_COUNT = 12;
const HIGH_FETCH_COUNT = 4;


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
  alignToSharedBaseline = true,
}: ProductTileProps) {
  const spyGroup = getProductBrowseGroup(product);
  const tileAspect = PRODUCT_TILE_ASPECT;
  const frameAspect = PRODUCT_TILE_FRAME_ASPECT;
  const renderImmediately = index < EAGER_RENDER_COUNT;

  const { ref, near } = useNearViewport<HTMLLIElement>({
    rootMargin: "1500px",
    initial: renderImmediately,
  });

  const [loaded, setLoaded] = useState(false);
  const showInternals = near;

  const markLoaded = useCallback(() => setLoaded(true), []);
  const captureLoadedImage = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  // Tile container is always visible; only the image area shows a skeleton
  // until it loads. Previously the whole tile (caption + image) faded in on
  // image load, so any slow image made the tile look "disappeared."

  const overrides = PRODUCT_TILE_OVERRIDES[product.id];
  const fit = resolveFit(product.categorySlug);
  const imageSrc = product.primaryImage ? withCdnWidth(product.primaryImage.url, 600) : "";
  const imageSrcSet = product.primaryImage
    ? buildCdnSrcSet(product.primaryImage.url, [400, 600, 900]) || undefined
    : undefined;

  return (
    <li
      ref={ref}
      data-spy-section={spyGroup ?? undefined}
      style={{
        background: "#ffffff",
        overflow: "hidden",
        contentVisibility: index < EAGER_RENDER_COUNT ? "visible" : "auto",
        containIntrinsicSize: "auto 300px",
      }}
    >
      <div>

        {showInternals ? (
          <button
            onClick={onOpen}
            onMouseEnter={preloadQuickView}
            onFocus={preloadQuickView}
            onTouchStart={preloadQuickView}
            aria-label={`Open ${product.title}`}
            className="group block w-full text-left bg-white active:scale-[0.985] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4 focus-visible:ring-offset-white transition-transform duration-150"
          >
            {/* Media frame */}
            <div
              className="product-tile-media relative w-full bg-white overflow-hidden"
              data-fit-anchor={fit.anchor}
              style={{
                aspectRatio: tileAspect,
                ["--fit-anchor-y" as string]: `${fit.anchorY * 100}%`,
                ["--fit-center-x" as string]: `${fit.centerX * 100}%`,
                ["--fit-secondary-max" as string]: `${fit.secondaryMax * 100}%`,
              }}
            >
              {/* Skeleton overlay */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: "#f5f3ef",
                  opacity: loaded || !product.primaryImage ? 0 : 1,
                  transition: "opacity 240ms ease-out",
                }}
              />
              {/* Debug: secondary-cap band (visible only under ?debug=media). */}
              <div aria-hidden className="product-tile-media__cap" />

              {product.primaryImage ? (
                <NormalizedProductImage
                  ref={captureLoadedImage}
                  src={imageSrc}
                  frameAspect={frameAspect}
                  fit={resolveFit(product.categorySlug)}
                  eager={index < HIGH_FETCH_COUNT}
                  visualOffsetY={overrides?.visualOffsetY ?? 0}
                  focalX={product.coverFocalX ?? null}
                  focalY={product.coverFocalY ?? null}
                  srcSet={imageSrcSet}
                  sizes="(min-width: 1024px) calc((min(100vw, 1600px) - 8rem) / 3), (min-width: 640px) 33vw, 50vw"
                  alt={product.primaryImage.altText ?? product.title}
                  width={600}
                  height={800}
                  loading={index < EAGER_LOAD_COUNT ? "eager" : "lazy"}
                  decoding="async"
                  {...({
                    fetchPriority: index < HIGH_FETCH_COUNT ? "high" : "auto",
                  } as Record<string, string>)}
                  onLoad={markLoaded}
                  onError={() => onImageFailed?.(product.id)}
                  className={`absolute inset-0 h-full w-full ${PRODUCT_TILE_IMAGE_CLASS} will-change-transform group-hover:scale-[1.015]`}
                  style={{
                    transition: "transform 380ms ease-out",
                  }}
                />
              ) : null}
            </div>


            {/* Unified caption - fixed two-line band so every row starts at the same floor. */}
            <div className="product-tile-caption mt-2.5 md:mt-3.5 pb-2 transition-colors duration-300">
               <p className="text-[10px] md:text-[11px] lg:text-[12px] leading-snug text-charcoal/80 uppercase tracking-[0.08em] line-clamp-2 group-hover:text-charcoal transition-colors">
                {product.title}
              </p>
            </div>
          </button>
        ) : (
          <div aria-hidden className="block w-full bg-white">
            <div className="w-full bg-white" style={{ aspectRatio: tileAspect }} />
            <div className="mt-3.5 pb-2 min-h-[1.5em]" />
          </div>
        )}
      </div>
    </li>
  );
}
