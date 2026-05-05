/**
 * Parent → Subcategory taxonomy for the Collection browse interface.
 *
 * This module sits ABOVE collection-taxonomy.ts (which classifies each product
 * into one of 18 BrowseGroupIds). Parents are a strict superset: every
 * BrowseGroupId maps to exactly one ParentId.
 *
 * Pure data + helpers. No UI. No catalog mutation. No image logic.
 */

import type { CollectionProduct } from "./phase3-catalog";
import {
  getProductBrowseGroup,
  type BrowseGroupId,
} from "./collection-browse-groups";

// ─────────────────────────────────────────────────────────────────────────────
// Parents
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
  "cocktail-bar": "Cocktail & Bar",
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
 * The contextual rail per parent. "all" is implicit and rendered first by the
 * UI; do NOT include it here. Rugs explicitly keeps a single "rugs" entry so
 * the rail reads "All / Rugs", matching the live site.
 */
export const PARENT_SUBS: Record<ParentId, SubOption[]> = {
  "lounge-seating": [
    { id: "benches", label: "Benches" },
    { id: "chairs", label: "Chairs" },
    { id: "ottomans", label: "Ottomans" },
    { id: "sofas-loveseats", label: "Sofas & Loveseats" },
  ],
  "lounge-tables": [
    { id: "coffee-tables", label: "Coffee Tables" },
    { id: "consoles", label: "Consoles" },
    { id: "side-tables", label: "Side Tables" },
  ],
  "cocktail-bar": [
    { id: "bars", label: "Bars" },
    { id: "cocktail-tables", label: "Cocktail Tables" },
    { id: "community-tables", label: "Community Tables" },
    { id: "stools", label: "Stools" },
    { id: "storage", label: "Storage" },
  ],
  "dining": [
    { id: "consoles", label: "Consoles" },
    { id: "dining-chairs", label: "Dining Chairs" },
    { id: "dining-tables", label: "Dining Tables" },
  ],
  "tableware": [
    { id: "dinnerware", label: "Dinnerware" },
    { id: "flatware", label: "Flatware" },
    { id: "glassware", label: "Glassware" },
    { id: "serveware", label: "Serveware" },
  ],
  "lighting": [
    { id: "candlelight", label: "Candlelight" },
    { id: "chandeliers", label: "Chandeliers" },
    { id: "lamps", label: "Lamps" },
    { id: "specialty", label: "Specialty" },
  ],
  "textiles": [
    { id: "pillows", label: "Pillows" },
    { id: "throws", label: "Throws" },
  ],
  "rugs": [{ id: "rugs", label: "Rugs" }],
  "styling": [
    { id: "accents", label: "Accents" },
    { id: "crates-baskets", label: "Crates & Baskets" },
    { id: "games", label: "Games" },
  ],
  "large-decor": [
    { id: "structures", label: "Structures" },
    { id: "walls", label: "Walls" },
    { id: "other", label: "Other" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// BrowseGroupId → ParentId (exhaustive, all 18 groups)
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
};

export function productParent(p: CollectionProduct): ParentId | null {
  const g = getProductBrowseGroup(p);
  return g ? GROUP_TO_PARENT[g] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing tile → { parent, sub } mapping
// CategoryTonalGrid stays purely visual; the route uses this to translate a
// tile click (BrowseGroupId) into the new parent/subcategory URL state.
// ─────────────────────────────────────────────────────────────────────────────

export const TILE_TO_PARENT_SUB: Record<
  BrowseGroupId,
  { parent: ParentId; sub: string }
> = {
  sofas: { parent: "lounge-seating", sub: "sofas-loveseats" },
  chairs: { parent: "lounge-seating", sub: "chairs" },
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
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcategory classification
//
// Pure title-keyword + BrowseGroupId/categorySlug fallback. NEVER mutates the
// product. Returning null is fine — those items still appear in the parent's
// "All" view (the filter pipeline guarantees this).
// ─────────────────────────────────────────────────────────────────────────────

const has = (t: string, kws: string[]) => kws.some((k) => t.includes(k));

function classifySub(parent: ParentId, p: CollectionProduct): string | null {
  const g = getProductBrowseGroup(p);
  const t = p.title.toLowerCase();
  const cat = (p.categorySlug ?? "").toLowerCase();

  switch (parent) {
    case "lounge-seating": {
      if (g === "sofas" || has(t, ["sofa", "loveseat", "settee", "couch"]))
        return "sofas-loveseats";
      if (has(t, ["ottoman", "pouf", "footstool"])) return "ottomans";
      if (has(t, ["bench", "daybed"])) return "benches";
      if (g === "chairs" || has(t, ["armchair", "lounge chair", "chair"]))
        return "chairs";
      return null;
    }
    case "lounge-tables": {
      if (g === "coffee-tables" || has(t, ["coffee table"]))
        return "coffee-tables";
      if (
        g === "side-tables" ||
        has(t, ["side table", "end table", "accent table", "drink table"])
      )
        return "side-tables";
      if (has(t, ["console", "entry table", "sofa table"])) return "consoles";
      return null;
    }
    case "cocktail-bar": {
      if (g === "cocktail-tables" || has(t, ["cocktail table"]))
        return "cocktail-tables";
      if (has(t, ["barstool", "stool"])) return "stools";
      if (has(t, ["community table", "long table"])) return "community-tables";
      if (g === "storage" || has(t, ["cabinet", "credenza", "sideboard"]))
        return "storage";
      if (g === "bar" || has(t, ["back bar", "backbar", "bar cart", "bar"]))
        return "bars";
      return null;
    }
    case "dining": {
      if (has(t, ["dining chair", "directors dining", "banquette"])) return "dining-chairs";
      if (has(t, ["dining table", "farm table", "feasting"])) return "dining-tables";
      if (has(t, ["console", "sideboard", "buffet"])) return "consoles";
      if (has(t, ["chair"])) return "dining-chairs";
      if (has(t, ["table"])) return "dining-tables";
      return null;
    }
    case "tableware": {
      if (g === "serveware" || has(t, ["platter", "pitcher", "tureen", "server", "tray"]))
        return "serveware";
      if (
        cat === "glassware" ||
        has(t, ["glass", "goblet", "tumbler", "stemware", "coupe", "carafe", "decanter", "flute"])
      )
        return "glassware";
      if (has(t, ["flatware", "fork", "spoon", "knife", "cutlery", "utensil"]))
        return "flatware";
      if (has(t, ["plate", "charger", "dish", "dinnerware", "bowl"]))
        return "dinnerware";
      return null;
    }
    case "lighting": {
      // Order matters: candle keywords first (most specific), then specialty
      // (sconces / string / par / wash / battery), then chandeliers (which
      // include pendants per live site), then lamps as the residual.
      if (
        cat === "candlelight" ||
        has(t, ["candle", "votive", "hurricane", "taper", "candelabr", "lantern", "luminary", "oil lamp"])
      )
        return "candlelight";
      if (
        has(t, [
          "sconce",
          "uplight",
          "string light",
          "festoon",
          "wash light",
          "par can",
          " par ",
          "market light",
          "corner light",
          "battery",
        ])
      )
        return "specialty";
      if (cat === "chandeliers" || has(t, ["chandelier", "pendant"])) return "chandeliers";
      if (has(t, ["lamp"])) return "lamps";
      return "specialty";
    }
    case "textiles": {
      if (g === "pillows" || has(t, ["pillow", "cushion", "bolster"]))
        return "pillows";
      if (g === "throws" || has(t, ["throw", "blanket", "coverlet"]))
        return "throws";
      return null;
    }
    case "rugs":
      return "rugs";
    case "styling": {
      if (has(t, ["crate", "basket", "bin"])) return "crates-baskets";
      if (has(t, ["game", "chess", "domino", "backgammon", "cards", "puzzle"]))
        return "games";
      if (
        g === "accents" ||
        has(t, ["mirror", "sculpture", "vase", "vessel", "object", "accent"])
      )
        return "accents";
      return null;
    }
    case "large-decor": {
      if (has(t, ["wall", "panel", "mural", "tapestry", "art", "painting"]))
        return "walls";
      if (
        has(t, [
          "arch",
          "arbor",
          "structure",
          "column",
          "pedestal",
          "fireplace",
          "firepit",
          "screen",
          "divider",
        ])
      )
        return "structures";
      return "other";
    }
  }
}

export function productMatchesSub(
  p: CollectionProduct,
  parent: ParentId,
  sub: string,
): boolean {
  if (sub === "all") return true;
  return classifySub(parent, p) === sub;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

const PARENT_SET = new Set<string>(PARENT_ORDER);
export function isParentId(value: string): value is ParentId {
  return PARENT_SET.has(value);
}

const TILE_KEYS = new Set<string>(Object.keys(TILE_TO_PARENT_SUB));
/** True if `s` is one of the 18 legacy BrowseGroupId strings used in old URLs. */
export function isLegacyTileId(s: string): s is BrowseGroupId {
  return TILE_KEYS.has(s);
}
