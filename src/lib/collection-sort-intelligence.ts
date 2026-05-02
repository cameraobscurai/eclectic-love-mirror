/**
 * Display-only sort intelligence for the Collection page.
 *
 * NON-DESTRUCTIVE: no catalog mutation, no rebake, no change to publicReady
 * logic, no change to the 876 count. This module computes ranking integers
 * at sort time so the public grid feels merchandised rather than scraped.
 *
 * Two layers of intelligence:
 *
 *   1. OWNER browse-group rank — owner-provided best-seller hierarchy.
 *      Sofas first → Styling last. (See collection-browse-groups.ts.)
 *
 *   2. ORIGINAL SITE type rank — within each scraped category, the original
 *      Eclectic Hive site grid presents items in a meaningful composition
 *      order (sofas before chairs in Lounge Seating, coffee tables before
 *      consoles in Lounge Tables, etc.). We replicate that order here as
 *      a keyword-driven rank table per categorySlug.
 *
 * "By Type" sort = ownerRank → originalSiteTypeRank → scrapedOrder → title.
 */

import type { CollectionProduct } from "./phase3-catalog";
import {
  BROWSE_GROUP_ORDER,
  getProductBrowseGroup,
  type BrowseGroupId,
} from "./collection-browse-groups";

// Re-exported convenience for callers that want one import.
export const OWNER_BROWSE_ORDER = BROWSE_GROUP_ORDER;

/**
 * Original-site category nav order (purely informational — the public browse
 * UI uses owner order). Useful for fallback grouping or admin/debug views.
 */
export const ORIGINAL_SITE_CATEGORY_ORDER: string[] = [
  "Lounge Seating",
  "Lounge Tables",
  "Cocktail & Bar",
  "Dining",
  "Tableware",
  "Lighting",
  "Textiles",
  "Rugs",
  "Styling",
  "Large Decor",
];

/**
 * Per-categorySlug type-rank tables. Each row is a (rank, keywords) pair.
 * Rank order matches the original site grid composition. Rank 0 = first.
 *
 * Keywords are matched against the product title (lower-cased). The first
 * matching row in declaration order wins. Anything that doesn't match falls
 * to FALLBACK_TYPE_RANK so it sorts after all classified items but still
 * within its category.
 */
const FALLBACK_TYPE_RANK = 100;

interface TypeRankRule {
  rank: number;
  keywords: string[];
}

const SITE_TYPE_RANKS: Record<string, TypeRankRule[]> = {
  // Lounge Seating: sofas first, then chairs, benches, ottomans, stools.
  lounge: [
    { rank: 0, keywords: ["sofa", "loveseat", "settee", "couch", "sectional"] },
    { rank: 1, keywords: ["armchair", "lounge chair", "chair"] },
    { rank: 2, keywords: ["bench", "daybed"] },
    { rank: 3, keywords: ["ottoman", "pouf", "footstool"] },
    { rank: 4, keywords: ["barstool", "stool"] },
  ],
  "sofas-loveseats1": [
    { rank: 0, keywords: ["sofa", "loveseat", "settee", "couch", "sectional"] },
  ],
  "chairs-stools1": [
    { rank: 0, keywords: ["armchair", "lounge chair", "chair"] },
    { rank: 1, keywords: ["barstool", "stool"] },
  ],
  "benches-ottomans1": [
    { rank: 0, keywords: ["bench", "daybed"] },
    { rank: 1, keywords: ["ottoman", "pouf", "footstool"] },
  ],

  // Lounge Tables: coffee tables, then side, then consoles.
  "lounge-tables": [
    { rank: 0, keywords: ["coffee table", "cocktail table"] },
    {
      rank: 1,
      keywords: ["side table", "end table", "accent table", "drink table"],
    },
    { rank: 2, keywords: ["console", "entry table", "sofa table"] },
  ],
  tables1: [
    { rank: 0, keywords: ["coffee table", "cocktail table"] },
    {
      rank: 1,
      keywords: ["side table", "end table", "accent table", "drink table"],
    },
    { rank: 2, keywords: ["console", "entry table", "sofa table"] },
    { rank: 3, keywords: ["dining table", "farm table", "highboy"] },
  ],
  dining: [
    { rank: 0, keywords: ["dining table", "farm table"] },
    { rank: 1, keywords: ["highboy"] },
    { rank: 2, keywords: ["chair"] },
  ],

  // Cocktail & Bar: bars, cocktail tables, community tables, stools, storage.
  "cocktail-bar": [
    { rank: 0, keywords: ["back bar", "backbar", "bar shelving", "shelving"] },
    { rank: 1, keywords: ["bar"] },
    { rank: 2, keywords: ["cocktail table"] },
    { rank: 3, keywords: ["community table"] },
    { rank: 4, keywords: ["barstool", "stool"] },
    { rank: 5, keywords: ["cabinet", "trunk", "chest", "storage"] },
  ],
  bars1: [
    { rank: 0, keywords: ["back bar", "backbar", "bar shelving", "shelving"] },
    { rank: 1, keywords: ["bar"] },
  ],

  // Tableware: dinnerware/chargers, flatware, glassware, serveware.
  tableware: [
    {
      rank: 0,
      keywords: ["dinnerware", "plate", "charger", "bowl"],
    },
    { rank: 1, keywords: ["flatware"] },
    { rank: 2, keywords: ["glassware", "goblet", "glass"] },
    {
      rank: 3,
      keywords: [
        "tray",
        "platter",
        "server",
        "serving",
        "decanter",
        "pitcher",
        "stand",
      ],
    },
    { rank: 4, keywords: ["napkin", "linen"] },
  ],

  // Textiles: pillows then throws.
  textiles: [
    { rank: 0, keywords: ["pillow", "lumbar"] },
    { rank: 1, keywords: ["throw"] },
  ],
  "pillows-throws1": [
    { rank: 0, keywords: ["pillow", "lumbar"] },
    { rank: 1, keywords: ["throw"] },
  ],

  // Lighting: chandeliers/pendants, sconces, lamps, floor lamps,
  // lanterns/candlelight, specialty.
  light: [
    { rank: 0, keywords: ["chandelier", "pendant"] },
    { rank: 1, keywords: ["sconce", "wall lamp"] },
    { rank: 2, keywords: ["table lamp", "desk lamp"] },
    { rank: 3, keywords: ["floor lamp", "standing lamp"] },
    { rank: 4, keywords: ["lantern", "candle", "candlelight"] },
    { rank: 5, keywords: ["lamp"] }, // generic lamps last within lighting
  ],

  // Styling: vessels/vases/bowls/objects, baskets/crates, games/props.
  styling: [
    {
      rank: 0,
      keywords: ["vase", "vessel", "bowl", "object", "bust", "stand"],
    },
    { rank: 1, keywords: ["candle", "lantern"] },
    { rank: 2, keywords: ["basket", "crate"] },
    { rank: 3, keywords: ["game", "prop"] },
  ],
  accents1: [
    { rank: 0, keywords: ["vase", "vessel", "bowl", "object", "bust"] },
    { rank: 1, keywords: ["candle", "lantern"] },
    { rank: 2, keywords: ["basket", "crate"] },
  ],

  // Large Decor: firepits/fireplaces/chimineas, outdoor structures/umbrellas/
  // stands, mirrors/fountains, walls/screens/dividers.
  "large-decor": [
    { rank: 0, keywords: ["firepit", "fireplace", "chiminea"] },
    { rank: 1, keywords: ["umbrella", "stand", "arch", "arbor"] },
    { rank: 2, keywords: ["mirror", "fountain"] },
    { rank: 3, keywords: ["wall", "screen", "divider", "partition"] },
    { rank: 4, keywords: ["planter", "pot", "urn"] },
  ],

  // Rugs: single category — preserve scraped order via fallback.
  rugs: [],

  // Storage standalone slug.
  storage1: [
    { rank: 0, keywords: ["cabinet", "credenza"] },
    { rank: 1, keywords: ["shelf", "shelving"] },
    { rank: 2, keywords: ["chest", "trunk"] },
    { rank: 3, keywords: ["storage"] },
  ],
};

/**
 * Owner browse-group rank: 0 = highest priority (Sofas), n = lowest.
 * Returns a high sentinel for products that don't map to any owner group so
 * they sort to the tail of "By Type" without breaking ties.
 */
export function getOwnerBrowseGroupRank(product: CollectionProduct): number {
  const id = getProductBrowseGroup(product);
  if (!id) return OWNER_BROWSE_ORDER.length + 10;
  return OWNER_BROWSE_ORDER.indexOf(id);
}

/** Convenience: the owner browse group id, or null. */
export function getOwnerBrowseGroup(
  product: CollectionProduct,
): BrowseGroupId | null {
  return getProductBrowseGroup(product);
}

/**
 * Original-site type rank within the product's categorySlug. Lower = earlier
 * in the original site grid composition. Returns FALLBACK_TYPE_RANK when no
 * keyword matches (so unclassified items sort after classified ones).
 */
export function getOriginalSiteTypeRank(product: CollectionProduct): number {
  const rules = SITE_TYPE_RANKS[product.categorySlug];
  if (!rules || rules.length === 0) return FALLBACK_TYPE_RANK;
  const title = product.title.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => title.includes(kw))) return rule.rank;
  }
  return FALLBACK_TYPE_RANK;
}

export type SortMode = "by-type" | "az" | "newest" | "oldest";

export interface SortContext {
  mode: SortMode;
  /**
   * Optional active browse group. When set, owner rank collapses (everything
   * is in the same group) and we lean on original-site rank + scraped order.
   */
  activeGroup?: BrowseGroupId | null;
}

/**
 * Composite "By Type" rank as a stable, sortable number key.
 * Lower = earlier. Encoded so JS sort comparators can subtract directly.
 *
 * Layout: ownerRank * 1e9 + siteTypeRank * 1e6 + scrapedOrder.
 * scrapedOrder fits in <1e6 for a catalog of <1M products (we have ~1.5k).
 */
export function getDisplaySortRank(
  product: CollectionProduct,
  context: SortContext = { mode: "by-type" },
): number {
  if (context.mode !== "by-type") {
    // Other modes are handled by sortProductsForCollection directly; this
    // function returns a stable secondary rank for tie-breaking.
    return product.scrapedOrder;
  }
  const ownerRank = context.activeGroup
    ? 0 // single group view — collapse owner dimension
    : getOwnerBrowseGroupRank(product);
  const siteRank = getOriginalSiteTypeRank(product);
  return ownerRank * 1_000_000_000 + siteRank * 1_000_000 + product.scrapedOrder;
}

/**
 * Public sorter. Returns a NEW array; never mutates the input.
 *
 *   by-type → owner rank, then original-site type rank, then scrapedOrder,
 *             then title alphabetical
 *   az      → title alphabetical
 *   newest  → ascending scrapedOrder (lowest = earliest scraped = most recent
 *             on the original site, per existing convention)
 *   oldest  → descending scrapedOrder
 */
export function sortProductsForCollection(
  products: CollectionProduct[],
  context: SortContext = { mode: "by-type" },
): CollectionProduct[] {
  const list = [...products];
  switch (context.mode) {
    case "az":
      list.sort((a, b) => a.title.localeCompare(b.title));
      return list;
    case "newest":
      list.sort(
        (a, b) =>
          a.scrapedOrder - b.scrapedOrder || a.title.localeCompare(b.title),
      );
      return list;
    case "oldest":
      list.sort(
        (a, b) =>
          b.scrapedOrder - a.scrapedOrder || a.title.localeCompare(b.title),
      );
      return list;
    case "by-type":
    default: {
      list.sort((a, b) => {
        const ra = getDisplaySortRank(a, context);
        const rb = getDisplaySortRank(b, context);
        return ra - rb || a.title.localeCompare(b.title);
      });
      return list;
    }
  }
}
