import { canonicalCategorySlug } from "./categoryAliases";

/** Minimal shape needed to scale a product — any catalog/admin row satisfies it. */
export type ScalableProduct = {
  categorySlug?: string | null;
  dimensions?: string | null;
};


export function parseWidthInches(dimensions: string | null | undefined): number | null {
  if (!dimensions) return null;

  // Prefer an explicit width token: 52"W, 52 in W, W 52.
  const explicit =
    dimensions.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in\b|inches)?\s*w\b/i) ??
    dimensions.match(/\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return Number(explicit[1]);

  // Otherwise accept the first number of a W x D x H triple only. A lone
  // number is ambiguous (could be depth or height) and must not drive scale.
  const triple = dimensions.match(
    /(\d+(?:\.\d+)?)\s*(?:"|”|in\b)?\s*[x×]\s*\d+(?:\.\d+)?/i,
  );
  return triple ? Number(triple[1]) : null;
}

/**
 * Reference width (inches) that reads as "full tile" for each floor-standing
 * category, and the smallest scale a narrow item may fall to.
 *
 * The range is deliberately narrow. Real-size differentiation is a nuance —
 * a 52" loveseat should read *slightly* smaller than a 96" sofa, not half its
 * size. Wide floors here were the cause of grids where silhouette widths never
 * landed on a common line and tiles looked randomly sized.
 *
 * Categories absent from this map are unscaled (scale 1) — small objects
 * (tableware, pillows, styling) are normalized by area, not real size.
 */
const WIDTH_BENCHMARKS: Record<string, { reference: number; floor: number }> = {
  seating: { reference: 78, floor: 0.88 },
  tables: { reference: 72, floor: 0.88 },
  bars: { reference: 60, floor: 0.9 },
  storage: { reference: 54, floor: 0.9 },
  "large-decor": { reference: 48, floor: 0.9 },
};

/**
 * Compression exponent. Raw width ratio is flattened before it is mapped into
 * the [floor, 1] band so the difference between a 52" and a 96" piece is a few
 * percent of tile width rather than a third of it.
 */
const COMPRESSION = 0.4;

export function physicalScale(product: ScalableProduct): number {
  const canonical = canonicalCategorySlug(product.categorySlug);
  if (!canonical) return 1;

  const benchmark = WIDTH_BENCHMARKS[canonical];
  if (!benchmark) return 1;

  const width = parseWidthInches(product.dimensions);
  // No usable measurement: sit at the top of the band rather than inventing a
  // shrink. Unmeasured items are the majority in several categories, and any
  // other choice makes them visibly disagree with their measured neighbours.
  if (!width || !Number.isFinite(width) || width <= 0) return 1;

  const ratio = Math.min(1, width / benchmark.reference);
  const compressed = Math.pow(ratio, COMPRESSION);
  return benchmark.floor + (1 - benchmark.floor) * compressed;
}

