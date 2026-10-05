import { canonicalCategorySlug } from "./categoryAliases";
import { parseDimensionsInches, parseWidthInches } from "@/lib/product-dimensions";

export { parseDimensionsInches, parseWidthInches } from "@/lib/product-dimensions";
export type { PhysicalDims } from "@/lib/product-dimensions";

/** Minimal shape needed to scale a product — any catalog/admin row satisfies it. */
export type ScalableProduct = {
  categorySlug?: string | null;
  dimensions?: string | null;
  liveSubcategories?: string[] | null;
  subcategory?: string | null;
};

/**
 * Neighbour-relative sizing.
 *
 * Products are never judged against an abstract archetype — they are judged
 * against the pieces beside them. So scaling runs in two tiers, both derived
 * from the catalog itself (see scripts/bake-size-benchmarks.ts):
 *
 *   1. Item vs. its subcategory median  — tight compression. A 96" sofa reads
 *      a touch larger than a 52" loveseat, not twice as large.
 *   2. Subcategory vs. its category median — looser compression. Side tables
 *      genuinely read smaller than dining tables, which is the cohesion a
 *      single per-category constant can never express.
 *
 * An item with no parseable dimensions inherits its subcategory median exactly
 * (tier 1 = 1.0), so it lands level with its neighbours instead of floating at
 * whatever size its photographer happened to crop.
 */
import BENCHMARKS from "@/data/inventory/size-benchmarks.json";

type Benchmark = { mass: number; height: number; n: number };

const CATEGORY_BENCHMARKS = BENCHMARKS.categories as Record<string, Benchmark>;
const SUBCATEGORY_BENCHMARKS = BENCHMARKS.subcategories as Record<string, Benchmark>;

/**
 * Categories whose tiles stand on a floor (or hang from a ceiling) and whose
 * real-world size is the dominant read. Only these switch the fit solver into
 * real-size mass matching; small centred objects get the multiplier applied to
 * their existing area target instead, which keeps their layout mode intact.
 */
// Lighting (`lighting`, `chandeliers`, `candlelight`, legacy `light`) is
// deliberately excluded: a hung fixture's bounding box carries no comparative
// meaning, so pooling it into one inches-per-tile unit made BOTOND a hairline
// beside ERIZO. Lighting keeps its category layout rule + relativeMassFor nudge.
// See mem://features/lighting-not-true-scaled.md — do NOT re-add lighting here.
const REAL_SIZE_CATEGORIES = new Set(["seating", "tables", "bars", "storage", "large-decor"]);

/** Width-only rows: assume the catalog's typical width:height ratio. */
const WIDTH_ONLY_HEIGHT_RATIO = 0.62;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Ratios are flattened before use — real size is a nuance, not a multiplier war. */
const compress = (ratio: number, exponent: number, min: number, max: number) =>
  ratio > 0 ? clamp(Math.pow(ratio, exponent), min, max) : 1;

const WITHIN = { exponent: 0.45, min: 0.82, max: 1.18 };
const TIER = { exponent: 0.4, min: 0.72, max: 1.32 };
const HEIGHT = { exponent: 0.4, min: 0.8, max: 1.2 };

function subcategoryKey(product: ScalableProduct, category: string): string | null {
  const sub = (product.liveSubcategories?.[0] ?? product.subcategory ?? "").trim().toLowerCase();
  return sub ? `${category}/${sub}` : null;
}

/** Real-world mass (inches) for one product, or null when nothing is parseable. */
function productMass(product: ScalableProduct): { mass: number; height: number | null } | null {
  const dims = parseDimensionsInches(product.dimensions);
  if (dims) return { mass: Math.sqrt(dims.width * dims.height), height: dims.height };
  const width = parseWidthInches(product.dimensions);
  if (width) return { mass: width * WIDTH_ONLY_HEIGHT_RATIO, height: null };
  return null;
}

export type PhysicalScale = {
  /** Overall mass multiplier relative to the product's neighbours. */
  size: number;
  /** Height-only multiplier — caps genuinely short pieces that photograph tall. */
  height: number;
  /** True when this category should be solved by real-world mass. */
  measured: boolean;
};

export function physicalScaleFor(product: ScalableProduct): PhysicalScale {
  const canonical = canonicalCategorySlug(product.categorySlug);
  const category = canonical ? CATEGORY_BENCHMARKS[canonical] : undefined;
  if (!canonical || !category) return { size: 1, height: 1, measured: false };

  const key = subcategoryKey(product, canonical);
  const shelf = (key ? SUBCATEGORY_BENCHMARKS[key] : undefined) ?? category;

  // Tier 2: how this shelf sits inside its category.
  const tier = compress(shelf.mass / category.mass, TIER.exponent, TIER.min, TIER.max);

  // Tier 1: how this item sits inside its shelf.
  const measuredItem = productMass(product);
  const within = measuredItem
    ? compress(measuredItem.mass / shelf.mass, WITHIN.exponent, WITHIN.min, WITHIN.max)
    : 1;

  const refHeight = shelf.height || category.height;
  const height =
    measuredItem?.height && refHeight
      ? compress(measuredItem.height / refHeight, HEIGHT.exponent, HEIGHT.min, HEIGHT.max)
      : 1;

  return {
    size: clamp(tier * within, 0.68, 1.32),
    height,
    measured: REAL_SIZE_CATEGORIES.has(canonical),
  };
}

/**
 * Neighbour-relative multiplier for categories that are *not* solved by real
 * size (tableware, pillows, styling, serveware, rugs, furs). Same two-tier
 * logic, applied as a gentle nudge to the category's area target so a crate
 * still reads bigger than a votive without changing how either is laid out.
 */
export function relativeMassFor(product: ScalableProduct): number {
  const scale = physicalScaleFor(product);
  return scale.measured ? 1 : scale.size;
}
