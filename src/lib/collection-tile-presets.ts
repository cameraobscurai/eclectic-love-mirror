/**
 * Product tile geometry.
 *
 * One invariant square frame for every product: same outer aspect, same image
 * fit, same inset. No category height math or row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "5 / 4";
export const PRODUCT_TILE_FRAME_ASPECT = 5 / 4;

/**
 * Frame shape per browse group.
 *
 * This is NOT scale tuning. Silhouette size is normalised against the base
 * frame in `resolveProductFit`, so a wider frame renders the same product at
 * the same pixel size — it only removes the dead vertical space above a
 * low-profile piece. A row of 12' bars in a 5:4 frame was ~60% empty.
 */
export const GROUP_FRAME_ASPECT: Record<string, number> = {
  bar: 1.9,
  "cocktail-tables": 1.7,
  "coffee-tables": 1.8,
  "side-tables": 1.35,
  dining: 1.6,
  sofas: 1.7,
  "benches-ottomans": 1.7,
  chairs: 1.35,
  storage: 1.35,
};

/** Tallest requirement wins, so a mixed grid never clips. */
export function frameAspectForGroups(groups: Iterable<string | null | undefined>): number {
  let aspect = Infinity;
  let seen = false;
  for (const g of groups) {
    seen = true;
    aspect = Math.min(aspect, (g && GROUP_FRAME_ASPECT[g]) || PRODUCT_TILE_FRAME_ASPECT);
  }
  return seen && Number.isFinite(aspect) ? aspect : PRODUCT_TILE_FRAME_ASPECT;
}
// Retired wide constants kept for import compatibility only. Public/admin grids
// now use the square constants above.
export const PRODUCT_TILE_WIDE_ASPECT = "8 / 5";
export const PRODUCT_TILE_WIDE_FRAME_ASPECT = 8 / 5;
// Reduced padding from 8% → 4%: NormalizedProductImage already normalises
// subject fill to ~75% of tile via canvas-measured bounding box + scale clamp.
// The old 8% doubled up the inset and made small/zoomed subjects appear tiny.
export const PRODUCT_TILE_IMAGE_CLASS = "object-contain object-center";

/**
 * Per-product vertical nudges. Scale and anchoring come from the single fit
 * pipeline (`resolveProductFit`); this is only for hand-tuned offsets on
 * individual products whose silhouette measurement sits off-baseline.
 */
export const PRODUCT_TILE_OVERRIDES: Record<string, { visualOffsetY?: number }> = {
};

