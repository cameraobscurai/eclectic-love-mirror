import { motion, useReducedMotion } from "framer-motion";
import type { CollectionProduct, CategoryFacet } from "@/lib/phase3-catalog";

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
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-charcoal/50">
                  {facet.count} {facet.count === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <button
                onClick={() => onSelectCategory(facet.slug)}
                className="flex-shrink-0 text-xs uppercase tracking-[0.2em] text-charcoal/70 hover:text-charcoal underline underline-offset-4 transition-colors"
              >
                View all {facet.display.toLowerCase()} →
              </button>
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 lg:gap-4">
              {items.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onOpenProduct(p.id)}
                    className="group block w-full text-left"
                  >
                    <div className="aspect-square bg-white overflow-hidden">
                      {p.primaryImage ? (
                        <img
                          src={p.primaryImage.url}
                          alt={p.primaryImage.altText ?? p.title}
                          loading="lazy"
                          decoding="async"
                          onError={() => onImageFailed(p.id)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-charcoal/85 leading-snug line-clamp-2">
                      {p.title}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}
