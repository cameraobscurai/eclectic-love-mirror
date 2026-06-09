/**
 * Product tile geometry.
 *
 * The professional fix is one invariant frame for every product: same outer
 * aspect, same image fit, same inset. No category height math, no parent
 * overrides, no row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "4 / 5";
// Reduced padding from 8% → 4%: NormalizedProductImage already normalises
// subject fill to ~75% of tile via canvas-measured bounding box + scale clamp.
// The old 8% doubled up the inset and made small/zoomed subjects appear tiny.
export const PRODUCT_TILE_IMAGE_CLASS = "object-contain object-center p-[4%]";
