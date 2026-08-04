import type { CollectionProduct } from "@/lib/phase3-catalog";
import { canonicalCategorySlug } from "./categoryAliases";

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
 * category, plus the fallback used when an item has no parseable width.
 *
 * `reference` is the measured p90 width of the live catalog for that category,
 * not a guess. Anything at or above p90 reads full-tile; everything else is
 * compressed toward the floor. Using a reference below p90 (the old numbers)
 * clamped most of a category to a single size and erased scale entirely.
 *
 * `typical` is the measured median. Items with no parseable dimensions get it
 * instead of 1 — an unknown item must NOT default to the largest size on the
 * grid, which is what the old `return 1` did to 27/76 tables and 17/26
 * large-decor pieces.
 *
 * Categories absent from this map are unscaled (scale 1) — small objects
 * (tableware, pillows, styling) are normalized by area, not real size.
 *
 * Measured 2026-08-04 against src/data/inventory/current_catalog.json.
 * Re-measure with scripts/audit/width-percentiles.mjs after a re-import.
 */
const WIDTH_BENCHMARKS: Record<
  string,
  { reference: number; typical: number; floor: number }
> = {
  seating: { reference: 84, typical: 28, floor: 0.42 },
  tables: { reference: 96, typical: 40, floor: 0.35 },
  bars: { reference: 144, typical: 87, floor: 0.4 },
  storage: { reference: 76, typical: 46, floor: 0.5 },
  "large-decor": { reference: 108, typical: 48, floor: 0.44 },
};

/**
 * Real width ratios span ~6:1 (a 16" stool vs a 98" sofa). Rendering that
 * linearly makes small pieces vanish, so the ratio is square-rooted: visual
 * AREA tracks real width instead of visual width. A 6:1 real range becomes a
 * legible ~2.4:1 on the grid, and the ordering is still truthful.
 */
const COMPRESSION = 0.5;

export function physicalScale(product: CollectionProduct): number {
  const canonical = canonicalCategorySlug(product.categorySlug);
  if (!canonical) return 1;

  const benchmark = WIDTH_BENCHMARKS[canonical];
  if (!benchmark) return 1;

  const parsed = parseWidthInches(product.dimensions);
  const width =
    parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : benchmark.typical;

  const ratio = Math.min(1, width / benchmark.reference);
  return Math.max(benchmark.floor, Math.min(1, Math.pow(ratio, COMPRESSION)));
}

