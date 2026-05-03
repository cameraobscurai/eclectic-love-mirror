import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { parseDimensions } from "@/lib/parse-dimensions";
import { withCdnWidth } from "@/lib/image-url";

interface QuickViewModalProps {
  product: CollectionProduct;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

// Two-column composition: image on the left in a quiet studio ground,
// metadata stacked on the right with the inquiry CTA + thumbs in a footer
// row. Scale rules attach to the rendered image's actual bounds.
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
  const [showScale, setShowScale] = useState(false);
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const dims = useMemo(
    () => parseDimensions(product.dimensions),
    [product.dimensions],
  );
  const hasScale = dims.width !== null || dims.height !== null;

  useEffect(() => {
    setImgIdx(0);
    setShowScale(false);
  }, [product.id]);

  useEffect(() => {
    setImgNatural(null);
  }, [product.id, imgIdx]);

  // Track stage box so we can compute the contained image footprint
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute rendered image box inside stage using object-contain math
  const imageBox = useMemo(() => {
    if (!imgNatural || stageSize.w === 0 || stageSize.h === 0) return null;
    // Stage padding is 40px → usable area
    const pad = 40;
    const availW = Math.max(0, stageSize.w - pad * 2);
    const availH = Math.max(0, stageSize.h - pad * 2);
    if (availW === 0 || availH === 0) return null;
    const stageAR = availW / availH;
    const imgAR = imgNatural.w / imgNatural.h;
    let w: number, h: number;
    if (imgAR > stageAR) {
      w = availW;
      h = availW / imgAR;
    } else {
      h = availH;
      w = availH * imgAR;
    }
    const left = pad + (availW - w) / 2;
    const top = pad + (availH - h) / 2;
    return { left, top, width: w, height: h };
  }, [imgNatural, stageSize]);

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

  if (typeof document === "undefined") return null;

  return createPortal(
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

      {/* Modal shell — constrained, no radius */}
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: reduced ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-white text-charcoal shadow-2xl overflow-hidden grid grid-rows-[auto_minmax(0,1fr)] h-[100dvh] md:h-auto"
        style={{
          width: "92vw",
          maxWidth: 900,
          maxHeight: "85vh",
          borderRadius: 0,
        }}
      >
        {/* TOP BAR — 48px tall */}
        <div
          className="flex items-center justify-between border-b border-charcoal/[0.08]"
          style={{ height: 48, padding: "0 24px" }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
            {product.displayCategory}
          </p>
          <div className="flex items-center text-charcoal">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous piece"
              className="inline-flex items-center gap-2 h-8 px-3 text-[10px] uppercase tracking-[0.22em] disabled:opacity-25 disabled:cursor-not-allowed hover:text-charcoal/60 transition-colors"
            >
              <span aria-hidden>←</span> PREV
            </button>
            <span aria-hidden className="h-4 w-px bg-charcoal/[0.12]" />
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next piece"
              className="inline-flex items-center gap-2 h-8 px-3 text-[10px] uppercase tracking-[0.22em] disabled:opacity-25 disabled:cursor-not-allowed hover:text-charcoal/60 transition-colors"
            >
              NEXT <span aria-hidden>→</span>
            </button>
            <span aria-hidden className="h-4 w-px bg-charcoal/[0.12]" />
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center text-xl leading-none hover:text-charcoal/60 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* TWO-COLUMN BODY — overflow visible so title can bleed across the divider */}
        <div
          className="min-h-0 relative"
          style={{
            display: "grid",
            gridTemplateColumns: "55fr 45fr",
            height: "100%",
          }}
        >
          {/* LEFT — image stage */}
          <div
            ref={stageRef}
            className="relative"
            style={{
              background: "#f9f8f6",
              padding: 40,
              minHeight: 0,
            }}
          >
            <AnimatePresence mode="wait">
              {img ? (
                <motion.img
                  ref={imgRef}
                  key={img.url}
                  src={withCdnWidth(img.url, 1500)}
                  alt={img.altText ?? product.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.25 }}
                  onLoad={(e) => {
                    const t = e.currentTarget;
                    setImgNatural({ w: t.naturalWidth, h: t.naturalHeight });
                  }}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ padding: 40 }}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-charcoal/30">
                  No image
                </div>
              )}
            </AnimatePresence>

            {/* Scale overlay — bound to rendered image footprint */}
            <AnimatePresence>
              {showScale && hasScale && imageBox && (
                <motion.div
                  key="scale-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="absolute pointer-events-none"
                  style={{
                    left: imageBox.left,
                    top: imageBox.top,
                    width: imageBox.width,
                    height: imageBox.height,
                  }}
                >
                  {dims.height !== null && (
                    <div
                      style={{
                        position: "absolute",
                        right: -20,
                        top: 0,
                        bottom: 0,
                        borderRight: "1px solid rgba(26,26,26,0.3)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          transform: "rotate(90deg)",
                          fontSize: 9,
                          letterSpacing: "0.2em",
                          color: "rgba(26,26,26,0.55)",
                          whiteSpace: "nowrap",
                          marginLeft: 6,
                        }}
                      >
                        {formatInches(dims.height)}
                      </span>
                    </div>
                  )}
                  {dims.width !== null && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -20,
                        left: 0,
                        right: 0,
                        borderBottom: "1px solid rgba(26,26,26,0.3)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.2em",
                          color: "rgba(26,26,26,0.55)",
                          marginBottom: 4,
                        }}
                      >
                        {formatInches(dims.width)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT — metadata column */}
          <div
            className="flex flex-col min-h-0 overflow-hidden"
            style={{
              padding: "32px 36px",
              borderLeft: "1px solid rgba(26,26,26,0.08)",
            }}
          >
            {/* Top — category, title, description */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <p
                className="uppercase text-charcoal/40"
                style={{ fontSize: 8, letterSpacing: "0.22em" }}
              >
                {product.displayCategory}
              </p>
              <h2
                className="font-display text-charcoal break-words"
                style={{
                  marginTop: 12,
                  fontSize: "clamp(28px, 3vw, 44px)",
                  lineHeight: 1.05,
                  letterSpacing: "var(--tracking-display)",
                  fontWeight: 400,
                }}
              >
                {product.title}
              </h2>
              {product.description && (
                <p
                  className="text-charcoal/60"
                  style={{
                    marginTop: 16,
                    fontSize: 13,
                    lineHeight: 1.75,
                    maxWidth: 280,
                  }}
                >
                  {product.description}
                </p>
              )}
            </div>

            {/* Footer — thumbs · specs · CTA */}
            <div
              className="flex flex-col gap-4"
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(26,26,26,0.08)",
              }}
            >
              {/* Row 1: thumbs + scale toggle */}
              <div className="flex items-center justify-between gap-4">
                {product.images.length > 1 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {product.images.map((im, i) => (
                      <button
                        key={im.url}
                        onClick={() => setImgIdx(i)}
                        aria-label={`View image ${i + 1}`}
                        aria-current={i === imgIdx}
                        style={{ flexShrink: 0 }}
                      >
                        <img
                          src={withCdnWidth(im.url, 200)}
                          alt=""
                          width={64}
                          height={48}
                          style={{
                            objectFit: "cover",
                            width: 64,
                            height: 48,
                            opacity: i === imgIdx ? 1 : 0.45,
                            outline:
                              i === imgIdx
                                ? "1.5px solid #1a1a1a"
                                : "none",
                            outlineOffset: "-1px",
                            transition: "opacity 0.15s ease",
                            display: "block",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div />
                )}
                {hasScale && (
                  <button
                    type="button"
                    onClick={() => setShowScale((s) => !s)}
                    aria-pressed={showScale}
                    className={cn(
                      "h-7 px-3 text-[10px] uppercase tracking-[0.22em] border transition-colors flex-shrink-0",
                      showScale
                        ? "border-charcoal text-charcoal bg-charcoal/[0.04]"
                        : "border-charcoal/25 text-charcoal/65 hover:border-charcoal/60 hover:text-charcoal",
                    )}
                  >
                    {showScale ? "Hide Scale" : "Show Scale"}
                  </button>
                )}
              </div>

              {/* Row 2: specs + CTA */}
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
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
                <button
                  onClick={() => inquiry.toggle(product.id)}
                  className="btn-inquiry"
                  data-active={inInquiry || undefined}
                >
                  <span>{inInquiry ? "ADDED TO INQUIRY" : "ADD TO INQUIRY"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function formatInches(n: number): string {
  return Number.isInteger(n) ? `${n}″` : `${n.toFixed(1)}″`;
}

function SpecCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span
        className="uppercase text-charcoal/45"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        {label}
      </span>
      <span className="text-[12px] text-charcoal leading-snug">{value}</span>
    </div>
  );
}
