import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { useNearViewport } from "@/hooks/useNearViewport";

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
  /** Mark image as failed so the parent can hide this product for the session. */
  onImageFailed?: (productId: string) => void;
}

const EAGER_RENDER_COUNT = 12; // first 12: render full internals immediately
const EAGER_LOAD_COUNT = 12; // first 12: loading="eager"
const HIGH_FETCH_COUNT = 6; // first 6: fetchpriority="high"

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
  // Capped per-index stagger — never delays a card more than 420ms regardless
  // of how many products precede it. With AnimatePresence mode="popLayout"
  // this only fires for newly-entering cards; reflowing cards skip it.
  const stagger = reduced ? 0 : Math.min(index * 0.045, 0.42);
  const showInternals = near; // gates image, hover label, fetch

  // Restrained spring — same family used by the grid container so cards and
  // container reflow as one system. No bounce, no playful elasticity.
  const layoutSpring = { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.8 };

  return (
    <motion.li
      ref={ref}
      layout
      layoutId={`tile-${product.id}`}
      initial={
        reduced
          ? { opacity: 1 }
          : { opacity: 0, scale: 0.965, y: 10, filter: "blur(8px)" }
      }
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.965, y: -4, filter: "blur(8px)" }
      }
      transition={{
        // Enter / exit visual properties — short ease-out so the blur
        // resolves crisply rather than spring-wobbling.
        duration: reduced ? 0 : 0.45,
        delay: stagger,
        ease: [0.22, 1, 0.36, 1],
        // Layout (position) reflow — restrained spring family
        layout: reduced ? { duration: 0 } : layoutSpring,
      }}
    >
      {showInternals ? (
        <button
          onClick={onOpen}
          className="group block w-full text-left bg-transparent active:scale-[0.99] transition-transform duration-150"
        >
          {/* Square image plate — quiet off-white surface. No borders, no
              edge-attached drawer, no charcoal seam at the bottom. */}
          <div className="relative aspect-square overflow-hidden bg-[#f3f0ea] transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            {/* Skeleton shimmer beneath the image — fades out on load */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(110deg,#f7f5f2_8%,#efece7_18%,#f7f5f2_33%)] bg-[length:200%_100%] animate-[tile-shimmer_2.4s_linear_infinite] transition-opacity duration-500"
              style={{ opacity: loaded || !product.primaryImage ? 0 : 1 }}
            />

            {product.primaryImage ? (
              <img
                src={product.primaryImage.url}
                alt={product.primaryImage.altText ?? product.title}
                loading={index < EAGER_LOAD_COUNT ? "eager" : "lazy"}
                decoding="async"
                ref={(el) => {
                  if (!el) return;
                  el.setAttribute(
                    "fetchpriority",
                    index < HIGH_FETCH_COUNT ? "high" : "auto",
                  );
                }}
                onLoad={() => setLoaded(true)}
                onError={() => onImageFailed?.(product.id)}
                className="absolute inset-0 w-full h-full object-contain p-4 will-change-[filter,opacity,transform] transition-transform duration-500 group-hover:scale-[1.02]"
                style={{
                  filter: loaded || reduced ? "blur(0px)" : "blur(14px)",
                  opacity: loaded || reduced ? 1 : 0.55,
                  transform: loaded || reduced ? "scale(1)" : "scale(1.015)",
                  transition:
                    "filter 600ms ease-out, opacity 600ms ease-out, transform 600ms ease-out",
                }}
              />
            ) : null}

            {/* Floating Quick View chip — detached, no edge-attached drawer.
                Hidden at rest (no peek, no seam), eases in on hover. */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-charcoal/10 bg-white/85 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-charcoal/70 opacity-0 translate-y-1 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
            >
              Quick View
            </span>
          </div>

          {/* Title sits outside the image frame, editorial style */}
          <div className="pt-3 px-1">
            <h3 className="font-display text-[15px] leading-snug text-charcoal/85 line-clamp-2">
              {product.title}
            </h3>
          </div>
        </button>
      ) : (
        // Deferred shell — same square dimensions, no image request, no
        // hover overlay, no expensive internals. Pure layout placeholder.
        <div aria-hidden className="block w-full bg-transparent">
          <div className="relative aspect-square overflow-hidden bg-[#f3f0ea]">
            <div className="absolute inset-0 bg-[linear-gradient(110deg,#f7f5f2_8%,#efece7_18%,#f7f5f2_33%)] bg-[length:200%_100%] animate-[tile-shimmer_2.4s_linear_infinite]" />
          </div>
          {/* Title placeholder so layout height matches mounted tiles */}
          <div className="pt-3 px-1">
            <div className="h-[18px] w-2/3 bg-charcoal/5" />
          </div>
        </div>
      )}
    </motion.li>
  );
}
