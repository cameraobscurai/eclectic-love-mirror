import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";

import { useIsMobile } from "@/hooks/use-mobile";
import type { CollectionProduct } from "@/lib/phase3-catalog";


import { withCdnWidth } from "@/lib/image-url";
import { glassBand, glassBandLightNoBottom, glassBandLightNoTop } from "@/lib/glass";
import { analytics } from "@/lib/analytics";

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
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [zoneSize, setZoneSize] = useState({ w: 0, h: 0 });
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  // Match an image to a variant by filename heuristic — numeric ("AKOYA 7.png" → 7"
  // variant) then distinguishing-token match (Fork/Knife/Bowl/etc.). Distinguishing
  // = tokens that appear in this variant's title but not in every other variant.
  // Score-based so the strongest match wins on filenames that contain partial
  // tokens shared across variants.
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const familyToken = (product.title ?? "").split(/\s+/)[0] ?? "";

  const variantTokens = useMemo(() => {
    const stripFamily = (t: string) =>
      t.replace(new RegExp("^" + familyToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
        .trim()
        .toUpperCase();
    const all = variants.map((v) => {
      const tail = stripFamily(v.title ?? "");
      const toks = tail.split(/\s+/).filter((t) => t.length >= 2 && !/["\d.]/.test(t));
      return { id: v.id, tokens: toks };
    });
    // Distinguishing = token not present in EVERY other variant
    return all.map(({ id, tokens }) => {
      const others = all.filter((o) => o.id !== id);
      const distinguishing = tokens.filter(
        (t) => !others.every((o) => o.tokens.includes(t)),
      );
      return { id, tokens, distinguishing };
    });
  }, [variants, familyToken]);

  function matchVariant(img: { url: string } | null | undefined) {
    if (!img || variants.length === 0) return null;
    const fname = decodeURIComponent(img.url.split("/").pop() ?? "").toUpperCase();
    // Numeric size match wins outright
    const numMatch = fname.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const v = variants.find((vv) => vv.title?.includes(`${numMatch[1]}"`));
      if (v) return v;
    }
    // Score by distinguishing tokens present in filename
    let best: { v: typeof variants[number]; score: number } | null = null;
    for (const v of variants) {
      const meta = variantTokens.find((m) => m.id === v.id);
      if (!meta || meta.distinguishing.length === 0) continue;
      const hit = meta.distinguishing.filter((t) => fname.includes(t)).length;
      if (hit === 0) continue;
      // Require all distinguishing tokens present (full match) OR a single
      // distinguishing token that is unique to this variant.
      const full = hit === meta.distinguishing.length;
      const score = full ? hit + 1 : hit;
      if (!best || score > best.score) best = { v, score };
    }
    return best?.v ?? null;
  }

  // Find first image that maps to a given variant. Memoized lookup so the
  // variant list and chips don't recompute O(n*m) per render.
  const variantImageIdx = useMemo(() => {
    const map = new Map<string, number>();
    // 1. Direct URL match — variants baked with `imageUrl` (the variant's own
    //    primary image) win over filename heuristics. This makes recently
    //    touched flatware/glassware sets (Midas, Donaver, Adonis, Sage, …)
    //    map cleanly even when filenames are opaque ("ChatGPT Image …png").
    const urlIndex = new Map<string, number>();
    product.images.forEach((im, i) => {
      if (im?.url && !urlIndex.has(im.url)) urlIndex.set(im.url, i);
    });
    for (const v of variants) {
      const url = (v as { imageUrl?: string | null }).imageUrl;
      if (url && urlIndex.has(url)) map.set(v.id, urlIndex.get(url)!);
    }
    // 2. Filename heuristic fallback for variants without a baked imageUrl.
    product.images.forEach((im, i) => {
      const v = matchVariant(im);
      if (v && !map.has(v.id)) map.set(v.id, i);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.images, variants, variantTokens]);

  // The "set" image — family group shot (e.g. "AKOYA+Set.png") that doesn't
  // map to any individual variant. First image with no variant match wins.
  // Surfaced as its own row in the rail.
  const setImageIdx = useMemo(() => {
    const i = product.images.findIndex((im) => matchVariant(im) === null);
    return i >= 0 ? i : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.images, variantTokens]);

  // Selection: 'set' for the family shot, a variant id for a specific piece,
  // or null (defer to whatever the current image maps to).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const imgFromIdx = product.images[imgIdx] ?? product.primaryImage;
  const imageDerivedVariant = matchVariant(imgFromIdx);

  const selectedVariant =
    selectedKey === "set"
      ? null
      : variants.find((v) => v.id === selectedKey) ?? imageDerivedVariant ?? null;

  const activeImg = imgFromIdx;
  const activeVariant = selectedVariant;
  const activeDimensions = activeVariant?.dimensions ?? product.dimensions;
  const isSetActive = selectedKey === "set" || (selectedKey === null && imageDerivedVariant === null);

  function selectSet() {
    setSelectedKey("set");
    if (setImageIdx !== null) setImgIdx(setImageIdx);
  }
  function selectVariant(variantId: string) {
    setSelectedKey(variantId);
    const idx = variantImageIdx.get(variantId);
    if (typeof idx === "number") setImgIdx(idx);
  }

  // Thumbs-scroll affordance — show prev/next chips when overflowing on desktop.
  const thumbsScrollerRef = useRef<HTMLDivElement>(null);
  const [thumbsOverflow, setThumbsOverflow] = useState({ left: false, right: false });
  useEffect(() => {
    const el = thumbsScrollerRef.current;
    if (!el) return;
    const update = () => {
      setThumbsOverflow({
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
  }, [product.id, product.images.length]);
  function nudgeThumbs(dir: -1 | 1) {
    const el = thumbsScrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  }

  useEffect(() => {
    setImgIdx(0);
    setSelectedKey(null);
    // Note: showScale intentionally NOT reset — owner wants it to persist
    // when navigating between products with similar scale needs.
    // Fire GA4 product_viewed for each product the user opens (or pages to
    // via prev/next inside the modal).
    analytics.productViewed({
      id: product.id,
      name: product.title,
      category: product.displayCategory ?? null,
    });
  }, [product.id, product.title, product.displayCategory]);

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


  // Title is now small and inline — no fit-to-lines billboard.


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && !lightboxOpen) onPrev();
      else if (e.key === "ArrowRight" && hasNext && !lightboxOpen) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext, onClose, lightboxOpen]);

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

  const img = activeImg;

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
        className="relative w-full h-[100dvh] md:h-[86dvh] md:max-h-[860px] md:max-w-[1200px] text-charcoal shadow-2xl overflow-hidden grid grid-rows-[auto_minmax(0,1fr)] md:rounded-none rounded-t-2xl"
        style={{
          touchAction: canDrag ? "pan-y" : undefined,
          // Temporary hard reset to a pure white product stage until the new
          // non-cutout uploads are cleaned up.
          background: "#ffffff",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
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

        {/* BODY — two-column on desktop: image left, info rail right.
            Mobile stacks: image, then info. */}
        <div
          ref={stageRef}
          className="relative min-h-0 overflow-hidden bg-white grid grid-cols-1 md:grid-cols-[1.55fr_1fr]"
        >
          {/* IMAGE COLUMN */}
          <div className="relative min-h-0 flex items-center justify-center px-4 md:px-8 py-4 md:py-8 bg-white">
            <div
              ref={zoneRef}
              className="relative w-full h-full min-h-[42vh] md:min-h-0"
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
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(26,26,26,0.10)]"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-charcoal/30">
                    No image
                  </div>
                )}
              </AnimatePresence>

              {/* Variant label — surfaced over the image so the active piece
                  in a multi-piece set (e.g. "7\" GOBLET") is identifiable
                  without scrolling to the info rail on mobile. */}
              {activeVariant && activeVariant.title !== product.title && (
                <div className="absolute left-3 bottom-3 md:left-4 md:bottom-4 pointer-events-none">
                  <span className="inline-block px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-white bg-charcoal/70 backdrop-blur-sm">
                    {activeVariant.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* INFO RAIL — title + specs + thumbs + CTA, vertical stack. */}
          <div
            className="relative flex flex-col min-h-0 md:border-l md:border-charcoal/10 px-6 md:px-8 py-6 md:py-10 overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            {/* Title — uppercase per brand voice. When the active image maps to a
                variant, surface that variant's name as a secondary line so users
                know which piece they're viewing in a multi-piece set. */}
            <h2 className="font-display leading-[1.05] tracking-[0.04em] text-charcoal text-[26px] md:text-[34px] break-words uppercase">
              {product.title}
            </h2>
            {activeVariant && activeVariant.title !== product.title && (
              <p className="mt-2 text-[12px] uppercase tracking-[0.24em] text-charcoal/70">
                {activeVariant.title}
              </p>
            )}

            {/* Specs */}
            <div className="mt-6 md:mt-8 flex flex-col gap-5">
              {Array.isArray(product.variants) && product.variants.length > 1 ? (() => {
                const familyHero = product.primaryImage;
                 const FAMILY_WORDS = /^(flatware|glassware|glass|china|dinnerware|serveware)$/i;
                 const familyTokens = String(product.title || "").trim().split(/\s+/);
                 const rows = product.variants.map((v) => {
                  const variantTokens = String(v.title || "").trim().split(/\s+/);
                  let i = 0;
                  while (
                    i < variantTokens.length &&
                    i < familyTokens.length &&
                    variantTokens[i].toLowerCase() === familyTokens[i].toLowerCase()
                  ) {
                    i++;
                  }
                  // Drop a leading family-category word (FLATWARE/GLASS/etc.) if present
                  while (i < variantTokens.length - 1 && FAMILY_WORDS.test(variantTokens[i])) {
                    i++;
                  }
                  let label = variantTokens.slice(i).join(" ")
                    .replace(/\s+(glass|flatware)$/i, "")
                    .trim();
                  if (!label) label = v.title;
                  const targetIdx = variantImageIdx.get(v.id);
                  const chipImg =
                    typeof targetIdx === "number" ? product.images[targetIdx] : familyHero;
                  return { v, label, targetIdx, chipImg, hasOwnImage: typeof targetIdx === "number" };
                });
                const anyLabel = rows.some((r) => r.label && r.label.trim() !== "");
                const anyDims = rows.some((r) => !!r.v.dimensions);
                const heading = anyLabel ? "Configurations" : anyDims ? "Sizes" : "Stocked Quantity";
                return (
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-charcoal/80 font-medium">
                      {heading}
                    </span>
                    <ul className="text-[14px] leading-[1.45] text-charcoal flex flex-col gap-1">
                      {/* SET row — the family group shot, distinct from any
                          single variant. Only when a set image actually exists. */}
                      {setImageIdx !== null && (() => {
                        const setImg = product.images[setImageIdx];
                        return (
                          <li>
                            <button
                              type="button"
                              onClick={selectSet}
                              aria-current={isSetActive}
                              className={cn(
                                "group block w-full text-left transition-colors border-l-2 pl-2 pr-2 py-1.5",
                                isSetActive
                                  ? "border-charcoal bg-charcoal/[0.04]"
                                  : "border-transparent hover:bg-charcoal/[0.03] hover:border-charcoal/30",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "shrink-0 relative h-10 w-10 bg-white border overflow-hidden",
                                    isSetActive ? "border-charcoal" : "border-charcoal/15",
                                  )}
                                  aria-hidden
                                >
                                  {setImg && (
                                    <img
                                      src={withCdnWidth(setImg.url, 200)}
                                      alt=""
                                      className="absolute inset-0 w-full h-full object-contain p-1"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  )}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "shrink-0 inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 text-[11px] tracking-[0.08em] tabular-nums transition-colors",
                                        isSetActive
                                          ? "bg-charcoal text-cream"
                                          : "bg-charcoal/[0.06] text-charcoal/80",
                                      )}
                                    >
                                      SET
                                    </span>
                                    <span
                                      className={cn(
                                        "uppercase tracking-[0.06em] truncate",
                                        isSetActive ? "font-medium" : "",
                                      )}
                                    >
                                      Full Collection
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })()}
                      {rows.map(({ v, label, chipImg, hasOwnImage }) => {
                        const isActive = activeVariant?.id === v.id;
                        const qty = v.stockedQuantity || "—";
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={hasOwnImage ? () => selectVariant(v.id) : undefined}
                              aria-current={isActive}
                              aria-disabled={!hasOwnImage || undefined}
                              disabled={!hasOwnImage}
                              tabIndex={hasOwnImage ? undefined : -1}
                              className={cn(
                                "group block w-full text-left transition-colors border-l-2 pl-2 pr-2 py-1.5",
                                !hasOwnImage
                                  ? "border-transparent cursor-default opacity-60"
                                  : isActive
                                    ? "border-charcoal bg-charcoal/[0.04]"
                                    : "border-transparent hover:bg-charcoal/[0.03] hover:border-charcoal/30",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Image chip — blank when variant has no own image */}
                                <span
                                  className={cn(
                                    "shrink-0 relative h-10 w-10 bg-white border overflow-hidden",
                                    isActive && hasOwnImage ? "border-charcoal" : "border-charcoal/15",
                                  )}
                                  aria-hidden
                                >
                                  {hasOwnImage && chipImg && (
                                    <img
                                      src={withCdnWidth(chipImg.url, 200)}
                                      alt=""
                                      className="absolute inset-0 w-full h-full object-contain p-1"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  )}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "shrink-0 inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 text-[11px] tracking-[0.08em] tabular-nums transition-colors",
                                        isActive
                                          ? "bg-charcoal text-cream"
                                          : "bg-charcoal/[0.06] text-charcoal/80",
                                      )}
                                    >
                                      {qty}
                                    </span>
                                    <span
                                      className={cn(
                                        "uppercase tracking-[0.06em] line-clamp-2 break-words",
                                        isActive ? "font-medium" : "",
                                      )}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                  {v.dimensions ? (
                                    <div className="mt-0.5 text-[12px] text-charcoal/60 pl-[calc(2.25rem+0.5rem)]">
                                      {v.dimensions}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })() : (
                <>
                  {activeDimensions && (
                    <SpecCol label="Dimensions" value={activeDimensions} />
                  )}
                  {product.stockedQuantity && (
                    <SpecCol label="Stocked" value={product.stockedQuantity} />
                  )}
                  {product.isCustomOrder && !product.stockedQuantity && (
                    <SpecCol label="Availability" value="Custom order" />
                  )}
                </>
              )}

            </div>

            {/* Thumbs — overflow-x scroller with explicit prev/next chips when
                content extends beyond the viewport (the fade alone wasn't a strong
                enough scroll affordance for mouse users). */}
            {product.images.length > 1 && (
              <div className="mt-6 md:mt-8">
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
                    ref={thumbsScrollerRef}
                    className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-7 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                  {product.images.map((im, i) => {
                    const v = matchVariant(im);
                    const tip = v && v.title !== product.title ? v.title : (im.altText ?? "");
                    return (
                      <button
                        key={im.url}
                        onClick={() => setImgIdx(i)}
                        title={tip}
                        aria-label={`View image ${i + 1} of ${product.images.length}${tip ? ` — ${tip}` : ""}`}
                        aria-current={i === imgIdx}
                        className={cn(
                          "relative h-14 w-16 flex-shrink-0 snap-start bg-white/60 border transition-colors active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                          i === imgIdx ? "border-charcoal" : "border-charcoal/15 hover:border-charcoal/45",
                        )}
                      >
                        <img
                          src={withCdnWidth(im.url, 300)}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain p-1"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Counter + scroll chips. Counter shows whenever there are
                  multiple images so the owner always knows position; chips
                  enable when overflow exists. */}
              <div className="mt-2 flex items-center justify-between text-charcoal/70">
                <button
                  type="button"
                  onClick={() => nudgeThumbs(-1)}
                  disabled={!thumbsOverflow.left}
                  aria-label="Scroll thumbnails left"
                  className="h-7 px-2 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
                >
                  ← MORE
                </button>
                <span className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55">
                  {imgIdx + 1} / {product.images.length}
                </span>
                <button
                  type="button"
                  onClick={() => nudgeThumbs(1)}
                  disabled={!thumbsOverflow.right}
                  aria-label="Scroll thumbnails right"
                  className="h-7 px-2 text-[10px] uppercase tracking-[0.28em] disabled:opacity-25 hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
                >
                  MORE →
                </button>
              </div>
            </div>
          )}

            {/* CTA — pinned to bottom of rail */}
            <div className="mt-auto pt-8">
              <button
                onClick={() => inquiry.toggle(product.id)}
                className={cn(
                  "w-full px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] transition-all border active:scale-[0.99]",
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


      {/* Lightbox temporarily disabled — pending polish. */}
    </div>,
    document.body,
  );
}

function SpecCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] uppercase tracking-[0.24em] text-charcoal/80 font-medium">
        {label}
      </span>
      <span className="text-[16px] md:text-[17px] leading-snug text-charcoal font-medium">
        {value}
      </span>
    </div>
  );
}
