// ProductStage — clean aligned PDP image layout.
//
// Industry-standard editorial e-commerce pattern:
//   • Hero image in a fixed-width frame (capped at 560px, 4:3 landscape mat).
//   • Thumbnails render in a single aligned row beneath the hero, sharing
//     the exact same container width. Grid columns = secondary count
//     (max 4), so 1 alt shot is one wide tile, 2 alt shots split evenly,
//     etc. Everything lines up flush left/right with the hero.
//   • Click any tile to open the lightbox.
//   • Never upscales past the source's natural width.

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

  const [primary, ...secondary] = images;

  const [naturalW, setNaturalW] = useState<number | null>(null);
  useEffect(() => {
    setNaturalW(null);
  }, [product.id]);

  const heroName = `hero-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  // Thumbnails: cap at 4 per row so tiles stay legible. If more than 4
  // secondaries, they wrap into a second aligned row.
  const thumbCols = Math.min(Math.max(secondary.length, 1), 4);

  const stageMaxW = naturalW
    ? `min(${MAX_STAGE_W}px, ${naturalW}px)`
    : `${MAX_STAGE_W}px`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="w-full flex flex-col gap-4 md:gap-6"
        style={{ maxWidth: stageMaxW }}
      >
        {/* HERO — 4:3 landscape mat fits wide furniture cutouts. */}
        <button
          type="button"
          onClick={() => onOpenLightbox?.(0)}
          disabled={!primary || !onOpenLightbox}
          aria-label={
            primary ? `Open ${product.title} in fullscreen` : undefined
          }
          className={cn(
            "group/hero relative w-full bg-[#f9f9f9] aspect-[4/3]",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
            onOpenLightbox && primary ? "cursor-zoom-in" : "cursor-default",
          )}
        >
          {primary ? (
            <img
              data-pdp-hero-img
              src={withCdnWidth(primary.url, 1200)}
              alt={primary.altText ?? product.title}
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth) setNaturalW(el.naturalWidth);
              }}
              className={cn(
                "absolute inset-0 w-full h-full object-contain",
                "p-6 md:p-8",
                "transition-transform duration-500 ease-out",
                "group-hover/hero:scale-[1.02]",
              )}
              style={{ viewTransitionName: heroName }}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.24em] text-charcoal/40">
              No image
            </div>
          )}
        </button>

        {/* THUMBNAIL ROW — aligned flush with hero, equal-width tiles. */}
        {secondary.length > 0 && (
          <div
            className="grid gap-4 md:gap-6"
            style={{
              gridTemplateColumns: `repeat(${thumbCols}, minmax(0, 1fr))`,
            }}
          >
            {secondary.map((im, i) => (
              <button
                key={im.url + i}
                type="button"
                onClick={() => onOpenLightbox?.(i + 1)}
                aria-label={`View image ${i + 2} of ${images.length}`}
                className={cn(
                  "group/alt relative bg-[#f9f9f9] aspect-square",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                  onOpenLightbox ? "cursor-zoom-in" : "cursor-default",
                )}
              >
                <img
                  src={withCdnWidth(im.url, 600)}
                  alt={im.altText ?? `${product.title} — view ${i + 2}`}
                  className={cn(
                    "absolute inset-0 w-full h-full object-contain p-3 md:p-4",
                    "transition-transform duration-500 ease-out",
                    "group-hover/alt:scale-[1.02]",
                  )}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
