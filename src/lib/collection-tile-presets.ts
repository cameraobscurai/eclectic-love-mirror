/**
 * Product tile geometry.
 *
 * One invariant square frame for every product: same outer aspect, same image
 * fit, same inset. No category height math or row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "5 / 4";
export const PRODUCT_TILE_FRAME_ASPECT = 5 / 4;
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

