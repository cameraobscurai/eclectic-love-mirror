import { canonicalCategorySlug } from "./categoryAliases";

/** Minimal shape needed to scale a product — any catalog/admin row satisfies it. */
export type ScalableProduct = {
  categorySlug?: string | null;
  dimensions?: string | null;
  liveSubcategories?: string[] | null;
  subcategory?: string | null;
};

export type PhysicalDims = { width: number; height: number } | null;

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`\s*(?:"|”|''|in\b|inches)?\s*`;

/**
 * Nothing in this inventory is wider than 30 feet. A larger value is a data
 * entry error (e.g. CANYON 8' bar recorded as 96'W instead of 96"W) and must
 * not be allowed to skew the scale reference — treat it as unknown.
 */
const MAX_SANE_INCHES = 360;
const sane = (n: number | null | undefined): number | null =>
  n == null || !Number.isFinite(n) || n <= 0 || n > MAX_SANE_INCHES ? null : n;

/** Feet tokens (`12'W`, `4.5' x 3'`) are common in the RMS export. */
function feetWidth(s: string): number | null {
  const m =
    s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*w\b/i) ??
    s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b)\s*[x×]/i);
  return m ? sane(Number(m[1]) * 12) : null;
}

function feetHeight(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*h\b/i);
  return m ? sane(Number(m[1]) * 12) : null;
}

/**
 * Parse real-world inches out of catalog dimension strings.
 * Handles `52"W x 30"D x 36.5"H`, `58"w x 18"D x 22"H`,
 * `36"Dia x 18.5"H`, `12'W x 30"H`, and trailing notes like `- 20" Seat Height`.
 */
export function parseDimensionsInches(
  dimensions: string | null | undefined,
): PhysicalDims {
  if (!dimensions) return null;
  const s = dimensions.replace(/seat\s+height/gi, "");

  const wMatch =
    s.match(new RegExp(`${NUM}${UNIT}w\\b`, "i")) ??
    s.match(new RegExp(`${NUM}${UNIT}dia(?:meter)?\\b`, "i"));
  const hMatch = s.match(new RegExp(`${NUM}${UNIT}h\\b`, "i"));

  let width = feetWidth(s) ?? (wMatch ? sane(Number(wMatch[1])) : null);
  let height = feetHeight(s) ?? (hMatch ? sane(Number(hMatch[1])) : null);

  if (width == null || height == null) {
    // Fall back to a bare `W x D x H` triple.
    const triple = s.match(
      new RegExp(`${NUM}${UNIT}[x×]${UNIT}${NUM}${UNIT}[x×]${UNIT}${NUM}`, "i"),
    );
    if (triple) {
      width = width ?? sane(Number(triple[1]));
      height = height ?? sane(Number(triple[3]));
    }
  }

  if (!width || !height) return null;
  return { width, height };
}

/** Back-compat helper — width only, feet-aware and sanity-capped. */
export function parseWidthInches(
  dimensions: string | null | undefined,
): number | null {
  if (!dimensions) return null;
  const s = dimensions.replace(/seat\s+height/gi, "");
  const feet = feetWidth(s);
  if (feet) return feet;
  const explicit =
    s.match(new RegExp(`${NUM}${UNIT}w\\b`, "i")) ??
    s.match(/\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return sane(Number(explicit[1]));
  const triple = s.match(new RegExp(`${NUM}${UNIT}[x×]\\s*\\d+(?:\\.\\d+)?`, "i"));
  return triple ? sane(Number(triple[1])) : null;
}

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

type Benchmark = {
  mass: number;
  height: number;
  n: number;
  w95?: number;
  h95?: number;
  /** Coefficient of variation of the shelf's real heights (baked). */
  hCv?: number;
};

const CATEGORY_BENCHMARKS = BENCHMARKS.categories as Record<string, Benchmark>;
const SUBCATEGORY_BENCHMARKS = BENCHMARKS.subcategories as Record<string, Benchmark>;

/**
 * Below this height spread, a shelf is height-invariant in the real world —
 * every bar is ~42" tall, every dining table ~30". Those shelves must render
 * at MATCHED HEIGHT and differ only in width, otherwise a 6' bar and a 12' bar
 * read as two unrelated products. Derived from the catalog, not hand-listed.
 */
const HEIGHT_UNIFORM_CV = 0.22;

/** True when this product's shelf should be solved on height, not on mass. */
export function isHeightUniformShelf(product: ScalableProduct): boolean {
  const canonical = canonicalCategorySlug(product.categorySlug);
  if (!canonical) return false;
  const key = subcategoryKey(product, canonical);
  const shelf = (key ? SUBCATEGORY_BENCHMARKS[key] : undefined) ?? CATEGORY_BENCHMARKS[canonical];
  return shelf?.hCv != null && shelf.hCv < HEIGHT_UNIFORM_CV;
}


/**
 * Categories whose tiles stand on a floor (or hang from a ceiling) and whose
 * real-world size is the dominant read. Only these switch the fit solver into
 * real-size mass matching; small centred objects get the multiplier applied to
 * their existing area target instead, which keeps their layout mode intact.
 */
const REAL_SIZE_CATEGORIES = new Set([
  "seating",
  "tables",
  "bars",
  "storage",
  "large-decor",
  "lighting",
  "chandeliers",
  "candlelight",
]);

/** Width-only rows: assume the catalog's typical width:height ratio. */
const WIDTH_ONLY_HEIGHT_RATIO = 0.62;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Ratios are flattened before use — real size is a nuance, not a multiplier war. */
const compress = (ratio: number, exponent: number, min: number, max: number) =>
  ratio > 0 ? clamp(Math.pow(ratio, exponent), min, max) : 1;

const WITHIN = { exponent: 0.45, min: 0.82, max: 1.18 };
const TIER = { exponent: 0.4, min: 0.72, max: 1.32 };
const HEIGHT = { exponent: 0.4, min: 0.8, max: 1.2 };
const WIDTH = { exponent: 0.45, min: 0.78, max: 1.22 };


function subcategoryKey(product: ScalableProduct, category: string): string | null {
  const sub = (product.liveSubcategories?.[0] ?? product.subcategory ?? "")
    .trim()
    .toLowerCase();
  return sub ? `${category}/${sub}` : null;
}

/** Real-world mass (inches) for one product, or null when nothing is parseable. */
function productMass(
  product: ScalableProduct,
): { mass: number; height: number | null; width: number | null } | null {
  const dims = parseDimensionsInches(product.dimensions);
  if (dims)
    return {
      mass: Math.sqrt(dims.width * dims.height),
      height: dims.height,
      width: dims.width,
    };
  const width = parseWidthInches(product.dimensions);
  if (width) return { mass: width * WIDTH_ONLY_HEIGHT_RATIO, height: null, width };
  return null;
}

export type PhysicalScale = {
  /** Overall mass multiplier relative to the product's neighbours. */
  size: number;
  /** Height-only multiplier — caps genuinely short pieces that photograph tall. */
  height: number;
  /** Width-only multiplier — a 98" sofa must out-span a 52" loveseat. */
  width: number;
  /** True when this category should be solved by real-world mass. */
  measured: boolean;
};

export function physicalScaleFor(product: ScalableProduct): PhysicalScale {
  const canonical = canonicalCategorySlug(product.categorySlug);
  const category = canonical ? CATEGORY_BENCHMARKS[canonical] : undefined;
  if (!canonical || !category) return { size: 1, height: 1, width: 1, measured: false };

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

  // The benchmarks store √(w·h) and h, so the shelf's typical width falls out
  // of them directly — no extra bake step, no hand-tuned constant.
  const refWidth = refHeight ? (shelf.mass * shelf.mass) / refHeight : 0;
  const width =
    measuredItem?.width && refWidth
      ? compress(measuredItem.width / refWidth, WIDTH.exponent, WIDTH.min, WIDTH.max)
      : 1;

  return {
    size: clamp(tier * within, 0.68, 1.32),
    height,
    width: clamp(width * tier, 0.7, 1.3),
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



/* ------------------------------------------------------------------ */
/* Absolute physical fit                                              */
/* ------------------------------------------------------------------ */

/**
 * Absolute physical fit — ONE inches-to-tile scale per category, applied to
 * BOTH axes.
 *
 * The old version solved width and height independently against separate
 * ceilings, which distorted aspect: a 52"W x 36.5"H loveseat picked up a large
 * height fraction while a 98"W x 30"H sofa saturated the width cap, so the
 * loveseat rendered with MORE visual mass than the sofa it is half the size of.
 *
 * Now: a single inches-per-tile-unit constant maps real dimensions onto the
 * tile. Width and height come out of the same multiplication, so the rendered
 * rectangle is a true scale model of the real piece. Compression is applied
 * uniformly to the pair (never per axis) so small pieces stay legible without
 * ever out-massing a larger neighbour.
 */
const WIDTH_CEILING = 0.97;
const HEIGHT_CEILING = 0.74;
/** Near-linear: 1.0 = literal scale model. Below 1 lifts the small end only. */
const PHYSICAL_EXPONENT = 0.85;
const MIN_FOOTPRINT = 0.26;

export type AbsoluteFit = { width: number; height: number };

/**
 * How far the inches-per-tile-unit leans on the SUBCATEGORY's own p90 piece
 * instead of the whole category's. 0 = pure category (a 22" stool measured
 * against a 12' bar renders as a speck), 1 = pure subcategory (a stool fills
 * its tile exactly like a bar, losing the size story). The blend keeps stools
 * legible on a shelf of bars while a bar still clearly out-masses a stool.
 */
const SUBCATEGORY_UNIT_BLEND = 0.6;

export function absoluteFitFor(product: ScalableProduct): AbsoluteFit | null {
  const canonical = canonicalCategorySlug(product.categorySlug);
  if (!canonical || !REAL_SIZE_CATEGORIES.has(canonical)) return null;

  type Ref = Benchmark & { w95?: number; h95?: number };
  const ref = CATEGORY_BENCHMARKS[canonical] as Ref | undefined;
  if (!ref?.w95 || !ref?.h95) return null;

  const item = productMass(product);
  if (!item?.width) return null;

  const height = item.height ?? item.width * WIDTH_ONLY_HEIGHT_RATIO;

  // Tile units per inch: whichever axis of the p90 piece binds first.
  const unitFor = (r: Ref) =>
    Math.min(WIDTH_CEILING / r.w95!, HEIGHT_CEILING / r.h95!);

  const catUnit = unitFor(ref);
  const subKey = subcategoryKey(product, canonical);
  const sub = (subKey ? SUBCATEGORY_BENCHMARKS[subKey] : undefined) as
    | Ref
    | undefined;
  const unit =
    sub?.w95 && sub?.h95 && sub.n >= 3
      ? Math.pow(catUnit, 1 - SUBCATEGORY_UNIT_BLEND) *
        Math.pow(unitFor(sub), SUBCATEGORY_UNIT_BLEND)
      : catUnit;

  let w = item.width * unit;
  let h = height * unit;


  // Uniform compression driven by the dominant axis — aspect is preserved.
  const dominant = Math.max(w, h);
  if (dominant > 0) {
    const s = Math.pow(dominant, PHYSICAL_EXPONENT - 1);
    w *= s;
    h *= s;
  }

  // Uniform down-scale if either ceiling is exceeded (still aspect-preserving).
  const over = Math.max(w / WIDTH_CEILING, h / HEIGHT_CEILING, 1);
  w /= over;
  h /= over;

  // Uniform lift so the very smallest measured piece stays visible.
  const under = Math.min(Math.max(w, h) / MIN_FOOTPRINT, 1);
  if (under > 0 && under < 1) {
    w /= under;
    h /= under;
  }

  return { width: w, height: h };
}

