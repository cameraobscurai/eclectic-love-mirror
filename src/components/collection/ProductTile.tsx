import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface ProductTileProps {
  product: CollectionProduct;
  index: number;
  onOpen: () => void;
}

const PRIORITY_COUNT = 18; // first 3 rows on desktop
const HIGH_FETCH_COUNT = 6; // first row

export function ProductTile({ product, index, onOpen }: ProductTileProps) {
  const reduced = useReducedMotion();
  const isPriority = index < PRIORITY_COUNT;

  // IO-gated render of the heavy <img>. Empty placeholder until in view.
  const [inView, setInView] = useState(isPriority);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isPriority) return;
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
  }, [isPriority]);

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
      animate={
        inView
          ? { opacity: 1, scale: 1, filter: "blur(0px)" }
          : { opacity: 0 }
      }
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
        className="group block w-full text-left bg-white border border-transparent hover:border-charcoal/15 active:scale-[0.98] transition-all duration-150"
      >
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.primaryImage && inView ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText ?? product.title}
              loading={isPriority ? "eager" : "lazy"}
              decoding="async"
              ref={(el) => {
                if (el)
                  el.setAttribute(
                    "fetchpriority",
                    index < HIGH_FETCH_COUNT ? "high" : "low",
                  );
              }}
              onLoad={() => setLoaded(true)}
              className="absolute inset-0 w-full h-full object-contain p-4 transition-all duration-500 ease-out group-hover:scale-[1.04]"
              style={{
                filter: loaded || reduced ? "blur(0px)" : "blur(10px)",
                opacity: loaded || reduced ? 1 : 0.6,
              }}
            />
          ) : !product.primaryImage ? (
            <div className="absolute inset-0 grid place-items-center text-charcoal/30 text-xs">
              No image
            </div>
          ) : null}
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
