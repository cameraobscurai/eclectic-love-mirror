import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import catalog from "@/data/inventory/current_catalog.json";
import { useInquiry } from "@/hooks/use-inquiry";

interface CatalogProduct {
  id: number | string;
  slug: string;
  title?: string;
  primaryImage?: { url?: string } | null;
  categorySlug?: string;
}

const PRODUCTS = (catalog as unknown as { products: CatalogProduct[] }).products;
const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

interface ShopTheLookRailProps {
  slugs: string[];
}

export function ShopTheLookRail({ slugs }: ShopTheLookRailProps) {
  const { has, toggle } = useInquiry();
  const items = useMemo(
    () => slugs.map((s) => BY_SLUG.get(s)).filter(Boolean) as CatalogProduct[],
    [slugs]
  );
  if (items.length === 0) return null;

  return (
    <div className="mt-8 -mx-8 lg:-mx-12 px-8 lg:px-12 pt-6 border-t border-cream/10">
      <p className="text-[10px] uppercase tracking-[0.32em] text-cream/45 mb-4">
        SHOP THE LOOK
      </p>
      <ul className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2 snap-x">
        {items.map((p) => {
          const selected = has(String(p.id));
          return (
            <li key={p.id} className="shrink-0 w-[112px] snap-start">
              <a
                href={`/collection/${p.slug}`}
                className="block aspect-[3/4] bg-[color-mix(in_oklab,var(--cream)_6%,var(--charcoal))] overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
              >
                {p.primaryImage?.url && (
                  <img
                    src={p.primaryImage.url}
                    alt={p.title ?? p.slug}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </a>
              <button
                type="button"
                onClick={() => toggle(String(p.id))}
                aria-pressed={selected}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-cream/65 hover:text-cream focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 transition-colors"
              >
                {selected ? (
                  <>
                    <Check className="h-3 w-3" /> ADDED
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" /> INQUIRE
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
