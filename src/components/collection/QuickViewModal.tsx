import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";
import { useFitToLines } from "@/hooks/use-fit-to-lines";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { parseDimensions } from "@/lib/parse-dimensions";
import { ScaleRuleWidth, ScaleRuleHeight } from "./ScaleRule";
import { withCdnWidth } from "@/lib/image-url";
import { glassBand, glassBandLightNoBottom, glassBandLightNoTop } from "@/lib/glass";

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
  const isMobile = useIsMobile();
  const canDrag = isMobile && !reduced;
  const [imgIdx, setImgIdx] = useState(0);
  const [showScale, setShowScale] = useState(false);
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [zoneSize, setZoneSize] = useState({ w: 0, h: 0 });
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  // Parse W / D / H once per product. Toggle is offered whenever ANY axis
  // (width, height, or diameter) parses confidently — silent fallback for
  // pieces with no dimensions in the catalog.
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

  // Track the measurement zone's actual rendered size so we can compute the
  // image's contained-fit footprint (object-contain leaves empty gutters
  // we need to subtract before drawing rules).
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setZoneSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute the rendered image box inside the zone given object-contain.
  // This is the actual furniture footprint — what the rules should wrap.
  const imageBox = useMemo(() => {
    if (!imgNatural || zoneSize.w === 0 || zoneSize.h === 0) return null;
    const zoneAR = zoneSize.w / zoneSize.h;
    const imgAR = imgNatural.w / imgNatural.h;
    let w: number, h: number;
    if (imgAR > zoneAR) {
      // image is wider than zone — pinned to width
      w = zoneSize.w;
      h = zoneSize.w / imgAR;
    } else {
      // image is taller — pinned to height
      h = zoneSize.h;
      w = zoneSize.h * imgAR;
    }
    // object-bottom: image sits at the bottom of the zone, centered horizontally
    const left = (zoneSize.w - w) / 2;
    const top = zoneSize.h - h;
    return { left, top, width: w, height: h };
  }, [imgNatural, zoneSize]);

  // Title sits behind the image at top-left. Width capped at 78% of the stage
  // so it never reaches under the measurement zone. Visual ceiling is also
  // capped by character count — short names ("Lyon Stool") shouldn't explode
  // to display-billboard size, long names ("Hadley Velvet Arm Chair") get
  // the full 92px.
  const titleMaxWidth = stageWidth > 0 ? stageWidth * 0.78 - 16 : 0;
  const titleMaxPx = product.title.trim().length < 14 ? 72 : 92;
  const fittedSize = useFitToLines({
    text: product.title,
    maxWidth: titleMaxWidth,
    family: "Cormorant",
    weight: 400,
    minPx: 28,
    maxPx: titleMaxPx,
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

  // Inert + aria-hide background <main> while modal is open. `inert` is the
  // 2023+ standard replacement for manual focus traps; aria-hidden mirrors
  // it for older AT. Cleanup runs on unmount, so navigating between
  // products (which keeps the modal open) doesn't flicker.
  useEffect(() => {
    const main = document.querySelector("main[data-collection-main]");
    if (!main) return undefined;
    main.setAttribute("inert", "");
    main.setAttribute("aria-hidden", "true");
    return () => {
      main.removeAttribute("inert");
      main.removeAttribute("aria-hidden");
    };
  }, []);

  const img = product.images[imgIdx] ?? product.primaryImage;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-6"
    >
      {/* Frosted scrim — dark glass, deeper blur for depth parity with the
          home band. The collection grid behind ghosts through. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="absolute inset-0 bg-charcoal/40"
        style={{
          backdropFilter: "blur(20px) saturate(1.05) brightness(0.92)",
          WebkitBackdropFilter: "blur(20px) saturate(1.05) brightness(0.92)",
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* White stage — exhibition surface, now a frosted plate so the archive
          ghosts through the chrome (top bar + footer). The image inside the
          stage's middle row sits on its own near-opaque white field, so
          product photography reads identically.
          Mobile: drag-to-dismiss (iOS sheet pattern). Desktop: static modal. */}
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: reduced ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        drag={canDrag ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={canDrag ? { top: 0, bottom: 0.4 } : 0}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (!canDrag) return;
          if (info.offset.y > 140 || info.velocity.y > 500) onClose();
        }}
        className="relative w-full h-[100dvh] md:h-[88dvh] md:max-h-[880px] md:max-w-[1280px] md:[zoom:0.75] text-charcoal shadow-2xl overflow-hidden grid grid-rows-[auto_minmax(0,1fr)_auto] md:rounded-none rounded-t-2xl"
        style={{
          touchAction: canDrag ? "pan-y" : undefined,
          // Stage panel: 92% white so the grid only ghosts faintly through
          // the chrome rows; product imagery in the middle row stays crisp.
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px) saturate(1.05)",
          WebkitBackdropFilter: "blur(14px) saturate(1.05)",
        }}
      >
        {/* Mobile drag handle pill — visual affordance for swipe-to-dismiss */}
        {canDrag && (
          <div
            className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-10 h-1 w-10 bg-charcoal/15 rounded-full"
            aria-hidden
          />
        )}
        {/* TOP BAR — eyebrow left, nav right. Frosted strip with bottom hairline. */}
        <div
          className="flex items-center justify-between px-6 md:px-10 pt-6 md:pt-7 pb-3"
          style={glassBandLightNoTop}
        >
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
          className="relative min-h-0 overflow-hidden bg-white flex flex-col md:block"
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

          {/* MEASUREMENT ZONE — the formal frame the furniture sits inside.
              Same envelope across every piece (sofa, lamp, chair, accessory).
              The image fills the zone via object-contain. The scale rules,
              when toggled on, attach to the zone's own edges — width rule
              flush to the bottom edge, height rule flush to the right edge —
              so they wrap the actual furniture region, not the empty stage. */}
          <div className="relative md:absolute md:inset-0 z-10 flex-1 md:flex-initial flex items-end justify-center px-6 md:px-16 pt-2 md:pt-[14%] pb-6 md:pb-14 pointer-events-none">
            <div
              ref={zoneRef}
              className="relative w-full max-w-[78%] md:max-w-[52%] h-full max-h-[62%]"
            >
              <AnimatePresence mode="wait">
                {img ? (
                  <motion.img
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
                    className="absolute inset-0 w-full h-full object-contain object-bottom drop-shadow-[0_18px_28px_rgba(26,26,26,0.10)]"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-charcoal/30">
                    No image
                  </div>
                )}
              </AnimatePresence>

              {/* Scale rules — bound to the actual rendered image footprint
                  (computed from naturalWidth/Height + object-contain math),
                  not the zone envelope. The rules wrap the furniture itself. */}
              <AnimatePresence>
                {showScale && hasScale && imageBox && dims.width !== null && (
                  <motion.div
                    key="scale-width"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.18 }}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${imageBox.left}px`,
                      width: `${imageBox.width}px`,
                      top: `${imageBox.top + imageBox.height + 10}px`,
                    }}
                  >
                    <ScaleRuleWidth inches={dims.width} />
                  </motion.div>
                )}
                {showScale && hasScale && imageBox && dims.height !== null && (
                  <motion.div
                    key="scale-height"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.22 }}
                    className="absolute pointer-events-none"
                    style={{
                      top: `${imageBox.top}px`,
                      height: `${imageBox.height}px`,
                      left: `${imageBox.left + imageBox.width + 10}px`,
                    }}
                  >
                    <ScaleRuleHeight inches={dims.height} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>


        {/* FOOTER — thumbs · dimensions · stocked · CTA. Frosted strip with
            top hairline; symmetric framing with the top bar. */}
        <div
          style={{
            ...glassBandLightNoBottom,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="px-6 md:px-10 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-10 items-center">
            {/* Thumbs — all visible, horizontal scroll with soft fade edge,
                quiet counter in the typographic register. */}
            <div className="order-2 md:order-1 flex items-center gap-4 min-w-0">
              {product.images.length > 1 ? (
                <>
                  <div
                    className="relative min-w-0"
                    style={{
                      maskImage:
                        "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)",
                    }}
                  >
                    <div
                      className="flex gap-2 overflow-x-auto snap-x snap-mandatory pr-7 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {product.images.map((im, i) => (
                        <button
                          key={im.url}
                          onClick={() => setImgIdx(i)}
                          aria-label={`View image ${i + 1} of ${product.images.length}`}
                          aria-current={i === imgIdx}
                          className={cn(
                            "relative h-12 w-16 flex-shrink-0 snap-start bg-white/60 border transition-colors active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                            i === imgIdx
                              ? "border-charcoal"
                              : "border-charcoal/15 hover:border-charcoal/45",
                          )}
                        >
                          <img
                            src={withCdnWidth(im.url, 300)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain p-1"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="hidden sm:inline-block flex-shrink-0 text-[10px] uppercase tracking-[0.28em] text-charcoal/55 tabular-nums"
                  >
                    {String(imgIdx + 1).padStart(2, "0")}
                    <span className="mx-1.5 text-charcoal/30">/</span>
                    {String(product.images.length).padStart(2, "0")}
                  </span>
                </>
              ) : (
                <div className="h-12 w-16" aria-hidden />
              )}
            </div>

            {/* Spec columns */}
            <div className="order-3 md:order-2 flex flex-wrap items-end gap-x-10 gap-y-3 md:border-l md:border-charcoal/12 md:pl-10">
              {Array.isArray(product.variants) && product.variants.length > 1 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-charcoal/55">
                    Stocked Quantity
                  </span>
                  <ul className="text-[12px] leading-[1.55] text-charcoal/85 space-y-0.5">
                    {product.variants.map((v) => {
                      const label = String(v.title || "")
                        .replace(new RegExp(`^${(product.title || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/glassware/i, "glass")}\\s*`, "i"), "")
                        .replace(/\s+glass$/i, "")
                        .trim() || v.title;
                      return (
                        <li key={v.id} className="uppercase tracking-[0.06em]">
                          ({v.stockedQuantity || "—"}) {label}
                          {v.dimensions ? <span className="text-charcoal/55">, {v.dimensions}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <>
                  {product.dimensions && (
                    <SpecCol label="Dimensions" value={product.dimensions} />
                  )}
                  {product.stockedQuantity && (
                    <SpecCol label="Stocked" value={product.stockedQuantity} />
                  )}
                  {product.isCustomOrder && !product.stockedQuantity && (
                    <SpecCol label="Availability" value="Custom order" />
                  )}
                </>
              )}
              {hasScale && (
                <button
                  type="button"
                  onClick={() => setShowScale((s) => !s)}
                  aria-pressed={showScale}
                  className={cn(
                    "self-end h-7 px-3 text-[10px] uppercase tracking-[0.28em] border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                    showScale
                      ? "border-charcoal text-charcoal bg-charcoal/[0.04]"
                      : "border-charcoal/25 text-charcoal/65 hover:border-charcoal/60 hover:text-charcoal",
                  )}
                >
                  {showScale ? "Hide Scale" : "Show Scale"}
                </button>
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
    </div>,
    document.body,
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
