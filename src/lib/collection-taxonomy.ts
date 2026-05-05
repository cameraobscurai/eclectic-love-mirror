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
  | "furs-pelts"
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
  bar:
    "Bar carts, back bars, and serving stations — pieces that make the act of pouring a drink part of the room.",
  storage:
    "Cabinets, credenzas, and consoles chosen for material and proportion, not just capacity.",
  lighting:
    "Floor, table, and pendant lighting selected for the quality of the light itself, not the fixture alone.",
  rugs:
    "Vintage and contemporary rugs in a range of weaves, palettes, and scales for grounding any setting.",
  pillows:
    "A library of textiles — vintage, custom, and hand-loomed — to layer texture and color across seating.",
  throws:
    "Hand-loomed and vintage textiles meant to be picked up, draped, and lived with.",
  tableware:
    "Plates, glassware, and flatware composed for the editorial table — quiet finishes, considered weight.",
  serveware:
    "Platters, pitchers, and serving vessels chosen as objects in their own right, not just utility.",
  styling:
    "Books, vessels, and small sculptural objects to finish a tablescape, mantel, or shelf.",
  accents:
    "Singular pieces — mirrors, screens, sculptural objects — that change the temperature of a room on contact.",
  "large-decor":
    "Architectural objects in scale — sculpture, vessels, and statement pieces meant to hold a room.",
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
  //
  // SLUG-AGNOSTIC TITLE OVERRIDES (high score, declared first).
  // Live Eclectic Hive site organizes inventory semantically — RMS slugs are
  // not authoritative for several known cross-slug families. These rules let
  // a high-confidence title phrase outrank the slug fallback. Keep the phrase
  // list narrow and unambiguous; vague single words must NOT live here or
  // they will whack-a-mole the rest of the table.

  {
    id: "bar",
    reason: "title: barstool/counter stool (slug-agnostic)",
    score: ({ title }) => {
      if (includesAny(title, ["barstool", "bar stool", "counter stool"])) return 360;
      return 0;
    },
  },
  {
    id: "bar",
    reason: "title: community table (slug-agnostic)",
    score: ({ title }) => (title.includes("community table") ? 360 : 0),
  },
  {
    id: "dining",
    reason: "title: dining chair / directors dining (slug-agnostic)",
    score: ({ title }) => {
      if (includesAny(title, ["dining chair", "directors dining"])) return 360;
      return 0;
    },
  },
  {
    id: "dining",
    reason: "title: banquette (slug-agnostic)",
    score: ({ title }) => (title.includes("banquette") ? 350 : 0),
  },
  {
    id: "dining",
    reason: "title: dining table / farm table (slug-agnostic)",
    score: ({ title }) => {
      if (includesAny(title, ["dining table", "farm table", "feasting"])) return 360;
      return 0;
    },
  },

  // NOTE: rules accept BOTH the new RMS catalog slugs (seating, tables, bars,
  // pillows-throws, storage, lighting, chandeliers, candlelight, furs-pelts)
  // AND the legacy phase3 slugs (lounge, tables1, lounge-tables, bars1,
  // cocktail-bar, pillows-throws1, textiles, storage1, light, accents1,
  // sofas-loveseats1, chairs-stools1, benches-ottomans1) so historical data
  // continues to classify cleanly.

  {
    id: "sofas",
    reason: "seating slug + sofa keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["seating", "lounge", "sofas-loveseats1"])) return 0;
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
    reason: "seating slug + chair keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["seating", "lounge", "chairs-stools1"])) return 0;
      // Exclude bench/ottoman/daybed — those route to benches-ottomans.
      if (includesAny(title, ["bench", "ottoman", "daybed", "pouf", "footstool", "banquette"])) {
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
    reason: "tables slug + 'coffee table' phrase",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["tables", "lounge-tables", "tables1"])) return 0;
      if (title.includes("coffee table")) return 320;
      return 0;
    },
  },

  {
    id: "side-tables",
    reason: "tables slug + side/end/console keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["tables", "lounge-tables", "tables1"])) return 0;
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
    reason: "tables/bars slug + cocktail/community keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["tables", "bars", "cocktail-bar", "lounge-tables", "tables1"])) return 0;
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
    reason: "pillows-throws slug + pillow keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["pillows-throws", "pillows-throws1", "textiles"])) return 0;
      if (includesAny(title, ["pillow", "lumbar"])) return 240;
      return 0;
    },
  },

  {
    id: "bar",
    reason: "bars slug + bar keyword",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["bars", "bars1", "cocktail-bar"])) return 0;
      const phrases = [
        "back bar",
        "backbar",
        "bar shelving",
        "counter stool",
      ];
      if (includesAny(title, phrases)) return 290;
      // Mono fallback: any product in the bars slug is a Bar piece.
      if (categorySlug === "bars") return 150;
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
      if (oneOf(categorySlug, ["storage", "storage1"])) return 200;
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
        "fork",
        "knife",
        "spoon",
        "flute",
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
      // Mono fallback for serveware slug — every item in the dedicated
      // serveware category should land here unless tableware claimed it.
      if (categorySlug === "serveware") return 150;
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
    reason: "styling/candlelight slug (mono)",
    score: ({ categorySlug }) =>
      oneOf(categorySlug, ["styling", "candlelight"]) ? 100 : 0,
  },

  // ===== SAFETY-NET TIER =====

  {
    id: "benches-ottomans",
    reason: "seating slug + bench/ottoman keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug === "benches-ottomans1") return 150;
      if (oneOf(categorySlug, ["seating", "lounge"])) {
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
    reason: "tables slug + dining-table keyword",
    score: ({ title, categorySlug }) => {
      if (categorySlug === "dining") return 150;
      if (oneOf(categorySlug, ["tables", "tables1"])) {
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
    reason: "lighting/chandelier slug",
    score: ({ categorySlug }) =>
      oneOf(categorySlug, ["lighting", "chandeliers", "light"]) ? 100 : 0,
  },

  {
    id: "throws",
    reason: "pillows-throws slug fallback (no pillow keyword)",
    score: ({ title, categorySlug }) => {
      if (!oneOf(categorySlug, ["pillows-throws", "pillows-throws1", "textiles"])) return 0;
      // Don't hijack pillow rows — those land in `pillows`.
      if (includesAny(title, ["pillow", "lumbar"])) return 0;
      return 80;
    },
  },

  {
    id: "furs-pelts",
    reason: "furs-pelts slug",
    score: ({ categorySlug }) => (categorySlug === "furs-pelts" ? 100 : 0),
  },

  {
    id: "large-decor",
    reason: "large-decor slug",
    score: ({ categorySlug }) =>
      categorySlug === "large-decor" ? 100 : 0,
  },

  {
    id: "accents",
    reason: "accents slug or unmatched fallback",
    score: ({ categorySlug }) => {
      if (categorySlug === "accents1") return 100;
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
