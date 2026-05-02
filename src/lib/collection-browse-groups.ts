/**
 * Owner-priority browse hierarchy + safety-net taxonomy for the Collection page.
 *
 * NON-DESTRUCTIVE: this module does NOT mutate phase3_catalog.json, does NOT
 * change product records, and does NOT affect publicReady counts. It computes
 * a display-only browse-group taxonomy on top of the existing Phase 3
 * categories using keyword + categorySlug rules.
 *
 * Two tiers, both surfaced publicly:
 *
 *   1. OWNER tier — owner-provided best-seller hierarchy. Leads everywhere
 *      (browse line row 1, overview band order, By Type sort).
 *
 *   2. SAFETY-NET tier — catches every other public-ready slug so all 876
 *      pieces are reachable via a real browse group, never search-only.
 *      Renders quieter than owner groups but is fully navigable.
 *
 * Owner groups are keyword-gated (intentional matches). Safety-net groups
 * accept anything from their `categories` even without a keyword hit — that
 * fallback is what makes the taxonomy shippable at <5% unassigned.
 *
 * Priority tie-break: a product is assigned to the FIRST matching group in
 * BROWSE_GROUP_ORDER (owner first, then safety-net).
 */

import type { CollectionProduct } from "./phase3-catalog";

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
  | "accents";

export type BrowseTier = "owner" | "safety-net";

/** Owner priority order — strongest seller first. */
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

/** Safety-net groups — appear after owner groups, quieter visual emphasis. */
export const SAFETY_NET_BROWSE_ORDER: BrowseGroupId[] = [
  "benches-ottomans",
  "dining",
  "lighting",
  "throws",
  "large-decor",
  "accents",
];

/** Combined order used by the browse line, sort intelligence, and overview. */
export const BROWSE_GROUP_ORDER: BrowseGroupId[] = [
  ...OWNER_BROWSE_ORDER,
  ...SAFETY_NET_BROWSE_ORDER,
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
  accents: "safety-net",
};

interface BrowseRule {
  id: BrowseGroupId;
  /** Product.categorySlug must be in this list to even consider the rule. */
  categories: string[];
  /** Lower-cased keyword fragments matched against product.title. */
  keywords: string[];
  /**
   * If true, the title MUST match a keyword regardless of which category slug
   * the product belongs to. Owner-tier rules use this.
   *
   * If false, fall back to monoCategories logic: products whose slug is in
   * monoCategories pass on category alone; products whose slug is in
   * `categories` but NOT monoCategories still require a keyword match.
   * This lets one rule combine a "mono" slug (e.g. dining) with a "keyworded"
   * cross-slug (e.g. tables1 highboys → Dining).
   */
  requireKeyword: boolean;
  /** Slugs that pass on category alone when requireKeyword is false. Defaults
   *  to all `categories` if omitted (preserves prior behavior). */
  monoCategories?: string[];
  /** Optional: titles containing any of these keywords are excluded. */
  excludeKeywords?: string[];
}

// Order matters: first match wins. Owner rules come first so any owner
// keyword hit beats a safety-net category fallback.
const BROWSE_RULES: BrowseRule[] = [
  // ===== OWNER TIER (mostly keyword-gated, with intentional category fallbacks) =====
  {
    id: "sofas",
    categories: ["lounge", "sofas-loveseats1"],
    keywords: ["sofa", "loveseat", "settee", "couch", "sectional"],
    requireKeyword: true,
  },
  {
    id: "chairs",
    categories: ["lounge", "chairs-stools1"],
    keywords: ["chair", "armchair", "lounge chair", "stool", "barstool"],
    requireKeyword: true,
  },
  {
    id: "coffee-tables",
    categories: ["lounge-tables", "tables1"],
    keywords: ["coffee table"],
    requireKeyword: true,
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
      "column",
      "tea table",
    ],
    requireKeyword: true,
  },
  {
    id: "rugs",
    categories: ["rugs"],
    keywords: ["rug"],
    requireKeyword: false, // rugs slug is mono — accept all
  },
  {
    id: "pillows",
    // textiles slug holds the bulk of pillows on the original site, so accept
    // both. Genuine throws fall through to the Throws safety-net rule below.
    categories: ["pillows-throws1", "textiles"],
    keywords: ["pillow", "lumbar"],
    requireKeyword: true,
  },
  {
    id: "bar",
    categories: ["bars1", "cocktail-bar"],
    keywords: [
      "bar",
      "back bar",
      "backbar",
      "bar shelving",
      "shelving",
      "shelf",
      "counter",
      "counter stool",
    ],
    requireKeyword: true,
  },
  {
    id: "cocktail-tables",
    categories: ["cocktail-bar", "lounge-tables", "tables1"],
    keywords: ["cocktail table", "community table", "cocktail column"],
    requireKeyword: true,
  },
  {
    id: "storage",
    // storage1 is mono. Cabinets/cabinet-like pieces in cocktail-bar also
    // belong here once Bar/Cocktail-tables have had first dibs.
    categories: ["storage1", "cocktail-bar"],
    keywords: ["cabinet", "credenza", "trunk", "chest", "armoire"],
    requireKeyword: false,
    monoCategories: ["storage1"], // cocktail-bar requires keyword
  },
  {
    id: "tableware",
    categories: ["tableware"],
    keywords: [
      "dinnerware",
      "flatware",
      "plate",
      "bowl",
      "goblet",
      "glass",
      "glassware",
      "charger",
      "napkin",
      "linen",
      "cup",
      "mug",
      "stoneware",
      "cellar",
      "s&p",
      "salt",
      "pepper",
      "cocktail set",
      "paddle",
    ],
    requireKeyword: true,
  },
  {
    id: "serveware",
    categories: ["tableware", "serveware"],
    keywords: [
      "tray",
      "platter",
      "server",
      "serving",
      "decanter",
      "pitcher",
      "stand",
      "carafe",
      "beverage tub",
      "beverage dispenser",
      "dispenser",
      "tub",
      "basket",
    ],
    requireKeyword: true,
  },
  {
    id: "styling",
    categories: ["styling"],
    keywords: [],
    requireKeyword: false, // styling slug → all to Styling unless owner-tier matched first
  },

  // ===== SAFETY-NET TIER (category-only fallback) =====
  {
    id: "benches-ottomans",
    // Catches benches-ottomans1 (mono) AND any lounge-slug bench/ottoman/daybed
    // that didn't match Sofas/Chairs above.
    categories: ["benches-ottomans1", "lounge"],
    keywords: ["bench", "ottoman", "daybed", "pouf", "footstool", "banquette"],
    requireKeyword: false, // benches-ottomans1 accepts all; keywords filter lounge
  },
  {
    id: "dining",
    // Includes original `dining` slug AND tables1 highboys/pub/feasting tables
    // which the original site nests under dining-style tables.
    categories: ["dining", "tables1"],
    keywords: [
      "highboy",
      "pub table",
      "feasting",
      "biergarten",
      "bistro",
      "dining table",
      "farm table",
      "dining chair",
    ],
    requireKeyword: false, // dining accepts all; keywords filter tables1
  },
  {
    id: "lighting",
    categories: ["light", "lighting"],
    keywords: [],
    requireKeyword: false,
  },
  {
    id: "throws",
    // Anything left in pillows-throws1 / textiles after Pillows owner-tier match
    categories: ["pillows-throws1", "textiles"],
    keywords: [],
    requireKeyword: false,
  },
  {
    id: "large-decor",
    categories: ["large-decor"],
    keywords: [],
    requireKeyword: false,
  },
  {
    id: "accents",
    // accents1 catches everything else — vases, antlers, chalkboards, props,
    // suitcases, bottles, faux plants, mirrors, etc. Also picks up the few
    // unbranded "Akoya / Alumina / Lapis"-style tableware records that lack
    // a parseable noun in the title.
    categories: ["accents1", "tableware", "sofas-loveseats1"],
    keywords: [],
    requireKeyword: false,
  },
];

/**
 * Returns the derived browse-group id for a product, or `null` if it doesn't
 * match any rule. Display-only — never written back to the product object.
 */
export function getProductBrowseGroup(
  product: CollectionProduct,
): BrowseGroupId | null {
  const title = product.title.toLowerCase();
  for (const rule of BROWSE_RULES) {
    if (!rule.categories.includes(product.categorySlug)) continue;
    if (
      rule.excludeKeywords &&
      rule.excludeKeywords.some((kw) => title.includes(kw))
    ) {
      continue;
    }
    const keywordHit =
      rule.keywords.length === 0
        ? false
        : rule.keywords.some((kw) => title.includes(kw));

    if (rule.requireKeyword) {
      if (keywordHit) return rule.id;
      continue;
    }
    // requireKeyword === false: mono slug passes on category alone, others
    // need the keyword. If monoCategories is omitted, treat all `categories`
    // as mono (legacy behavior).
    const monoSlugs = rule.monoCategories ?? rule.categories;
    if (monoSlugs.includes(product.categorySlug)) return rule.id;
    if (keywordHit) return rule.id;
  }
  return null;
}

export interface BrowseGroupOption {
  id: BrowseGroupId;
  label: string;
  count: number;
  tier: BrowseTier;
}

/**
 * Returns priority-ordered options (owner first, safety-net after), restricted
 * to groups that have at least one matching product in the passed list. Empty
 * groups are hidden.
 *
 * NOTE: callers should pass the unfiltered public-ready set so the browse
 * line counts represent the real taxonomy, not the current search slice.
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

/**
 * Buckets products by browse group, preserving priority order in the
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
  const ordered = new Map<BrowseGroupId, CollectionProduct[]>();
  for (const id of BROWSE_GROUP_ORDER) {
    const list = buckets.get(id)!;
    if (list.length > 0) ordered.set(id, list);
  }
  return ordered;
}
