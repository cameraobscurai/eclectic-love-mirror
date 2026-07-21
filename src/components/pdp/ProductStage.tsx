// ProductStage — extracted from QuickViewModal's image column.
//
// A pure, chrome-less product stage: the same white exhibition surface,
// object-contain image, drop-shadow, variant label overlay, and horizontal
// thumbs strip used inside QuickViewModal. Nothing about the modal frame
// (scrim, top bar, footer, drag-to-dismiss, focus trap) lives here — this
// component is meant to mount straight into a page.
//
// Mounted as the PDP hero in /collection/<slug> and reusable inside
// QuickViewModal in a follow-up pass. Kept intentionally headless: no
// title, specs, or CTAs — the parent renders those.
//
// The active <img> carries data-pdp-hero-img so the tile→PDP View
// Transition morph (Pass 3) can target it.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { withCdnWidth } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  product: CollectionProduct;
  /** Optional class on the outer wrapper (aspect / height / bg overrides). */
  className?: string;
  /** Called when the active image changes, with the new index. */
  onActiveImageChange?: (index: number) => void;
}

export function ProductStage({ product, className, onActiveImageChange }: Props) {
  const reduced = useReducedMotion();
  const images = product.images && product.images.length > 0
    ? product.images
    : product.primaryImage
      ? [product.primaryImage]
      : [];

  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    setImgIdx(0);
  }, [product.id]);
  useEffect(() => {
    onActiveImageChange?.(imgIdx);
  }, [imgIdx, onActiveImageChange]);

  const active = images[imgIdx] ?? null;

  // Thumbs overflow chips — mirror QuickView's affordance.
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  useEffect(() => {
    const el = thumbsRef.current;
    if (!el) return;
    const update = () => {
      setOverflow({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [product.id, images.length]);
  const nudge = (dir: -1 | 1) => {
    const el = thumbsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  };

  // Preload neighbor images so left/right thumb picks feel instant.
  const preloadUrls = useMemo(() => {
    const set = new Set<string>();
    const push = (i: number) => {
      const im = images[i];
      if (im?.url) set.add(withCdnWidth(im.url, 1500));
    };
    push(imgIdx - 1);
    push(imgIdx + 1);
    return Array.from(set);
  }, [images, imgIdx]);

  return (
    <div
      className={cn(
        "relative flex flex-col bg-white",
        className,
      )}
    >
      {/* IMAGE ZONE — white exhibition surface, object-contain, drop-shadow.
          The wrapper carries the aspect ratio; the image fills it. */}
      <div
        className="relative w-full flex-1 min-h-0 overflow-hidden flex items-center justify-center px-3 md:px-8 py-4 md:py-8"
      >
        <div className="relative w-full h-full min-h-[54vh] md:min-h-[62vh]">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.img
                key={active.url}
                data-pdp-hero-img
                src={withCdnWidth(active.url, 1500)}
                alt={active.altText ?? product.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
                className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(26,26,26,0.10)]"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.24em] text-charcoal/40">
                No image
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden preloader for neighbor images. */}
        {preloadUrls.map((u) => (
          <link key={u} rel="preload" as="image" href={u} />
        ))}
      </div>

      {/* THUMBS — only when >1 image. Horizontal scroller with edge fades. */}
      {images.length > 1 && (
        <div className="border-t border-charcoal/10">
          <div
            className="relative"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 28px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 28px), transparent 100%)",
            }}
          >
            <div
              ref={thumbsRef}
              className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-7 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((im, i) => (
                <button
                  key={im.url + i}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-current={i === imgIdx}
                  className={cn(
                    "relative h-14 w-16 flex-shrink-0 snap-start bg-white border transition-colors active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                    i === imgIdx
                      ? "border-charcoal"
                      : "border-charcoal/15 hover:border-charcoal/45",
                  )}
                >
                  <img
                    src={withCdnWidth(im.url, 300)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain p-1"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Counter + scroll chips */}
          <div className="flex items-center justify-between px-3 pb-2 text-charcoal/70">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={!overflow.left}
              aria-label="Scroll thumbnails left"
              className="h-7 px-2 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
            >
              ←
            </button>
            <span className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55 tabular-nums">
              {imgIdx + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={!overflow.right}
              aria-label="Scroll thumbnails right"
              className="h-7 px-2 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
