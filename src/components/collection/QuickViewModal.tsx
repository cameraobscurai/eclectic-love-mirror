import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";
import { useFitToLines } from "@/hooks/use-fit-to-lines";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface QuickViewModalProps {
  product: CollectionProduct;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

// Stage-driven QuickView.
// The modal is a 3-row grid: [top bar] · [stage 1fr] · [footer].
// The stage owns the composition; the image fits inside it via object-contain.
// Image dimensions never reshape the modal — every product yields the same
// frame, only the image inside the stage adapts.
//
// Charcoal/white only. Glass on scrim + footer. No accent colors. No pills.

export function QuickViewModal({
  product,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: QuickViewModalProps) {
  const reduced = useReducedMotion();
  const [imgIdx, setImgIdx] = useState(0);
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => setImgIdx(0), [product.id]);

  // Track stage width for Pretext fit-to-lines measurement.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setStageWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reserve ~10% of stage width for breathing room on the right.
  // The title gets ~70% of the stage on desktop so the image can overlap.
  const titleMaxWidth = stageWidth > 0 ? stageWidth * 0.7 - 16 : 0;
  const fittedSize = useFitToLines({
    text: product.title,
    maxWidth: titleMaxWidth,
    family: "Cormorant",
    weight: 400,
    minPx: 28,
    maxPx: 112,
    targetLines: 2,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, [product.id]);

  const img = product.images[imgIdx] ?? product.primaryImage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-6"
    >
      {/* Frosted scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-md"
        style={{ WebkitBackdropFilter: "blur(16px)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* White stage — exhibition surface */}
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: reduced ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-[100dvh] md:h-[88dvh] md:max-h-[880px] md:max-w-[1280px] bg-cream text-charcoal shadow-2xl overflow-hidden grid grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        {/* TOP BAR — eyebrow left, nav right */}
        <div className="flex items-center justify-between px-6 md:px-10 pt-6 md:pt-7">
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/70">
            {product.displayCategory}
          </p>
          <div className="flex items-center gap-1 text-charcoal">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous piece"
              aria-keyshortcuts="ArrowLeft"
              className="group inline-flex items-center gap-2 h-8 px-3 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 disabled:cursor-not-allowed hover:text-charcoal/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 transition-colors"
            >
              <span aria-hidden>←</span> PREV
            </button>
            <span aria-hidden className="h-4 w-px bg-charcoal/20 mx-1" />
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next piece"
              aria-keyshortcuts="ArrowRight"
              className="group inline-flex items-center gap-2 h-8 px-3 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 disabled:cursor-not-allowed hover:text-charcoal/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 transition-colors"
            >
              NEXT <span aria-hidden>→</span>
            </button>
            <span aria-hidden className="h-4 w-px bg-charcoal/20 mx-1" />
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center text-xl leading-none hover:text-charcoal/60 transition-colors active:scale-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
            >
              ×
            </button>
          </div>
        </div>

        {/* STAGE — desktop: title top-left + image bottom-right overlap.
            Mobile: clean stack, title above image, no overlap. */}
        <div
          ref={stageRef}
          className="relative min-h-0 overflow-hidden bg-cream flex flex-col md:block"
        >
          {/* Mobile-only title (block flow, no overlap) */}
          <h2
            className="md:hidden px-6 pt-6 pb-2 font-display leading-[0.95] tracking-[-0.015em] text-charcoal break-words"
            style={{
              fontSize: fittedSize ? `${Math.min(fittedSize, 56)}px` : "clamp(2.25rem, 9vw, 3.5rem)",
            }}
          >
            {product.title}
          </h2>

          {/* Desktop-only title — absolute, top-left, image overlaps it */}
          <h2
            className="hidden md:block absolute top-[10%] left-10 z-0 font-display leading-[0.92] tracking-[-0.015em] text-charcoal pointer-events-none select-none break-words"
            style={{
              maxWidth: titleMaxWidth > 0 ? `${titleMaxWidth}px` : "70%",
              fontSize: fittedSize ? `${fittedSize}px` : "clamp(2.5rem, 5.5vw, 5.5rem)",
            }}
          >
            {product.title}
          </h2>

          {/* Image — mobile: centered & flexed; desktop: bottom-right overlap */}
          <div className="relative md:absolute md:inset-0 z-10 flex-1 md:flex-initial flex items-center justify-center md:items-end md:justify-end px-6 md:px-10 pt-2 md:pt-[18%] pb-4 md:pb-8 pointer-events-none">
            <AnimatePresence mode="wait">
              {img ? (
                <motion.img
                  key={img.url}
                  src={img.url}
                  alt={img.altText ?? product.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.25 }}
                  className="max-h-full max-w-full md:max-w-[68%] object-contain md:object-bottom drop-shadow-[0_30px_40px_rgba(26,26,26,0.12)]"
                />
              ) : (
                <div className="grid place-items-center text-charcoal/30">
                  No image
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* FOOTER — thumbs · dimensions · stocked · CTA */}
        <div className="border-t border-charcoal/15 bg-cream">
          <div className="px-6 md:px-10 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-10 items-center">
            {/* Thumbs */}
            <div className="flex gap-2 order-2 md:order-1">
              {product.images.length > 1 ? (
                product.images.slice(0, 5).map((im, i) => (
                  <button
                    key={im.url}
                    onClick={() => setImgIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === imgIdx}
                    className={cn(
                      "relative h-12 w-16 flex-shrink-0 bg-white/60 border transition-colors active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                      i === imgIdx
                        ? "border-charcoal"
                        : "border-charcoal/15 hover:border-charcoal/45",
                    )}
                  >
                    <img
                      src={im.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain p-1"
                    />
                  </button>
                ))
              ) : (
                <div className="h-12 w-16" aria-hidden />
              )}
            </div>

            {/* Spec columns */}
            <div className="order-3 md:order-2 flex flex-wrap gap-x-10 gap-y-3 md:border-l md:border-charcoal/12 md:pl-10">
              {product.dimensions && (
                <SpecCol label="Dimensions" value={product.dimensions} />
              )}
              {product.stockedQuantity && (
                <SpecCol label="Stocked" value={product.stockedQuantity} />
              )}
              {product.isCustomOrder && !product.stockedQuantity && (
                <SpecCol label="Availability" value="Custom order" />
              )}
            </div>

            {/* CTA */}
            <div className="order-1 md:order-3 flex justify-end">
              <button
                onClick={() => inquiry.toggle(product.id)}
                className={cn(
                  "px-6 py-3 text-[11px] uppercase tracking-[0.28em] transition-all border active:scale-[0.97]",
                  inInquiry
                    ? "bg-cream text-charcoal border-charcoal"
                    : "bg-charcoal text-cream border-charcoal hover:bg-charcoal/85",
                )}
              >
                {inInquiry ? "ADDED TO INQUIRY" : "ADD TO INQUIRY"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SpecCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.28em] text-charcoal/55">
        {label}
      </span>
      <span className="text-sm text-charcoal">{value}</span>
    </div>
  );
}
