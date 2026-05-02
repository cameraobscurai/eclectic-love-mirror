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
  // Skip blur-up for the first 6 priority tiles so the LCP image paints crisp.
  const skipBlur = index < HIGH_FETCH_COUNT;

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
          aria-label={`Open ${product.title}`}
          className="group block w-full text-left bg-white active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4 focus-visible:ring-offset-white transition-transform duration-150"
        >
          {/* Invisible media frame — fixed responsive height keeps every
              object optically aligned to the same baseline regardless of
              intrinsic image ratio. No card, no border, no plate. */}
          <div
            className="relative w-full flex items-center justify-center bg-white overflow-hidden"
            style={{ height: "clamp(150px, 13vw, 210px)" }}
          >
            {/* Quiet skeleton — fades out on load. No cream plate. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-white transition-opacity duration-500"
              style={{ opacity: loaded || !product.primaryImage || skipBlur ? 0 : 1 }}
            />

            {product.primaryImage ? (
              <img
                src={product.primaryImage.url}
                alt={product.primaryImage.altText ?? product.title}
                width={800}
                height={800}
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
                className="max-w-full max-h-full w-auto h-auto object-contain will-change-[filter,opacity,transform] group-hover:scale-[1.04]"
                style={{
                  filter: loaded || reduced || skipBlur ? "blur(0px)" : "blur(14px)",
                  opacity: loaded || reduced || skipBlur ? 1 : 0.55,
                  transition:
                    "filter 600ms ease-out, opacity 600ms ease-out, transform 500ms ease-out",
                }}
              />
            ) : null}
          </div>
          {/* Title under image — quiet archive caption */}
          <p
            className="mt-3 text-[13px] leading-[1.35] text-charcoal/70 line-clamp-2 group-hover:text-charcoal transition-colors"
            style={{ maxWidth: "190px" }}
          >
            {product.title}
          </p>
        </button>
      ) : (
        // Deferred shell — pure white, no shimmer plate
        <div aria-hidden className="block w-full bg-white">
          <div
            className="w-full bg-white"
            style={{ height: "clamp(150px, 13vw, 210px)" }}
          />
          <div className="mt-3 h-[34px]" />
        </div>
      )}
    </motion.li>
  );
}
