/**
 * Category-aware fit rules for product tiles.
 *
 * Every silhouette in a category tile is scaled and translated so its
 * measured bounding box lands at a prescribed (x, y, w, h) in tile space,
 * within tolerance, or the least-bad clamp. See .lovable/plan.md
 * "Category-Aware Tile Fit System" for the full geometric contract.
 *
 * Numbers below are targets in tile-space (5:4 frame). Tuning happens
 * here — no component edits required.
 */

import { canonicalCategorySlug } from "./categoryAliases";

export type FitAnchor = "bottom" | "top" | "center";
export type FitPrimary = "width" | "height" | "area";

export type FitFallback = {
  scale: number;
  cx: number;
  cy: number;
  bottom: number;
  top: number;
};

export type FitRule = {
  primary: FitPrimary;
  /**
   * How much the primary-axis match bends toward equal visual *mass*.
   * 0 = pure width (or height) matching; 1 = pure area matching.
   * Lets a tall, short-bodied loveseat stop out-massing a long low sofa that
   * shares its silhouette width. Paired with `refAspect`.
   */
  aspectBlend?: number;
  /** Silhouette aspect (w/h) that renders exactly at `primaryTarget`. */
  refAspect?: number;
  /** Silhouette W, H, or √area target in tile units (0–1). */

  primaryTarget: number;
  /** Secondary-axis cap (opposite of primary). Ignored for area. */
  secondaryMax: number;
  anchor: FitAnchor;
  /** Tile-space y for the anchor edge (0 = top, 1 = bottom). */
  anchorY: number;
  /** Horizontal placement of the silhouette centroid (tile-space x). */
  centerX: number;
  clampMin: number;
  clampMax: number;
  fallback: FitFallback;
};

const FLOOR_FALLBACK: FitFallback = {
  scale: 0.95,
  cx: 0.5,
  cy: 0.55,
  bottom: 0.9,
  top: 0.2,
};

const CENTER_FALLBACK: FitFallback = {
  scale: 0.95,
  cx: 0.5,
  cy: 0.5,
  bottom: 0.75,
  top: 0.25,
};

const CEILING_FALLBACK: FitFallback = {
  scale: 0.95,
  cx: 0.5,
  cy: 0.45,
  bottom: 0.8,
  top: 0.1,
};

const DEFAULT_RULE: FitRule = {
  primary: "area",
  primaryTarget: 0.32,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
  clampMin: 0.7,
  clampMax: 1.2,
  fallback: CENTER_FALLBACK,
};

const RULES: Record<string, FitRule> = {
  seating: {
    // Width alone is the wrong axis for seating. A 1.5-aspect carved loveseat
    // (Cosette) matched on width to a 3.4-aspect sofa ends up with ~2x its
    // silhouette area — reads as a giant next to its neighbours. Blend toward
    // equal mass and let the height cap actually bind on tall backs.
    primary: "width",
    aspectBlend: 0.65,
    refAspect: 2.4,
    primaryTarget: 0.82,
    secondaryMax: 0.58,
    anchor: "bottom",
    anchorY: 0.9,
    centerX: 0.5,
    clampMin: 0.7,
    clampMax: 1.1,
    fallback: FLOOR_FALLBACK,
  },
  tables: {
    primary: "width",
    aspectBlend: 0.5,
    refAspect: 2.0,
    primaryTarget: 0.8,
    secondaryMax: 0.6,
    anchor: "bottom",
    anchorY: 0.9,
    centerX: 0.5,

    clampMin: 0.7,
    clampMax: 1.1,
    fallback: FLOOR_FALLBACK,
  },
  bars: {
    primary: "height",
    primaryTarget: 0.6,
    secondaryMax: 0.7,
    anchor: "bottom",
    anchorY: 0.9,
    centerX: 0.5,
    clampMin: 0.55,
    clampMax: 1.1,
    fallback: FLOOR_FALLBACK,
  },
  lighting: {
    primary: "height",
    primaryTarget: 0.72,
    secondaryMax: 0.55,
    anchor: "bottom",
    anchorY: 0.92,
    centerX: 0.5,
    clampMin: 0.5,
    clampMax: 1.15,
    fallback: FLOOR_FALLBACK,
  },
  chandeliers: {
    primary: "height",
    primaryTarget: 0.78,
    secondaryMax: 0.6,
    anchor: "top",
    anchorY: 0.08,
    centerX: 0.5,
    clampMin: 0.5,
    clampMax: 1.15,
    fallback: CEILING_FALLBACK,
  },
  candlelight: {
    primary: "height",
    primaryTarget: 0.55,
    secondaryMax: 0.55,
    anchor: "bottom",
    anchorY: 0.85,
    centerX: 0.5,
    clampMin: 0.6,
    clampMax: 1.15,
    fallback: FLOOR_FALLBACK,
  },
  tableware: {
    primary: "area",
    primaryTarget: 0.3,
    secondaryMax: 0.9,
    anchor: "center",
    anchorY: 0.5,
    centerX: 0.5,
    clampMin: 0.75,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
  serveware: {
    primary: "area",
    primaryTarget: 0.32,
    secondaryMax: 0.9,
    anchor: "center",
    anchorY: 0.5,
    centerX: 0.5,
    clampMin: 0.75,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
  "pillows-throws": {
    primary: "area",
    primaryTarget: 0.42,
    secondaryMax: 0.9,
    anchor: "center",
    anchorY: 0.5,
    centerX: 0.5,
    clampMin: 0.75,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
  rugs: {
    primary: "width",
    primaryTarget: 0.88,
    secondaryMax: 0.35,
    anchor: "center",
    anchorY: 0.55,
    centerX: 0.5,
    clampMin: 0.6,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
  "large-decor": {
    primary: "height",
    primaryTarget: 0.72,
    secondaryMax: 0.62,
    anchor: "bottom",
    anchorY: 0.9,
    centerX: 0.5,
    clampMin: 0.55,
    clampMax: 1.15,
    fallback: FLOOR_FALLBACK,
  },
  storage: {
    primary: "height",
    primaryTarget: 0.68,
    secondaryMax: 0.62,
    anchor: "bottom",
    anchorY: 0.9,
    centerX: 0.5,
    clampMin: 0.55,
    clampMax: 1.15,
    fallback: FLOOR_FALLBACK,
  },
  styling: {
    primary: "area",
    primaryTarget: 0.34,
    secondaryMax: 0.9,
    anchor: "center",
    anchorY: 0.55,
    centerX: 0.5,
    clampMin: 0.75,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
  "furs-pelts": {
    primary: "area",
    primaryTarget: 0.42,
    secondaryMax: 0.9,
    anchor: "center",
    anchorY: 0.55,
    centerX: 0.5,
    clampMin: 0.75,
    clampMax: 1.2,
    fallback: CENTER_FALLBACK,
  },
};

export function resolveFit(categorySlug: string | null | undefined): FitRule {
  const canonical = canonicalCategorySlug(categorySlug);
  if (!canonical) return DEFAULT_RULE;
  return RULES[canonical] ?? DEFAULT_RULE;
}

export { DEFAULT_RULE };
