// Variant configurator — the public face of the family board.
//
// Renders ONLY when the family has a declared option axis (`optionName`) and
// at least two labelled variants. Every other tile keeps today's plain photo
// gallery, so this is a per-family gate rather than a catalog-wide flip.
//
// Selection is a URL search param (`?v=`), so a chosen size is shareable and
// survives a reload.

import { cn } from "@/lib/utils";
import type { CollectionProduct } from "@/lib/phase3-catalog";

export type ProductVariant = NonNullable<CollectionProduct["variants"]>[number];

/** Stable, human-readable key for `?v=`. Falls back to the row id. */
export function variantKey(v: ProductVariant): string {
  const label = (v.label ?? "").trim();
  if (!label) return String(v.id);
  return label
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Variants eligible for chips: labelled, de-duplicated, order preserved. */
export function configurableVariants(product: CollectionProduct): ProductVariant[] {
  if (!product.optionName) return [];
  const seen = new Set<string>();
  const out: ProductVariant[] = [];
  for (const v of product.variants ?? []) {
    if (!(v.label ?? "").trim()) continue;
    const k = variantKey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.length > 1 ? out : [];
}

export function resolveVariant(
  product: CollectionProduct,
  key: string | undefined,
): ProductVariant | null {
  const list = configurableVariants(product);
  if (list.length === 0) return null;
  const hit = key ? list.find((v) => variantKey(v) === key) : undefined;
  return hit ?? list.find((v) => v.isLead) ?? list[0] ?? null;
}

export function VariantConfigurator({
  optionName,
  variants,
  selected,
  onSelect,
}: {
  optionName: string;
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (v: ProductVariant) => void;
}) {
  if (variants.length < 2) return null;

  return (
    <div className="mb-10">
      <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
        {optionName}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={optionName}>
        {variants.map((v) => {
          const isActive = selected ? variantKey(selected) === variantKey(v) : false;
          return (
            <button
              key={variantKey(v)}
              type="button"
              onClick={() => onSelect(v)}
              aria-pressed={isActive}
              className={cn(
                "px-4 py-2 text-[10px] tracking-[0.22em] uppercase border transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/25 text-foreground/75 hover:border-foreground/60 hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
