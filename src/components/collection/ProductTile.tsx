import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
  /** Mark image as failed so the parent can hide this product for the session. */
  onImageFailed?: (productId: string) => void;
}

const EAGER_COUNT = 12; // first 12: loading="eager"
const HIGH_FETCH_COUNT = 6; // first 6: fetchpriority="high"
const LIGHT_RENDER_COUNT = 18; // first 18: render <img> immediately, rest IO-gated

export function ProductTile({
  product,
  index,
  onOpen,
  onImageFailed,
}: ProductTileProps) {
  const reduced = useReducedMotion();
  const isEager = index < EAGER_COUNT;
  const renderImmediately = index < LIGHT_RENDER_COUNT;

  // IO-gated render of the heavy <img>. Skeleton holds layout until in view.
  const [inView, setInView] = useState(renderImmediately);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (renderImmediately) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [renderImmediately]);

  const stagger = reduced ? 0 : Math.min(index * 0.035, 0.4);

  return (
    <motion.li
      ref={ref}
      layout
      layoutId={`tile-${product.id}`}
      initial={
        reduced
          ? { opacity: 1 }
          : { opacity: 0, scale: 0.97, filter: "blur(6px)" }
      }
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      transition={{
        duration: reduced ? 0 : 0.4,
        delay: stagger,
        ease: [0.22, 1, 0.36, 1],
        layout: { duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <button
        onClick={onOpen}
        className="group block w-full text-left bg-white border border-transparent hover:border-charcoal/15 active:scale-[0.98] transition-[border-color,transform] duration-150"
      >
        {/* Square card surface — same dimensions as skeleton, no layout shift */}
        <div className="relative aspect-square overflow-hidden bg-white">
          {/* Skeleton plate — always present beneath the image so the box never
              collapses while loading. Fades out the moment the image resolves. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(110deg,#f7f5f2_8%,#efece7_18%,#f7f5f2_33%)] bg-[length:200%_100%] animate-[tile-shimmer_2.4s_linear_infinite] transition-opacity duration-500"
            style={{ opacity: loaded || !product.primaryImage ? 0 : 1 }}
          />

          {product.primaryImage && inView ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText ?? product.title}
              loading={isEager ? "eager" : "lazy"}
              decoding="async"
              // fetchpriority is not in the official React DOM types yet; set
              // via attribute so it ships to HTML without TS friction.
              ref={(el) => {
                if (!el) return;
                el.setAttribute(
                  "fetchpriority",
                  index < HIGH_FETCH_COUNT ? "high" : "auto",
                );
              }}
              onLoad={() => setLoaded(true)}
              onError={() => onImageFailed?.(product.id)}
              className="absolute inset-0 w-full h-full object-contain p-4 will-change-[filter,opacity,transform] group-hover:scale-[1.03]"
              style={{
                // Blur-up reveal — exact spec
                filter: loaded || reduced ? "blur(0px)" : "blur(14px)",
                opacity: loaded || reduced ? 1 : 0.55,
                transform: loaded || reduced ? "scale(1)" : "scale(1.015)",
                transition:
                  "filter 600ms ease-out, opacity 600ms ease-out, transform 600ms ease-out",
              }}
            />
          ) : null}

          {/* Hover label */}
          <div className="absolute inset-x-0 bottom-0 bg-charcoal/85 text-cream px-3 py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-xs leading-snug line-clamp-2">{product.title}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/70">
              Quick View
            </p>
          </div>
        </div>
      </button>
    </motion.li>
  );
}
