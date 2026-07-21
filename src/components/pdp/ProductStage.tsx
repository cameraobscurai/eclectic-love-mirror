// ProductStage — clean aligned PDP image layout.
//
// Industry-standard editorial e-commerce pattern:
//   • Hero image in a fixed-width frame (capped at 560px, 4:3 landscape mat).
//   • Thumbnails render in a single aligned row beneath the hero, sharing
//     the exact same container width. Grid columns = secondary count
//     (max 4), so 1 alt shot is one wide tile, 2 alt shots split evenly,
//     etc. Everything lines up flush left/right with the hero.
//   • Click any tile to open the lightbox.
//   • The stage never re-measures per image. Thumbnail swaps must not resize
//     the whole media group.

import { useEffect, useState } from "react";
import { withCdnWidth } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  product: CollectionProduct;
  className?: string;
  onOpenLightbox?: (index: number) => void;
}

const MAX_STAGE_W = 560;

export function ProductStage({ product, className, onOpenLightbox }: Props) {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.primaryImage
        ? [product.primaryImage]
        : [];

  // Active image drives the hero viewport. Clicking any thumbnail swaps it in.
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx] ?? images[0];

  useEffect(() => {
    setActiveIdx(0);
  }, [product.id]);

  const heroName = `hero-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  // Thumbnails: show ALL images (including primary) so users can always
  // return to the first shot after browsing alternates.
  const thumbCols = Math.min(Math.max(images.length, 1), 4);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="w-full flex flex-col gap-4 md:gap-6"
        style={{ maxWidth: MAX_STAGE_W }}
      >
        {/* HERO — 4:3 landscape mat fits wide furniture cutouts. */}
        <button
          type="button"
          onClick={() => onOpenLightbox?.(activeIdx)}
          disabled={!active || !onOpenLightbox}
          aria-label={
            active ? `Open ${product.title} in fullscreen` : undefined
          }
          className={cn(
            "group/hero relative w-full bg-[#f9f9f9] aspect-[4/3]",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
            onOpenLightbox && active ? "cursor-zoom-in" : "cursor-default",
          )}
        >
          {active ? (
            <img
              key={active.url}
              data-pdp-hero-img
              src={withCdnWidth(active.url, 1200)}
              alt={active.altText ?? product.title}
              className={cn(
                "absolute inset-0 w-full h-full object-contain",
                "p-6 md:p-8",
                "transition-transform duration-500 ease-out",
                "group-hover/hero:scale-[1.02]",
              )}
              style={activeIdx === 0 ? { viewTransitionName: heroName } : undefined}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.24em] text-charcoal/40">
              No image
            </div>
          )}
        </button>

        {/* THUMBNAIL ROW — click to swap hero. Includes primary so users can return. */}
        {images.length > 1 && (
          <div
            className="grid gap-4 md:gap-6"
            style={{
              gridTemplateColumns: `repeat(${thumbCols}, minmax(0, 1fr))`,
            }}
          >
            {images.map((im, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={im.url + i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  onDoubleClick={() => onOpenLightbox?.(i)}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-pressed={isActive}
                  className={cn(
                    "group/alt relative bg-[#f9f9f9] aspect-square cursor-pointer",
                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                    "transition-opacity duration-200",
                    "after:absolute after:inset-0 after:pointer-events-none after:transition-colors",
                    isActive
                      ? "after:ring-1 after:ring-inset after:ring-charcoal/60 after:[--tw:_] after:shadow-none"
                      : "opacity-70 hover:opacity-100",
                  )}
                  style={
                    isActive
                      ? { boxShadow: "inset 0 0 0 1px rgba(26,26,26,0.6)" }
                      : undefined
                  }
                >
                  <img
                    src={withCdnWidth(im.url, 600)}
                    alt={im.altText ?? `${product.title} — view ${i + 1}`}
                    className={cn(
                      "absolute inset-0 w-full h-full object-contain p-3 md:p-4",
                      "transition-transform duration-500 ease-out",
                      "group-hover/alt:scale-[1.02]",
                    )}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
