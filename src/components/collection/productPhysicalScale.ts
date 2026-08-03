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
 * category. Items narrower than the benchmark shrink proportionally so a 52"
 * loveseat never carries the same visual mass as a 98" sofa, and a 20" side
 * table never reads as large as a 96" dining table.
 *
 * Categories absent from this map are unscaled (scale 1) — small objects
 * (tableware, pillows, styling) are normalized by area, not real size.
 */
const WIDTH_BENCHMARKS: Record<string, { reference: number; floor: number }> = {
  seating: { reference: 78, floor: 0.64 },
  tables: { reference: 72, floor: 0.62 },
  bars: { reference: 60, floor: 0.7 },
  storage: { reference: 54, floor: 0.7 },
  "large-decor": { reference: 48, floor: 0.72 },
};

export function physicalScale(product: ScalableProduct): number {
  const canonical = canonicalCategorySlug(product.categorySlug);
  if (!canonical) return 1;

  const benchmark = WIDTH_BENCHMARKS[canonical];
  if (!benchmark) return 1;

  const width = parseWidthInches(product.dimensions);
  if (!width || !Number.isFinite(width) || width <= 0) return 1;

  return Math.max(benchmark.floor, Math.min(1, width / benchmark.reference));
}
