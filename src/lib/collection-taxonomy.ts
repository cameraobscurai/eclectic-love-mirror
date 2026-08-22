/**
 * Collection tiles — DECLARED taxonomy only.
 *
 * Tile membership comes from inventory_items.collection_slug +
 * category_slug (surfaced as CollectionProduct.collectionSlug /
 * declaredCategory). Nothing here infers, scores, or keyword-matches: the
 * keyword rule engine was deleted in the read-path switchover (Task C2).
 *
 * Unassigned products resolve to null — out of tiles and navigation, PDP
 * still reachable.
 */

import type { CollectionProduct } from "./phase3-catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type BrowseGroupId =
  // Owner tier
  | "sofas"
  | "chairs"
  | "coffee-tables"
  | "side-tables"
  | "rugs"
  | "pillows"
  | "bar"
  | "cocktail-tables"
  | "storage"
  | "tableware"
  | "serveware"
  | "styling"
  // Safety-net tier
  | "benches-ottomans"
  | "dining"
  | "lighting"
  | "throws"
  | "large-decor"
  | "furs-pelts"
  | "accents";

export type BrowseTier = "owner" | "safety-net";

/** Retained for the admin audit view; membership is declared, not scored. */
export interface ClassificationTrace {
  candidates: Array<{
    id: BrowseGroupId;
    score: number;
    reason: string;
  }>;
  /** The tile the declared pair resolved to, or null when unassigned. */
  winnerId: BrowseGroupId | null;
  margin: number;
}

export interface Classification {
  /** null = unassigned: no tile, no nav, PDP still reachable. */
  group: BrowseGroupId | null;
  trace: ClassificationTrace;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static metadata (labels, order, tier)
// ─────────────────────────────────────────────────────────────────────────────

export const OWNER_BROWSE_ORDER: BrowseGroupId[] = [
  "sofas",
  "chairs",
  "coffee-tables",
  "side-tables",
  "rugs",
  "pillows",
  "bar",
  "cocktail-tables",
  "storage",
  "tableware",
  "serveware",
  "styling",
];

export const SAFETY_NET_BROWSE_ORDER: BrowseGroupId[] = [
  "benches-ottomans",
  "dining",
  "lighting",
  "throws",
  "large-decor",
  "furs-pelts",
  "accents",
];

/**
 * Display order for the rail / overview / By-Type sort. Owner curation drives
 * emphasis; safety-net groups are interleaved into semantically appropriate
 * positions so the rail reads as one coherent index.
 */
export const BROWSE_GROUP_ORDER: BrowseGroupId[] = [
  "sofas",
  "chairs",
  "benches-ottomans",
  "coffee-tables",
  "side-tables",
  "cocktail-tables",
  "dining",
  "bar",
  "storage",
  "lighting",
  "rugs",
  "pillows",
  "throws",
  "tableware",
  "serveware",
  "styling",
  "accents",
  "large-decor",
  "furs-pelts",
];

export const BROWSE_GROUP_LABELS: Record<BrowseGroupId, string> = {
  sofas: "Sofas",
  chairs: "Chairs",
  "coffee-tables": "Coffee Tables",
  "side-tables": "Side Tables",
  rugs: "Rugs",
  pillows: "Pillows",
  bar: "Bar",
  "cocktail-tables": "Cocktail Tables",
  storage: "Storage",
  tableware: "Tableware",
  serveware: "Serveware",
  styling: "Styling",
  "benches-ottomans": "Benches & Ottomans",
  dining: "Dining",
  lighting: "Lighting",
  throws: "Throws",
  "large-decor": "Large Decor",
  "furs-pelts": "Furs & Pelts",
  accents: "Accents",
};

export const BROWSE_GROUP_TIER: Record<BrowseGroupId, BrowseTier> = {
  sofas: "owner",
  chairs: "owner",
  "coffee-tables": "owner",
  "side-tables": "owner",
  rugs: "owner",
  pillows: "owner",
  bar: "owner",
  "cocktail-tables": "owner",
  storage: "owner",
  tableware: "owner",
  serveware: "owner",
  styling: "owner",
  "benches-ottomans": "safety-net",
  dining: "safety-net",
  lighting: "safety-net",
  throws: "safety-net",
  "large-decor": "safety-net",
  "furs-pelts": "safety-net",
  accents: "safety-net",
};

/**
 * One-sentence editorial descriptions per browse group.
 * Used by CategoryHero to set the register of each section — quiet,
 * specific, sentence-case, no marketing voice.
 */
export const BROWSE_GROUP_DESCRIPTIONS: Record<BrowseGroupId, string> = {
  sofas:
    "Curated seating in a range of silhouettes, textures, and eras — chosen for comfort and timeless presence.",
  chairs:
    "Lounge, accent, and dining chairs assembled for character and quiet authority across a room.",
  "benches-ottomans":
    "Low pieces that anchor a setting — upholstered benches, leather ottomans, and sculptural footstools.",
  "coffee-tables":
    "Centerpieces in stone, wood, and metal, scaled for both intimate sofas and larger conversation arrangements.",
  "side-tables":
    "Companion tables for seating — a register of materials, heights, and silhouettes worth pulling close.",
  "cocktail-tables":
    "A focused set of cocktail and drinks tables, sized for movement around a room without losing presence.",
  dining:
    "Tables built for long conversations — wood, marble, and bespoke surfaces in seating-for-eight scale and beyond.",
  bar: "Bar carts, back bars, and serving stations — pieces that make the act of pouring a drink part of the room.",
  storage:
    "Cabinets, credenzas, and consoles chosen for material and proportion, not just capacity.",
  lighting:
    "Floor, table, and pendant lighting selected for the quality of the light itself, not the fixture alone.",
  rugs: "Vintage and contemporary rugs in a range of weaves, palettes, and scales for grounding any setting.",
  pillows:
    "A library of textiles — vintage, custom, and hand-loomed — to layer texture and color across seating.",
  throws: "Hand-loomed and vintage textiles meant to be picked up, draped, and lived with.",
  tableware:
    "Plates, glassware, and flatware composed for the editorial table — quiet finishes, considered weight.",
  serveware:
    "Platters, pitchers, and serving vessels chosen as objects in their own right, not just utility.",
  styling: "Books, vessels, and small sculptural objects to finish a tablescape, mantel, or shelf.",
  accents:
    "Singular pieces — mirrors, screens, sculptural objects — that change the temperature of a room on contact.",
  "large-decor":
    "Architectural objects in scale — sculpture, vessels, and statement pieces meant to hold a room.",
  "furs-pelts": "Hides, sheepskins, and pelts — tactile layers for seating, floors, and styling.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Declared-taxonomy membership
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Tile membership is DECLARED, not inferred. Each browse tile is a fixed set
 * of (collection_slug, category_slug) pairs from the owner's tree; a product
 * lands in a tile only because its declared columns say so. There is no
 * keyword scoring, no title matching, and no legacy `category` free text in
 * this path — the previous rule engine was deleted with the C2 switchover.
 *
 * A product with no declared assignment returns null: it stays out of every
 * tile and out of navigation, while its PDP stays reachable.
 */
const TILE_MEMBERS: Array<{ id: BrowseGroupId; collection: string; categories: string[] }> = [
  { id: "sofas", collection: "lounge-seating", categories: ["sofas-loveseats"] },
  { id: "chairs", collection: "lounge-seating", categories: ["lounge-chairs"] },
  { id: "benches-ottomans", collection: "lounge-seating", categories: ["benches", "ottomans"] },
  { id: "coffee-tables", collection: "lounge-tables", categories: ["coffee-tables"] },
  { id: "side-tables", collection: "lounge-tables", categories: ["side-tables", "consoles"] },
  {
    id: "cocktail-tables",
    collection: "cocktail-bar",
    categories: ["cocktail-tables", "community-tables"],
  },
  { id: "bar", collection: "cocktail-bar", categories: ["bars", "bar-stools"] },
  { id: "storage", collection: "cocktail-bar", categories: ["storage"] },
  {
    id: "dining",
    collection: "dining",
    categories: ["dining-tables", "dining-chairs", "banquettes"],
  },
  { id: "tableware", collection: "tableware", categories: ["dinnerware", "flatware", "glassware"] },
  { id: "serveware", collection: "tableware", categories: ["serveware"] },
  {
    id: "lighting",
    collection: "lighting",
    categories: ["chandeliers", "table-lamps", "floor-lamps", "specialty"],
  },
  { id: "pillows", collection: "textiles", categories: ["pillows"] },
  { id: "throws", collection: "textiles", categories: ["throws"] },
  { id: "furs-pelts", collection: "textiles", categories: ["furs-pelts"] },
  { id: "rugs", collection: "rugs", categories: ["rugs"] },
  { id: "styling", collection: "styling", categories: ["candlelighting", "crates-baskets"] },
  { id: "accents", collection: "styling", categories: ["accents"] },
  { id: "large-decor", collection: "large-decor", categories: ["structures", "walls", "other"] },
];

/** (collection_slug::category_slug) -> tile id. */
const PAIR_TO_TILE = new Map<string, BrowseGroupId>();
/** collection_slug -> tile used when the category is missing or unknown. */
const COLLECTION_FALLBACK_TILE = new Map<string, BrowseGroupId>();
for (const m of TILE_MEMBERS) {
  for (const c of m.categories) PAIR_TO_TILE.set(`${m.collection}::${c}`, m.id);
  if (!COLLECTION_FALLBACK_TILE.has(m.collection)) COLLECTION_FALLBACK_TILE.set(m.collection, m.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a product to its browse tile from the declared columns.
 * Returns null when the product is unassigned (or declared into a collection
 * with no tile) — callers must not invent a fallback bucket.
 */
export function getProductBrowseGroup(product: CollectionProduct): BrowseGroupId | null {
  const collection = (product.collectionSlug || "").trim();
  if (!collection) return null;
  const category = (product.declaredCategory || "").trim();
  return (
    PAIR_TO_TILE.get(`${collection}::${category}`) ??
    COLLECTION_FALLBACK_TILE.get(collection) ??
    null
  );
}

/** Trace shape retained for the admin audit view; the "rule" is the declared pair. */
export function classify(product: CollectionProduct): Classification {
  const group = getProductBrowseGroup(product);
  const reason = `declared ${product.collectionSlug || "—"}/${product.declaredCategory || "—"}`;
  if (!group) {
    return { group: null, trace: { candidates: [], winnerId: null, margin: 0 } };
  }
  return {
    group,
    trace: { candidates: [{ id: group, score: 1, reason }], winnerId: group, margin: 1 },
  };
}

export interface BrowseGroupOption {
  id: BrowseGroupId;
  label: string;
  count: number;
  tier: BrowseTier;
}

export function getBrowseGroupOptions(products: CollectionProduct[]): BrowseGroupOption[] {
  const counts = new Map<BrowseGroupId, number>();
  for (const p of products) {
    const id = getProductBrowseGroup(p);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const options: BrowseGroupOption[] = [];
  for (const id of BROWSE_GROUP_ORDER) {
    const count = counts.get(id) ?? 0;
    if (count > 0) {
      options.push({
        id,
        label: BROWSE_GROUP_LABELS[id],
        count,
        tier: BROWSE_GROUP_TIER[id],
      });
    }
  }
  return options;
}

export function groupProductsByBrowseGroup(
  products: CollectionProduct[],
): Map<BrowseGroupId, CollectionProduct[]> {
  const buckets = new Map<BrowseGroupId, CollectionProduct[]>();
  for (const id of BROWSE_GROUP_ORDER) buckets.set(id, []);
  for (const p of products) {
    const id = getProductBrowseGroup(p);
    if (!id) continue;
    buckets.get(id)!.push(p);
  }
  const ordered = new Map<BrowseGroupId, CollectionProduct[]>();
  for (const id of BROWSE_GROUP_ORDER) {
    const list = buckets.get(id)!;
    if (list.length > 0) ordered.set(id, list);
  }
  return ordered;
}
