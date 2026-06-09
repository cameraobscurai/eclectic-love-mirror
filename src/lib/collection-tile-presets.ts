/**
 * Product tile geometry.
 *
 * The professional fix is one invariant frame for every product: same outer
 * aspect, same image fit, same inset. No category height math, no parent
 * overrides, no row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "4 / 5";
export const PRODUCT_TILE_IMAGE_CLASS = "object-contain object-center p-[8%]";
