const CATEGORY_ALIASES: Record<string, string> = {
  // Current catalog slugs are canonical; legacy/import slugs map into them so
  // sizing rules cannot silently miss products after a bake/import path change.
  lounge: "seating",
  "sofas-loveseats1": "seating",
  "chairs-stools1": "seating",
  "benches-ottomans1": "seating",

  "tables1": "tables",
  "lounge-tables": "tables",
  dining: "tables",

  "cocktail-bar": "bars",
  light: "lighting",
  storage1: "storage",
  textiles: "pillows-throws",
  "pillows-throws1": "pillows-throws",
  accents1: "styling",
};

export function canonicalCategorySlug(categorySlug: string | null | undefined): string | null {
  if (!categorySlug) return null;
  return CATEGORY_ALIASES[categorySlug] ?? categorySlug;
}

const FLOOR_ANCHORED_CATEGORIES = new Set([
  "seating",
  "tables",
  "bars",
  // lighting hangs — it must never be floor-anchored, that is what produced the
  // giant dead space above short pendants.
  "large-decor",
  "storage",
]);

export function isFloorAnchoredCategory(categorySlug: string | null | undefined): boolean {
  const canonical = canonicalCategorySlug(categorySlug);
  return canonical ? FLOOR_ANCHORED_CATEGORIES.has(canonical) : false;
}

export function isSeatingCategory(categorySlug: string | null | undefined): boolean {
  return canonicalCategorySlug(categorySlug) === "seating";
}
/**
 * The shelf a product is *displayed* on.
 *
 * Sizing must be solved against the neighbours a shopper actually sees. Some
 * rows are filed under one category (`categorySlug: "tables"`) but surfaced on
 * another page (`liveCategory: "cocktail-bar"`). Solving those against their
 * filing category put them on a different inches-per-tile-unit than every tile
 * beside them — e.g. ELISE (40"Dia x 43"H) rendered ~2.5x a 33" bar cart.
 */
export function shelfCategorySlug(product: {
  liveCategory?: string | null;
  categorySlug?: string | null;
}): string | null {
  return (
    canonicalCategorySlug(product.liveCategory) ??
    canonicalCategorySlug(product.categorySlug)
  );
}
