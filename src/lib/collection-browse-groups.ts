/**
 * Owner-priority browse hierarchy for the Collection page.
 *
 * NON-DESTRUCTIVE: this file does NOT mutate phase3_catalog.json, does NOT
 * change product records, and does NOT affect publicReady counts. It computes
 * a display-only browse-group taxonomy on top of the existing Phase 3
 * categories using keyword rules against `title` and `categorySlug`.
 *
 * The owner gave a best-seller-driven priority order. That order is the
 * primary browsing spine — NOT the raw scraped category slugs. Use the
 * helpers below to render category navigation, overview bands, and grid
 * filtering.
 *
 * Priority tie-break: a product that matches multiple groups is assigned to
 * the FIRST matching group in BROWSE_GROUP_ORDER.
 */

import type { CollectionProduct } from "./phase3-catalog";

export type BrowseGroupId =
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
  | "styling";

/** Owner priority order — strongest seller first. */
export const BROWSE_GROUP_ORDER: BrowseGroupId[] = [
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
};

interface BrowseRule {
  id: BrowseGroupId;
  /** If set, product.categorySlug must be in this list. */
  categories?: string[];
  /** Lower-cased keyword fragments matched against product.title. */
  keywords: string[];
  /** Optional: titles containing any of these keywords are excluded. */
  excludeKeywords?: string[];
}

// Order matters: first match wins, in BROWSE_GROUP_ORDER order.
// Categories listed are *constraints* — if provided the product MUST come
// from one of those categorySlugs to match this group. Keywords then refine.
const BROWSE_RULES: BrowseRule[] = [
  {
    id: "sofas",
    categories: ["lounge", "sofas-loveseats1"],
    keywords: ["sofa", "loveseat", "settee", "couch", "sectional"],
  },
  {
    id: "chairs",
    categories: ["lounge", "chairs-stools1"],
    keywords: ["chair", "armchair", "lounge chair"],
  },
  {
    id: "coffee-tables",
    categories: ["lounge-tables", "tables1"],
    keywords: ["coffee table"],
  },
  {
    id: "side-tables",
    categories: ["lounge-tables", "tables1"],
    keywords: [
      "side table",
      "end table",
      "accent table",
      "drink table",
      "console",
      "entry table",
      "sofa table",
    ],
  },
  {
    id: "rugs",
    categories: ["rugs"],
    keywords: ["rug"],
  },
  {
    id: "pillows",
    categories: ["pillows-throws1"],
    keywords: ["pillow", "throw"],
  },
  {
    id: "bar",
    categories: ["bars1", "cocktail-bar"],
    keywords: ["bar", "back bar", "backbar", "bar shelving", "shelving"],
  },
  // Cocktail Tables: source can be tables OR cocktail-bar.
  {
    id: "cocktail-tables",
    categories: ["cocktail-bar", "lounge-tables", "tables1"],
    keywords: ["cocktail table"],
  },
  {
    id: "storage",
    categories: ["storage1"],
    keywords: ["cabinet", "shelf", "shelving", "storage", "chest", "trunk"],
  },
  {
    id: "tableware",
    categories: ["tableware"],
    keywords: [
      "glassware",
      "dinnerware",
      "flatware",
      "plate",
      "bowl",
      "goblet",
      "glass",
      "charger",
      "napkin",
      "linen",
    ],
  },
  {
    id: "serveware",
    // Catalog has no `serveware` slug — accept either.
    categories: ["tableware", "serveware"],
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
  {
    id: "styling",
    categories: ["styling", "accents1", "large-decor"],
    keywords: [
      "vase",
      "vessel",
      "bust",
      "object",
      "candle",
      "lantern",
      "basket",
      "crate",
      "game",
      "prop",
      "decor",
    ],
  },
];

/**
 * Returns the derived browse-group id for a product, or `null` if it doesn't
 * match any group. Display-only — never written back to the product object.
 *
 * Resolution order:
 * 1. Walk BROWSE_RULES in declaration order (which matches BROWSE_GROUP_ORDER).
 * 2. For each rule, if `categories` is set, the product's categorySlug must be
 *    in that list.
 * 3. If `keywords` is set, the title must contain at least one keyword.
 * 4. First rule that satisfies both constraints wins.
 */
export function getProductBrowseGroup(
  product: CollectionProduct,
): BrowseGroupId | null {
  const title = product.title.toLowerCase();
  for (const rule of BROWSE_RULES) {
    if (rule.categories && !rule.categories.includes(product.categorySlug)) {
      continue;
    }
    if (
      rule.excludeKeywords &&
      rule.excludeKeywords.some((kw) => title.includes(kw))
    ) {
      continue;
    }
    const matches = rule.keywords.some((kw) => title.includes(kw));
    if (matches) return rule.id;
  }
  return null;
}

export interface BrowseGroupOption {
  id: BrowseGroupId;
  label: string;
  count: number;
}

/**
 * Returns owner-priority-ordered options, restricted to groups that have
 * at least one matching product in the passed list. Empty groups are hidden.
 */
export function getBrowseGroupOptions(
  products: CollectionProduct[],
): BrowseGroupOption[] {
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
      options.push({ id, label: BROWSE_GROUP_LABELS[id], count });
    }
  }
  return options;
}

/**
 * Buckets products by browse group, preserving owner priority order in the
 * returned Map's iteration order. Groups with zero products are omitted.
 */
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
  // Drop empty groups while preserving order
  const ordered = new Map<BrowseGroupId, CollectionProduct[]>();
  for (const id of BROWSE_GROUP_ORDER) {
    const list = buckets.get(id)!;
    if (list.length > 0) ordered.set(id, list);
  }
  return ordered;
}
