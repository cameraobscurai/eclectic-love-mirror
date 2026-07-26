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
  "lighting",
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