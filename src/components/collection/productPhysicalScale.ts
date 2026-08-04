import type { CollectionProduct } from "@/lib/phase3-catalog";
import { canonicalCategorySlug } from "./categoryAliases";

/**
 * Nothing in this inventory is wider than 30 feet. A larger value is a data
 * entry error (e.g. CANYON 8' bar recorded as 96'W instead of 96"W) and must
 * not be allowed to skew the scale reference — treat it as unknown.
 */
const MAX_SANE_INCHES = 360;
const sane = (n: number) => (n > MAX_SANE_INCHES ? null : n);

export function parseWidthInches(dimensions: string | null | undefined): number | null {
  if (!dimensions) return null;

  // Feet first — `12'W` and `4.5'W` are common in the RMS export and were
  // previously unparseable, which silently sent 13 of the widest pieces
  // (every 12' ARCUS bar) down the unknown-width path.
  const feet =
    dimensions.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*w\b/i) ??
    dimensions.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b)\s*[x×]/i);
  if (feet) return sane(Number(feet[1]) * 12);

  // Explicit width token: 52"W, 52 in W, W 52.
  const explicit =
    dimensions.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in\b|inches)?\s*w\b/i) ??
    dimensions.match(/\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return sane(Number(explicit[1]));

  // Otherwise accept the first number of a W x D x H triple only. A lone
  // number is ambiguous (could be depth or height) and must not drive scale.
  const triple = dimensions.match(
    /(\d+(?:\.\d+)?)\s*(?:"|”|in\b)?\s*[x×]\s*\d+(?:\.\d+)?/i,
  );
  return triple ? sane(Number(triple[1])) : null;
}

/**
 * Median width per live subcategory, measured from the catalog. This is the
 * fallback for an item with no parseable dimensions.
 *
 * The category median is far too blunt here: `tables` has a median of 40",
 * but its side tables median 20" and its dining tables median 96". Falling
 * back to 40" made every unknown side table render larger than the side
 * tables whose real width we actually know — visible as a block of
 * identically oversized tiles in the lounge-tables grid.
 */
const SUBCATEGORY_TYPICAL: Record<string, number> = {
  benches: 63,
  chairs: 27,
  "dining chairs": 22,
  ottomans: 18,
  "sofas & loveseats": 82.5,
  stools: 16.5,
  "cocktail tables": 23.5,
  "coffee tables": 48,
  "community tables": 94,
  consoles: 52,
  "dining tables": 96,
  "side tables": 20,
  bars: 96,
  storage: 46,
  walls: 111,
  structures: 168,
};


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
  const sub = product.liveSubcategories?.[0]?.trim().toLowerCase();
  const fallback =
    (sub ? SUBCATEGORY_TYPICAL[sub] : undefined) ?? benchmark.typical;
  const width =
    parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;


  const ratio = Math.min(1, width / benchmark.reference);
  return Math.max(benchmark.floor, Math.min(1, Math.pow(ratio, COMPRESSION)));
}

