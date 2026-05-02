/**
 * Collection Taxonomy — single source of truth.
 *
 * This module owns ALL classification logic for the Collection page:
 *   - browse group assignment (the left rail / overview categories)
 *   - subgroup assignment (chips within a group, future Phase C)
 *   - search synonyms (future Phase B)
 *
 * Design contract:
 *   - Pure, deterministic, side-effect free. Same input → same output.
 *   - Display-only. NEVER mutates phase3_catalog.json or product records.
 *   - `classify(product)` is the ONLY entry point for routing decisions.
 *     Every UI consumer goes through it (directly or via the legacy
 *     re-export shims in collection-browse-groups.ts).
 *
 * Rule engine:
 *   - Rules are an ORDERED, DECLARATIVE array of predicates.
 *   - Each rule produces a `score` (higher = more confident).
 *   - We evaluate ALL rules and pick the highest scorer.
 *   - Ties break by array order (first declared wins). This is documented
 *     and enforced by the test fixture, so reordering rules is a meaningful,
 *     reviewable change — not an accidental side-effect.
 *
 * Why scoring instead of "first match wins":
 *   The original (legacy) engine bailed at the first match, which made
 *   inherently ambiguous pieces (a "console table" — Side Tables vs Storage?)
 *   subtly wrong depending on rule ordering. Scoring lets specific rules
 *   (long phrase + correct slug) outrank vague ones (single word in the
 *   wrong slug) without forcing the rest of the table into a brittle
 *   priority gauntlet.
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
  | "accents";

export type BrowseTier = "owner" | "safety-net";

/** Phase A delivers groups only. Subgroups land in Phase C. */
export interface ClassificationTrace {
  /** Each rule that produced a non-zero score, in evaluation order. */
  candidates: Array<{
    id: BrowseGroupId;
    score: number;
    /** Short human label for why this rule fired. Useful in admin audit. */
    reason: string;
  }>;
  /** The winning rule (highest score, ties broken by declaration order). */
  winnerId: BrowseGroupId;
  /** Confidence of the winner: winner.score - secondBest.score (0 if alone). */
  margin: number;
}

export interface Classification {
  group: BrowseGroupId;
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

// ─────────────────────────────────────────────────────────────────────────────
// Rule engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A predicate that, given a product's normalized fields, returns a score:
 *   - 0   → did not fire
 *   - >0  → fired with this much confidence
 *
 * Higher scores beat lower scores. Recommended scoring band:
 *   - 100  exact category fallback (mono slug, no keyword needed)
 *   - 200  category match + single keyword hit
 *   - 300  category match + multi-word phrase hit (more specific)
 *   - 400  category match + exact-noun hit (e.g. title === "Sofa")
 *   - 50   safety-net category fallback (lowest priority among real matches)
 */
interface NormalizedFields {
  /** Lower-cased title with surrounding whitespace stripped. */
  title: string;
  categorySlug: string;
}

interface Rule {
  id: BrowseGroupId;
  /** Short label used in trace output (admin audit). */
  reason: string;
  /** Returns score (>0 to fire, 0 to skip). */
  score: (f: NormalizedFields) => number;
}

// Helpers (kept local — these aren't part of the public API).

const includesAny = (haystack: string, needles: string[]): string | null => {
  for (const n of needles) {
    if (haystack.includes(n)) return n;
  }
  return null;
};

const oneOf = (slug: string, slugs: string[]) => slugs.includes(slug);

// ─────────────────────────────────────────────────────────────────────────────
// Rules
//
// Order matters ONLY as a tie-breaker. Score is the primary signal.
// Each rule documents its slug gate + keyword logic inline so a non-author
// can audit a misclassification without reading the engine.
// ─────────────────────────────────────────────────────────────────────────────

const RULES: Rule[] = [
  // ===== OWNER TIER =====

  {
    id: "sofas",
    reason: "lounge/sofa slug + sofa keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["lounge", "sofas-loveseats1"])) return 0;
      const hit = includesAny(title, [
        "sofa",
        "loveseat",
        "settee",
        "couch",
        "sectional",
      ]);
      if (!hit) return 0;
      return hit.length >= 6 ? 300 : 220;
    },
  },

  {
    id: "chairs",
    reason: "lounge/chairs slug + chair keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["lounge", "chairs-stools1"])) return 0;
      // Exclude bench/ottoman/daybed — those route to benches-ottomans.
      if (includesAny(title, ["bench", "ottoman", "daybed", "pouf", "footstool"])) {
        return 0;
      }
      const hit = includesAny(title, [
        "armchair",
        "lounge chair",
        "barstool",
        "stool",
        "chair",
      ]);
      if (!hit) return 0;
      return hit.length >= 6 ? 280 : 210;
    },
  },

  {
    id: "coffee-tables",
    reason: "table slug + 'coffee table' phrase",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["lounge-tables", "tables1"])) return 0;
      if (title.includes("coffee table")) return 320;
      return 0;
    },
  },

  {
    id: "side-tables",
    reason: "table slug + side/end/console keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["lounge-tables", "tables1"])) return 0;
      const phrases = [
        "side table",
        "end table",
        "accent table",
        "drink table",
        "entry table",
        "sofa table",
        "tea table",
      ];
      if (includesAny(title, phrases)) return 310;
      if (includesAny(title, ["console", "column"])) return 240;
      return 0;
    },
  },

  {
    id: "cocktail-tables",
    reason: "cocktail/lounge slug + cocktail/community keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["cocktail-bar", "lounge-tables", "tables1"])) return 0;
      if (
        includesAny(title, [
          "cocktail table",
          "community table",
          "cocktail column",
        ])
      ) {
        return 320;
      }
      return 0;
    },
  },

  {
    id: "rugs",
    reason: "rugs slug (mono)",
    score: ({ categorySlug }) => (categorySlug === "rugs" ? 100 : 0),
  },

  {
    id: "pillows",
    reason: "textile/pillow slug + pillow keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["pillows-throws1", "textiles"])) return 0;
      if (includesAny(title, ["pillow", "lumbar"])) return 240;
      return 0;
    },
  },

  {
    id: "bar",
    reason: "bar slug + bar keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["bars1", "cocktail-bar"])) return 0;
      const phrases = [
        "back bar",
        "backbar",
        "bar shelving",
        "counter stool",
      ];
      if (includesAny(title, phrases)) return 290;
      if (includesAny(title, ["bar", "shelving", "shelf", "counter"])) {
        return 210;
      }
      return 0;
    },
  },

  {
    id: "storage",
    reason: "storage slug (mono) or cabinet keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug === "storage1") return 200;
      if (
        categorySlug === "cocktail-bar" &&
        includesAny(title, ["cabinet", "credenza", "trunk", "chest", "armoire"])
      ) {
        return 230;
      }
      return 0;
    },
  },

  {
    id: "tableware",
    reason: "tableware slug + dining piece keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug !== "tableware") return 0;
      const kws = [
        "dinnerware",
        "flatware",
        "plate",
        "bowl",
        "goblet",
        "glassware",
        "glass",
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
      ];
      if (includesAny(title, kws)) return 230;
      return 0;
    },
  },

  {
    id: "serveware",
    reason: "tableware/serveware slug + serving keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["tableware", "serveware"])) return 0;
      const kws = [
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
      ];
      if (includesAny(title, kws)) return 240;
      return 0;
    },
  },

  {
    id: "styling",
    reason: "styling slug (mono)",
    score: ({ categorySlug }) => (categorySlug === "styling" ? 100 : 0),
  },

  // ===== SAFETY-NET TIER =====

  {
    id: "benches-ottomans",
    reason: "benches slug or seating keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug === "benches-ottomans1") return 150;
      if (categorySlug === "lounge") {
        if (
          includesAny(title, [
            "bench",
            "ottoman",
            "daybed",
            "pouf",
            "footstool",
            "banquette",
          ])
        ) {
          return 230;
        }
      }
      return 0;
    },
  },

  {
    id: "dining",
    reason: "dining slug or dining-table keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug === "dining") return 150;
      if (categorySlug === "tables1") {
        const phrases = [
          "dining table",
          "farm table",
          "highboy",
          "pub table",
          "feasting",
          "biergarten",
          "bistro",
          "dining chair",
          "bar table",
          "counter table",
        ];
        if (includesAny(title, phrases)) return 230;
      }
      return 0;
    },
  },

  {
    id: "lighting",
    reason: "lighting slug",
    score: ({ categorySlug }) =>
      oneOf(categorySlug, ["light", "lighting"]) ? 100 : 0,
  },

  {
    id: "throws",
    reason: "textile/pillow slug fallback (no pillow keyword)",
    score: ({ categorySlug }) =>
      oneOf(categorySlug, ["pillows-throws1", "textiles"]) ? 50 : 0,
  },

  {
    id: "large-decor",
    reason: "large-decor slug",
    score: ({ categorySlug }) => (categorySlug === "large-decor" ? 100 : 0),
  },

  {
    id: "accents",
    reason: "accents slug or unmatched-table fallback",
    score: ({ categorySlug }) => {
      if (categorySlug === "accents1") return 100;
      // Catch-all for cocktail-bar/tableware/sofas-loveseats1/tables1 stragglers
      // that nothing else claimed. Lowest meaningful score so any real owner
      // rule beats it.
      if (
        oneOf(categorySlug, [
          "cocktail-bar",
          "tableware",
          "sofas-loveseats1",
          "tables1",
        ])
      ) {
        return 30;
      }
      return 0;
    },
  },
];

// Sanity guarantee: rule order must be honored as a tie-break. The exported
// constant lets tests assert ordering hasn't drifted.
export const RULE_ORDER: BrowseGroupId[] = RULES.map((r) => r.id);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a product into a single browse group + return the trace of which
 * rules fired. Result is deterministic and side-effect free.
 *
 * Fallback contract: if NO rule fires (truly unrecognized slug), returns
 * "accents" with margin 0 and an empty candidate list. UI should treat
 * margin 0 + empty candidates as the explicit fallback signal.
 */
export function classify(product: CollectionProduct): Classification {
  const fields: NormalizedFields = {
    title: product.title.toLowerCase(),
    categorySlug: product.categorySlug,
  };

  const candidates: ClassificationTrace["candidates"] = [];
  for (const rule of RULES) {
    const score = rule.score(fields);
    if (score > 0) {
      candidates.push({ id: rule.id, score, reason: rule.reason });
    }
  }

  if (candidates.length === 0) {
    return {
      group: "accents",
      trace: { candidates: [], winnerId: "accents", margin: 0 },
    };
  }

  // Sort by score desc, ties broken by declaration order (stable sort + we
  // pushed in declaration order, so a stable sort preserves it for equal scores).
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const second = sorted[1];
  const margin = second ? winner.score - second.score : winner.score;

  return {
    group: winner.id,
    trace: { candidates: sorted, winnerId: winner.id, margin },
  };
}

/** Convenience: just the group id (legacy API shape). */
export function getProductBrowseGroup(
  product: CollectionProduct,
): BrowseGroupId {
  return classify(product).group;
}

export interface BrowseGroupOption {
  id: BrowseGroupId;
  label: string;
  count: number;
  tier: BrowseTier;
}

export function getBrowseGroupOptions(
  products: CollectionProduct[],
): BrowseGroupOption[] {
  const counts = new Map<BrowseGroupId, number>();
  for (const p of products) {
    const id = classify(p).group;
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
    const id = classify(p).group;
    buckets.get(id)!.push(p);
  }
  const ordered = new Map<BrowseGroupId, CollectionProduct[]>();
  for (const id of BROWSE_GROUP_ORDER) {
    const list = buckets.get(id)!;
    if (list.length > 0) ordered.set(id, list);
  }
  return ordered;
}
