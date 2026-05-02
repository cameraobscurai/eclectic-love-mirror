import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";
import type { CollectionProduct } from "@/server/phase3-catalog.server";

interface QuickViewModalProps {
  product: CollectionProduct;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

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

  useEffect(() => setImgIdx(0), [product.id]);

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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={
          reduced ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.98 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }
        }
        transition={{
          duration: reduced ? 0 : 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full md:max-w-5xl bg-white text-charcoal shadow-2xl max-h-[92vh] md:max-h-[85vh] overflow-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border-b border-charcoal/10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-charcoal/55">
            {product.displayCategory}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous piece"
              className="h-8 px-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30 hover:text-charcoal/60 transition-colors"
            >
              ‹ Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next piece"
              className="h-8 px-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30 hover:text-charcoal/60 transition-colors"
            >
              Next ›
            </button>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center text-lg hover:text-charcoal/60 transition-colors active:scale-90"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="bg-white">
            <div className="relative aspect-square">
              <AnimatePresence mode="wait">
                {img ? (
                  <motion.img
                    key={img.url}
                    src={img.url}
                    alt={img.altText ?? product.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.2 }}
                    className="absolute inset-0 w-full h-full object-contain p-6"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-charcoal/30">
                    No image
                  </div>
                )}
              </AnimatePresence>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto border-t border-charcoal/10">
                {product.images.map((im, i) => (
                  <button
                    key={im.url}
                    onClick={() => setImgIdx(i)}
                    className={cn(
                      "relative h-16 w-16 flex-shrink-0 bg-white border transition-colors active:scale-95",
                      i === imgIdx
                        ? "border-charcoal"
                        : "border-charcoal/10 hover:border-charcoal/40",
                    )}
                  >
                    <img
                      src={im.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8 flex flex-col">
            <h2 className="font-display text-3xl leading-tight">
              {product.title}
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-charcoal/55">
              {product.displayCategory}
              {product.subcategory ? ` · ${product.subcategory}` : ""}
            </p>

            <dl className="mt-6 space-y-3 text-sm">
              {product.dimensions && (
                <Row label="Dimensions" value={product.dimensions} />
              )}
              {product.stockedQuantity && (
                <Row label="Stocked" value={product.stockedQuantity} />
              )}
              {product.isCustomOrder && (
                <Row label="Availability" value="Custom order" />
              )}
            </dl>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-charcoal/75 whitespace-pre-line">
                {product.description}
              </p>
            )}

            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <button
                onClick={() => inquiry.toggle(product.id)}
                className={cn(
                  "px-5 py-3 text-xs uppercase tracking-[0.22em] transition-all border active:scale-[0.97]",
                  inInquiry
                    ? "bg-white text-charcoal border-charcoal"
                    : "bg-charcoal text-cream border-charcoal hover:bg-charcoal/85",
                )}
              >
                {inInquiry ? "Added to inquiry" : "Add to Inquiry"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-charcoal/8 pb-2">
      <dt className="w-28 flex-shrink-0 text-[10px] uppercase tracking-[0.22em] text-charcoal/55 pt-1">
        {label}
      </dt>
      <dd className="text-sm text-charcoal">{value}</dd>
    </div>
  );
}
