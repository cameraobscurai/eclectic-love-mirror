import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct, CategoryFacet } from "@/lib/phase3-catalog";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";

interface CategoryOverviewProps {
  facets: CategoryFacet[];
  productsByCategory: Record<string, CollectionProduct[]>;
  onSelectCategory: (slug: string) => void;
  onOpenProduct: (id: string) => void;
  onImageFailed: (id: string) => void;
}

const PREVIEW_COUNT = 4;

export function CategoryOverview({
  facets,
  productsByCategory,
  onSelectCategory,
  onOpenProduct,
  onImageFailed,
}: CategoryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-16">
      {facets.map((facet, sectionIdx) => {
        const items = (productsByCategory[facet.slug] ?? []).slice(0, PREVIEW_COUNT);
        if (items.length === 0) return null;

        return (
          <motion.section
            key={facet.slug}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : Math.min(sectionIdx * 0.06, 0.3),
            }}
          >
            <div className="flex items-end justify-between mb-5 gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  {facet.display}
                </h2>
              </div>
              <button
                onClick={() => onSelectCategory(facet.slug)}
                className="flex-shrink-0 text-xs uppercase tracking-[0.2em] text-charcoal/70 hover:text-charcoal underline underline-offset-4 transition-colors"
              >
                View all {facet.display.toLowerCase()} →
              </button>
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 lg:gap-4">
              {items.map((p, i) => (
                <PreviewTile
                  key={p.id}
                  product={p}
                  // First section's first row is closest to fold — load eagerly.
                  eager={sectionIdx === 0 && i < 4}
                  onOpen={() => onOpenProduct(p.id)}
                  onImageFailed={() => onImageFailed(p.id)}
                />
              ))}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}

interface PreviewTileProps {
  product: CollectionProduct;
  eager: boolean;
  onOpen: () => void;
  onImageFailed: () => void;
}

function PreviewTile({ product, eager, onOpen, onImageFailed }: PreviewTileProps) {
  const [loaded, setLoaded] = useState(false);
  const img = product.primaryImage;
  const src = img ? withCdnWidth(img.url, 600) : null;
  const srcSet = img ? buildCdnSrcSet(img.url, [400, 600, 900]) || undefined : undefined;

  return (
    <li>
      <button
        onClick={onOpen}
        className="group block w-full text-left"
      >
        <div className="aspect-square bg-white overflow-hidden relative">
          {/* Quiet skeleton — pure white. Holds the slot until the image
              decodes, then cross-fades. No grey block, no shimmer. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-white"
            style={{
              opacity: loaded || !src ? 0 : 1,
              transition: "opacity 240ms ease-out",
            }}
          />
          {src ? (
            <img
              src={src}
              srcSet={srcSet}
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
              alt={img!.altText ?? product.title}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              {...({ fetchPriority: eager ? "high" : "auto" } as Record<string, string>)}
              onLoad={() => setLoaded(true)}
              onError={onImageFailed}
              className="w-full h-full object-cover will-change-opacity group-hover:scale-[1.03]"
              style={{
                opacity: loaded ? 1 : 0,
                transition: "opacity 320ms ease-out, transform 500ms ease-out",
              }}
            />
          ) : null}
        </div>
        <p className="mt-2 text-sm text-charcoal/85 leading-snug line-clamp-2">
          {product.title}
        </p>
      </button>
    </li>
  );
}
