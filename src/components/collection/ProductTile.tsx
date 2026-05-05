import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { useNearViewport } from "@/hooks/useNearViewport";
import { glassNamePlate, webkitGlassBlur } from "@/lib/glass";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
  /** Mark image as failed so the parent can hide this product for the session. */
  onImageFailed?: (productId: string) => void;
}

// Eager render = first three full rows on wide desktops, two on smaller.
// Bumping past 12 was previously risky because tiles were heavy; with
// content-visibility:auto on the deferred shells, off-screen cost stays low.
const EAGER_RENDER_COUNT = 18; // first 18: render full internals immediately
const EAGER_LOAD_COUNT = 12; // first 12: loading="eager"
const HIGH_FETCH_COUNT = 12; // first 12 (top two rows on desktop): fetchpriority="high"

// Row-aware reveal — wipes left→right as each row scrolls into view.
// Math is column-modulo against the widest breakpoint (xl: 6 cols). On
// narrower viewports column 1 still gets 0ms, so the wipe direction reads
// correctly even though the absolute offsets compress slightly.
const REVEAL_COLS = 6;
const REVEAL_STEP_MS = 60;
const REVEAL_MAX_DELAY_MS = 240;
// Above-the-fold tiles skip the wipe entirely — they appear together on
// initial paint, no perceptible cascade. Wipe only kicks in for tiles that
// enter via scroll.
const REVEAL_SKIP_INDEX = 12;

// Warm the QuickViewModal chunk on first hover/focus/touch of any tile so
// the modal is in the module cache before the click resolves. One-shot —
// subsequent calls are no-ops because the dynamic import is memoized by the
// loader. Safe to call from any tile.
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
  const reduced = useReducedMotion();
  const renderImmediately = index < EAGER_RENDER_COUNT;

  // Cards 0-11 render full internals from mount. Cards 12+ render a stable
  // shell until they enter the 600px-margin viewport window. Once `near`
  // flips true the hook holds it true for the session, so cards stay mounted
  // when scrolled away — no flicker, no re-request.
  const { ref, near } = useNearViewport<HTMLLIElement>({
    rootMargin: "600px",
    initial: renderImmediately,
  });

  const [loaded, setLoaded] = useState(false);
  const showInternals = near; // gates image, hover label, fetch

  // Row-aware reveal — fires once the tile is near the viewport AND its
  // image has resolved (or there's no image). Tiles in the eager window
  // skip the cascade so the first paint isn't artificially staggered.
  const skipReveal = reduced || index < REVEAL_SKIP_INDEX;
  const hasImage = Boolean(product.primaryImage);
  const readyToReveal = near && (loaded || !hasImage);
  const entered = skipReveal ? true : readyToReveal;
  const revealDelayMs = skipReveal
    ? 0
    : Math.min((index % REVEAL_COLS) * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);

  // Spy section id — drives the right-rail segmented progress and left-rail
  // active highlight. Pure function of the product, so safe to compute here.
  const spyGroup = getProductBrowseGroup(product);

  // Restrained spring — same family used by the grid container so cards and
  // container reflow as one system. No bounce, no playful elasticity.
  const layoutSpring = { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.8 };

  return (
    <motion.li
      ref={ref}
      data-spy-section={spyGroup ?? undefined}
      layout
      // No layoutId. Cross-route shared-element transitions aren't used here,
      // and registering ~900 projection nodes on mount is the single biggest
      // cost in the grid.
      transition={{
        // Layout (position) reflow only — no enter/exit cascade. Reflow IS
        // the visual event when filters change.
        layout: reduced ? { duration: 0 } : layoutSpring,
      }}
      style={{
        background: "#ffffff",
        borderRadius: "8px",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      {/* Reveal wrapper — opacity/transform/blur cascade keyed off `entered`.
          Lives inside the layout-projected <li> so motion.layout still owns
          position transitions when filters change; this only animates the
          one-shot enter. */}
      <div
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(4px)",
          filter: entered ? "blur(0px)" : "blur(2px)",
          transition: skipReveal
            ? "none"
            : `opacity 380ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms, transform 380ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms, filter 380ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms`,
          willChange: entered ? "auto" : "opacity, transform, filter",
        }}
      >
      {showInternals ? (
        <button
          onClick={onOpen}
          onMouseEnter={preloadQuickView}
          onFocus={preloadQuickView}
          onTouchStart={preloadQuickView}
          aria-label={`Open ${product.title}`}
          className="group block w-full text-left bg-white active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4 focus-visible:ring-offset-white transition-transform duration-150 reveal-on-scroll"
        >
          {/* Specimen frame — fixed height, generous interior padding,
              and a shared bottom baseline so every product sits on one
              optical line regardless of its native dimensions. This is
              what makes a wall of mismatched silhouettes (low wide sofa
              next to tall slim lamp) read as a single organized grid
              instead of floating tiles at random heights. */}
          <div
            className="relative w-full bg-white overflow-hidden"
            style={{ height: "var(--archive-tile-media-h)" }}
          >
            {/* Quiet skeleton overlay — pure white so empty tiles read as
                negative space (matches the page background) rather than as
                placeholder blocks. Fades out the moment the image loads. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-white"
              style={{
                opacity: loaded || !product.primaryImage ? 0 : 1,
                transition: "opacity 240ms ease-out",
              }}
            />

            {product.primaryImage ? (
              <img
                src={withCdnWidth(product.primaryImage.url, 750)}
                srcSet={
                  buildCdnSrcSet(product.primaryImage.url, [500, 750, 1100]) ||
                  undefined
                }
                sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, (min-width: 640px) 36vw, 48vw"
                alt={product.primaryImage.altText ?? product.title}
                width={800}
                height={800}
                loading={index < EAGER_LOAD_COUNT ? "eager" : "lazy"}
                decoding="async"
                // Inline so the preload scanner sees it before mount.
                // Cast: React's types don't yet include fetchpriority.
                {...({ fetchPriority: index < HIGH_FETCH_COUNT ? "high" : "auto" } as Record<string, string>)}
                onLoad={() => setLoaded(true)}
                onError={() => onImageFailed?.(product.id)}
                // No padding — the source assets already carry their own
                // transparent margin, so any wrapper padding shrinks the
                // subject to a tiny thumbnail. object-contain fills the
                // cell; object-center keeps the silhouette balanced.
                className="absolute inset-0 h-full w-full object-contain object-center will-change-opacity"
                style={{
                  opacity: loaded ? 1 : 0,
                  transition: "opacity 240ms ease-out",
                }}
              />
            ) : null}

            {/* Desktop-only object label — frosted plate anchored inside the
                media frame. Hidden at rest, revealed on hover/focus.
                aria-hidden because the parent button already exposes the
                product title via aria-label; this is purely decorative. */}
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
                <p className="text-[12px] leading-[1.3] text-charcoal line-clamp-2">
                  {product.title}
                </p>
              </div>
            </div>
          </div>
          {/* Caption — visible on mobile only (no hover available there).
              Desktop relies on the glass label inside the frame above. */}
          <p
            className="md:hidden mt-3 text-[13px] leading-[1.35] line-clamp-2 transition-colors"
            style={{
              maxWidth: "var(--archive-tile-caption-w)",
              color: "var(--archive-text-quiet)",
            }}
          >
            {product.title}
          </p>
        </button>
      ) : (
        // Deferred shell — pure white, no shimmer plate. content-visibility
        // lets the browser skip layout/paint entirely while off-screen, and
        // contain-intrinsic-size reserves stable space so scrollbar position
        // and layout don't shift when the shell hydrates.
        <div
          aria-hidden
          className="block w-full bg-white"
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "var(--archive-tile-media-h, 320px)",
          }}
        >
          <div
            className="w-full bg-white"
            style={{ height: "var(--archive-tile-media-h)" }}
          />
          {/* Caption spacer mirrors hydrated state: only present on mobile,
              where the visible caption lives below the image. */}
          <div className="md:hidden mt-3 h-[34px]" />
          <div className="md:hidden mt-3 h-[34px]" />
        </div>
      )}
      </div>
    </motion.li>
  );
}
