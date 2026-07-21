// ProductStage — editorial PDP hero.
//
// Composition matches the selected "Asymmetric grid" direction:
//   • Primary image capped at max-w-[600px], 4:5 portrait frame, cream mat.
//   • Secondary images render in a 2-col grid beneath (alt shots without
//     competing for scale). Only rendered when images.length > 1.
//   • Click either the primary or a secondary tile to open the lightbox
//     (parent handles that via onOpenLightbox).
//   • Never upscales past the source image's natural width.
//
// The active <img> carries data-pdp-hero-img so the tile→PDP View
// Transition morph can target it.

import { useEffect, useState } from "react";
import { withCdnWidth } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  product: CollectionProduct;
  className?: string;
  onOpenLightbox?: (index: number) => void;
}

export function ProductStage({ product, className, onOpenLightbox }: Props) {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.primaryImage
        ? [product.primaryImage]
        : [];

  const [primary, ...secondary] = images;

  // Track natural width of the primary image so we can cap upscale.
  const [naturalW, setNaturalW] = useState<number | null>(null);
  useEffect(() => {
    setNaturalW(null);
  }, [product.id]);

  const heroName = `hero-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <div className={cn("flex flex-col gap-8 lg:gap-12", className)}>
      {/* PRIMARY STAGE — capped at 600px, 4:5 mat, click to zoom. */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onOpenLightbox?.(0)}
          disabled={!primary || !onOpenLightbox}
          aria-label={
            primary ? `Open ${product.title} in fullscreen` : undefined
          }
          className={cn(
            "group/hero relative w-full bg-[#f9f9f9] aspect-[4/5]",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
            onOpenLightbox && primary ? "cursor-zoom-in" : "cursor-default",
          )}
          style={{
            maxWidth: naturalW ? `min(600px, ${naturalW}px)` : 600,
          }}
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
                "p-6 md:p-10",
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
      </div>

      {/* SECONDARY GRID — only when >1 image. Two columns, contained shots. */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {secondary.map((im, i) => (
            <button
              key={im.url + i}
              type="button"
              onClick={() => onOpenLightbox?.(i + 1)}
              aria-label={`View image ${i + 2} of ${images.length}`}
              className={cn(
                "group/alt relative bg-[#f9f9f9] aspect-[4/5]",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
                onOpenLightbox ? "cursor-zoom-in" : "cursor-default",
              )}
            >
              <img
                src={withCdnWidth(im.url, 800)}
                alt={im.altText ?? `${product.title} — view ${i + 2}`}
                className={cn(
                  "absolute inset-0 w-full h-full object-contain p-4 md:p-6",
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
  );
}
