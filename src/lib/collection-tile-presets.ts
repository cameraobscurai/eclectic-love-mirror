/**
 * Product tile geometry.
 *
 * The professional fix is one invariant frame for every product: same outer
 * aspect, same image fit, same inset. No category height math, no parent
 * overrides, no row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "4 / 5";
export const PRODUCT_TILE_FRAME_ASPECT = 4 / 5;
// Wide tile spans 2 columns. Aspect chosen so its rendered height matches a
// 1-column portrait tile (portrait 4/5 → row height = colW × 1.25;
// wide spans 2 cols → width = 2·colW, so aspect 2 / 1.25 = 8/5).
export const PRODUCT_TILE_WIDE_ASPECT = "8 / 5";
export const PRODUCT_TILE_WIDE_FRAME_ASPECT = 8 / 5;
// Reduced padding from 8% → 4%: NormalizedProductImage already normalises
// subject fill to ~75% of tile via canvas-measured bounding box + scale clamp.
// The old 8% doubled up the inset and made small/zoomed subjects appear tiny.
export const PRODUCT_TILE_IMAGE_CLASS = "object-contain object-center p-[4%]";

// Per-product tile fit overrides. Use sparingly — only for items where the
// global silhouette caps in NormalizedProductImage produce a visibly small
// subject (typically wide bars and consoles that hit the silhouette > 1.45
// branch with targetArea=0.16, maxH=0.32).
//
// scale: multiplied onto computed fit scale. 1.0 = no change. 1.4 ≈ +40%.
export const PRODUCT_TILE_OVERRIDES: Record<string, { scale?: number; offsetY?: number }> = {
  "2661": { scale: 1.45 },                       // JEPPERD BLACK TAMBOUR BAR
  "2811": { scale: 1.45 },                       // CANYON 8' NATURAL PINE BAR
  "1019": { scale: 1.45 },                       // BOYCE CONCRETE & BIRCH DOUBLE BAR
  "live-inola-gold-slatted-bar": { scale: 1.45 }, // GOLD ACRYLIC SLATTED BAR
};

/**
 * Per-product fit overrides to correct silhouettes that render too small
 * or hit caps in NormalizedProductImage.
 */
export const PRODUCT_TILE_OVERRIDES: Record<string, { targetArea?: number; maxW?: number; maxH?: number }> = {
  "2661": { // JEPPERD BLACK TAMBOUR BAR
    targetArea: 0.28,
    maxW: 0.92,
    maxH: 0.45,
  },
  "2811": { // CANYON 8' NATURAL PINE BAR
    targetArea: 0.22,
    maxH: 0.45,
  },
  "1019": { // BOYCE CONCRETE & BIRCH DOUBLE BAR
    targetArea: 0.28,
    maxW: 0.94,
  },
};
