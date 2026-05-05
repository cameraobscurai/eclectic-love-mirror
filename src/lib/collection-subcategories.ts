/**
 * Derived UI taxonomy for collection subcategories.
 *
 * Non-destructive: this module does NOT mutate phase3_catalog.json,
 * does NOT change product records, and does NOT affect publicReady counts.
 * It computes display-only subcategory groupings from product title/category
 * at runtime so the filter UI can group items more usefully than the raw
 * catalog `subcategory` field allows.
 *
 * Rules are keyword-based on `title` (case-insensitive). First matching rule
 * wins, in declaration order. Categories not listed below have no derived
 * subcategories — `getSubcategoryOptions` will return only the implicit
 * "All" entry, and the UI should hide the sub row entirely in that case.
 */

import type { CollectionProduct } from "./phase3-catalog";

export interface SubcategoryRule {
  id: string;
  label: string;
  // Lower-case keyword fragments matched against product.title.
  keywords: string[];
}

export interface SubcategoryOption {
  id: string;
  label: string;
  count: number;
}

// Ordered keyword tables per category slug. Order matters: the first rule
// whose keywords match the title wins, so put more specific rules first.
const SUBCATEGORY_RULES: Record<string, SubcategoryRule[]> = {
  "lounge-seating": [
    { id: "sofas", label: "Sofas", keywords: ["sofa", "loveseat", "settee", "couch", "banquette"] },
    { id: "benches", label: "Benches", keywords: ["bench", "daybed"] },
    { id: "ottomans", label: "Ottomans", keywords: ["ottoman", "pouf", "footstool"] },
    { id: "stools", label: "Stools", keywords: ["barstool", "stool"] },
    { id: "chairs", label: "Chairs", keywords: ["armchair", "lounge chair", "chair"] },
  ],
  "chairs-stools": [
    { id: "stools", label: "Stools", keywords: ["barstool", "stool"] },
    { id: "chairs", label: "Chairs", keywords: ["armchair", "lounge chair", "chair"] },
  ],
  tables: [
    // Live site tags Community + Counter as Dining Tables; mirror that.
    { id: "dining-tables", label: "Dining Tables", keywords: ["dining table", "farm table", "community table", "counter table"] },
    { id: "highboys", label: "Highboys", keywords: ["highboy"] },
    { id: "consoles", label: "Consoles", keywords: ["console", "entry table", "sofa table"] },
    // Live site tags columns + plinths under Cocktail Tables.
    { id: "coffee-tables", label: "Coffee Tables", keywords: ["coffee table", "cocktail table", "column", "plinth"] },
    { id: "side-tables", label: "Side Tables", keywords: ["side table", "end table", "accent table", "drink table"] },
  ],
  "cocktail-bar": [
    // Live "Storage" tag covers shelves / cabinets / credenzas / sideboards behind bars.
    { id: "back-bars", label: "Back Bars", keywords: ["back bar", "backbar", "bar shelving", "shelving", "shelf", "cabinet", "credenza", "sideboard", "etagere"] },
    // Live tags ALL bar carts as "Bars", so collapse carts into bars.
    { id: "bars", label: "Bars", keywords: ["bar"] },
  ],
  "large-decor": [
    { id: "screens", label: "Screens", keywords: ["screen", "divider", "partition"] },
    { id: "fireplaces", label: "Fireplaces", keywords: ["fireplace", "firepit", "chiminea"] },
    { id: "planters", label: "Planters", keywords: ["planter", "pot", "urn"] },
    { id: "mirrors", label: "Mirrors", keywords: ["mirror"] },
    { id: "structures", label: "Structures", keywords: ["arch", "arbor", "wall", "structure", "canopy"] },
  ],
  lighting: [
    { id: "floor-lamps", label: "Floor Lamps", keywords: ["floor lamp", "standing lamp"] },
    { id: "table-lamps", label: "Table Lamps", keywords: ["table lamp", "desk lamp"] },
    { id: "sconces", label: "Sconces", keywords: ["sconce", "wall lamp"] },
  ],
};

/**
 * Returns the derived subcategory id for a product, or `null` if the product's
 * category has no derived taxonomy or the title doesn't match any rule.
 * Display-only — never written back to the product object.
 */
export function getProductSubcategory(product: CollectionProduct): string | null {
  const rules = SUBCATEGORY_RULES[product.categorySlug];
  if (!rules) return null;
  const title = product.title.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => title.includes(kw))) {
      return rule.id;
    }
  }
  return null;
}

/**
 * Returns the available subcategory options for a category, computed from the
 * passed product list. Always includes a leading "All" option. Subcategories
 * with zero matching products are omitted. If the category has no derived
 * taxonomy at all, returns an empty array (callers should hide the sub row).
 */
export function getSubcategoryOptions(
  categorySlug: string,
  products: CollectionProduct[],
): SubcategoryOption[] {
  const rules = SUBCATEGORY_RULES[categorySlug];
  if (!rules) return [];

  const counts = new Map<string, number>();
  for (const p of products) {
    const id = getProductSubcategory(p);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const options: SubcategoryOption[] = [
    { id: "all", label: "All", count: products.length },
  ];
  for (const rule of rules) {
    const count = counts.get(rule.id) ?? 0;
    if (count > 0) {
      options.push({ id: rule.id, label: rule.label, count });
    }
  }

  // If only "All" exists (no derived groups had matches), suppress the row.
  if (options.length <= 1) return [];
  return options;
}

/** Convenience: does this category have any meaningful derived subcategories? */
export function hasDerivedSubcategories(
  categorySlug: string,
  products: CollectionProduct[],
): boolean {
  return getSubcategoryOptions(categorySlug, products).length > 0;
}
