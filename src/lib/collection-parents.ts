/**
 * DECLARED taxonomy — owner truth, two levels.
 *
 *   Collection (ParentId)  →  Category (SubOption.id)
 *
 * Source of truth is the database: inventory_items.collection_slug and
 * inventory_items.category_slug, validated against taxonomy_collections /
 * taxonomy_categories. Nothing here infers, scores, or keyword-matches.
 * A product with no assignment is UNASSIGNED and stays out of navigation —
 * it never silently falls back into a browse group.
 *
 * Vocabulary note: the owner's "Collection" is this file's ParentId, and her
 * "Category" is SubOption.id. Collection slugs are derived from the existing
 * ?group= URL param values, so public URLs did not move.
 *
 * Legacy: GROUP_TO_PARENT / TILE_TO_PARENT_SUB remain only to translate old
 * BrowseGroupId links and landing tiles into the declared tree. The browse-group
 * scorer itself dies with the Frame Studio Phase 5 solver delete.
 */

import type { CollectionProduct } from "./phase3-catalog";
import type { BrowseGroupId } from "./collection-browse-groups";

// ─────────────────────────────────────────────────────────────────────────────
// Collections (10)
// ─────────────────────────────────────────────────────────────────────────────

export type ParentId =
  | "lounge-seating"
  | "lounge-tables"
  | "cocktail-bar"
  | "dining"
  | "tableware"
  | "lighting"
  | "textiles"
  | "rugs"
  | "styling"
  | "large-decor";

export const PARENT_ORDER: ParentId[] = [
  "lounge-seating",
  "lounge-tables",
  "cocktail-bar",
  "dining",
  "tableware",
  "lighting",
  "textiles",
  "rugs",
  "styling",
  "large-decor",
];

export const PARENT_LABELS: Record<ParentId, string> = {
  "lounge-seating": "Lounge Seating",
  "lounge-tables": "Lounge Tables",
  "cocktail-bar": "Cocktail + Bar",
  "dining": "Dining",
  "tableware": "Tableware",
  "lighting": "Lighting",
  "textiles": "Textiles",
  "rugs": "Rugs",
  "styling": "Styling",
  "large-decor": "Large Decor",
};

export interface SubOption {
  id: string;
  label: string;
}

/**
 * Categories per collection, in the owner's declared order. Mirrors
 * public.taxonomy_categories (slug + label + sort_order). "All" is implicit
 * and rendered first by the UI; do NOT include it here.
 */
export const PARENT_SUBS: Record<ParentId, SubOption[]> = {
  "lounge-seating": [
    { id: "sofas-loveseats", label: "Sofas + Loveseats" },
    { id: "lounge-chairs", label: "Lounge Chairs" },
    { id: "benches", label: "Benches" },
    { id: "ottomans", label: "Ottomans" },
  ],
  "lounge-tables": [
    { id: "coffee-tables", label: "Coffee Tables" },
    { id: "side-tables", label: "Side Tables" },
    { id: "consoles", label: "Consoles" },
  ],
  "cocktail-bar": [
    { id: "bars", label: "Bars" },
    { id: "cocktail-tables", label: "Cocktail Tables" },
    { id: "community-tables", label: "Community Tables" },
    { id: "storage", label: "Storage" },
    { id: "bar-stools", label: "Bar Stools" },
  ],
  "dining": [
    { id: "dining-tables", label: "Dining Tables" },
    { id: "dining-chairs", label: "Dining Chairs" },
    { id: "banquettes", label: "Banquettes" },
  ],
  "tableware": [
    { id: "dinnerware", label: "Dinnerware" },
    { id: "flatware", label: "Flatware" },
    { id: "glassware", label: "Glassware" },
    { id: "serveware", label: "Serveware" },
  ],
  "lighting": [
    { id: "chandeliers", label: "Chandeliers" },
    { id: "table-lamps", label: "Table Lamps" },
    { id: "floor-lamps", label: "Floor Lamps" },
    { id: "specialty", label: "Specialty" },
  ],
  "textiles": [
    { id: "pillows", label: "Pillows" },
    { id: "throws", label: "Throws" },
    { id: "furs-pelts", label: "Furs + Pelts" },
  ],
  "rugs": [{ id: "rugs", label: "Rugs" }],
  "styling": [
    { id: "accents", label: "Accents" },
    { id: "candlelighting", label: "Candlighting" },
    { id: "crates-baskets", label: "Crates + Baskets" },
  ],
  "large-decor": [
    { id: "structures", label: "Structures" },
    { id: "walls", label: "Walls" },
    { id: "other", label: "Other" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy link translation (old BrowseGroupId URLs + landing tiles)
// ─────────────────────────────────────────────────────────────────────────────

export const GROUP_TO_PARENT: Record<BrowseGroupId, ParentId> = {
  sofas: "lounge-seating",
  chairs: "lounge-seating",
  "benches-ottomans": "lounge-seating",
  "coffee-tables": "lounge-tables",
  "side-tables": "lounge-tables",
  "cocktail-tables": "cocktail-bar",
  bar: "cocktail-bar",
  storage: "cocktail-bar",
  dining: "dining",
  tableware: "tableware",
  serveware: "tableware",
  lighting: "lighting",
  pillows: "textiles",
  throws: "textiles",
  rugs: "rugs",
  styling: "styling",
  accents: "styling",
  "large-decor": "large-decor",
  "furs-pelts": "textiles",
};

export const TILE_TO_PARENT_SUB: Record<
  BrowseGroupId,
  { parent: ParentId; sub: string }
> = {
  sofas: { parent: "lounge-seating", sub: "sofas-loveseats" },
  chairs: { parent: "lounge-seating", sub: "lounge-chairs" },
  "benches-ottomans": { parent: "lounge-seating", sub: "all" },
  "coffee-tables": { parent: "lounge-tables", sub: "coffee-tables" },
  "side-tables": { parent: "lounge-tables", sub: "side-tables" },
  "cocktail-tables": { parent: "cocktail-bar", sub: "cocktail-tables" },
  dining: { parent: "dining", sub: "all" },
  bar: { parent: "cocktail-bar", sub: "bars" },
  storage: { parent: "cocktail-bar", sub: "storage" },
  lighting: { parent: "lighting", sub: "all" },
  rugs: { parent: "rugs", sub: "all" },
  pillows: { parent: "textiles", sub: "pillows" },
  throws: { parent: "textiles", sub: "throws" },
  tableware: { parent: "tableware", sub: "all" },
  serveware: { parent: "tableware", sub: "serveware" },
  styling: { parent: "styling", sub: "all" },
  accents: { parent: "styling", sub: "accents" },
  "large-decor": { parent: "large-decor", sub: "all" },
  "furs-pelts": { parent: "textiles", sub: "furs-pelts" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Read path — declared columns only
// ─────────────────────────────────────────────────────────────────────────────

const PARENT_SET = new Set<string>(PARENT_ORDER);

/** The product's declared collection, or null when unassigned. */
export function productParent(p: CollectionProduct): ParentId | null {
  const c = (p.collectionSlug || "").trim();
  return PARENT_SET.has(c) ? (c as ParentId) : null;
}

/** The product's declared category, or null when unassigned. */
export function productCategory(p: CollectionProduct): string | null {
  const c = (p.declaredCategory || "").trim();
  return c || null;
}

export function productMatchesSub(
  p: CollectionProduct,
  parent: ParentId,
  sub: string,
): boolean {
  if (productParent(p) !== parent) return false;
  if (sub === "all") return true;
  return productCategory(p) === sub;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

export function isParentId(value: string): value is ParentId {
  return PARENT_SET.has(value);
}

const TILE_KEYS = new Set<string>(Object.keys(TILE_TO_PARENT_SUB));
/** True if `s` is one of the 18 legacy BrowseGroupId strings used in old URLs. */
export function isLegacyTileId(s: string): s is BrowseGroupId {
  return TILE_KEYS.has(s);
}
