/**
 * Product tile geometry.
 *
 * One invariant square frame for every product: same outer aspect, same image
 * fit, same inset. No category height math or row-specific preset tuning.
 */

export const PRODUCT_TILE_ASPECT = "1 / 1";
export const PRODUCT_TILE_FRAME_ASPECT = 1;
// Retired wide constants kept for import compatibility only. Public/admin grids
// now use the square constants above.
export const PRODUCT_TILE_WIDE_ASPECT = "8 / 5";
export const PRODUCT_TILE_WIDE_FRAME_ASPECT = 8 / 5;
// Reduced padding from 8% → 4%: NormalizedProductImage already normalises
// subject fill to ~75% of tile via canvas-measured bounding box + scale clamp.
// The old 8% doubled up the inset and made small/zoomed subjects appear tiny.
export const PRODUCT_TILE_IMAGE_CLASS = "object-contain object-center p-[4%]";

/**
 * Per-product fit overrides — only for tiles where the global silhouette
 * caps in NormalizedProductImage produce a visibly small subject (wide bars
 * and consoles that hit the silhouette > 1.45 branch:
 * targetArea=0.16, maxW=0.78, maxH=0.32). Bumps are tuned per-product, not
 * global, so neighboring tiles in the same row are unaffected.
 */
export const PRODUCT_TILE_OVERRIDES: Record<
  string,
  { targetArea?: number; maxW?: number; maxH?: number; visualOffsetY?: number }
> = {
  // VOYAGE BLACK TRUNK BAR
  "2911": { targetArea: 0.22, maxW: 0.7, maxH: 0.62 },
  // EXCURSION CHAMPAGNE TRUNK BAR
  "2912": { targetArea: 0.22, maxW: 0.7, maxH: 0.62 },
  // JEPPERD BLACK TAMBOUR BAR — straight-on photo was overpowering the dense bar grid.
  "2661": { targetArea: 0.2, maxW: 0.9, maxH: 0.4 },
  // CANYON 8' NATURAL PINE BAR
  "2811": { targetArea: 0.22, maxH: 0.45 },
  // BOYCE CONCRETE & BIRCH DOUBLE BAR
  "1019": { targetArea: 0.28, maxW: 0.94 },
  // GOLD ACRYLIC SLATTED BAR
  "live-inola-gold-slatted-bar": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  // MONROE BLACK FLAT SLAT TAMBOUR BAR
  "4116": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  // INOLA 12' BLACK CONVERTIBLE BAR
  "3674": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  // ARCUSES / flat-front bars with baked bottom whitespace
  "2814": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  "2816": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  "3054": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  "2813": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
  "2540": { targetArea: 0.26, maxW: 0.9, maxH: 0.45 },
};
