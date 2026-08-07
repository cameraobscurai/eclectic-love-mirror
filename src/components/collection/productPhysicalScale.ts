import { canonicalCategorySlug } from "./categoryAliases";

/** Minimal shape needed to scale a product — any catalog/admin row satisfies it. */
export type ScalableProduct = {
  categorySlug?: string | null;
  dimensions?: string | null;
  liveSubcategories?: string[] | null;
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
 * Reference size (inches) that reads as "full tile" for each floor-standing
 * category. `width`/`height` describe the archetype piece; scaling is driven by
 * the geometric mean of the two so a squat-but-tall loveseat and a long low
 * sofa are compared on real *mass*, not on one axis.
 *
 * Categories absent from this map are unscaled — small objects (tableware,
 * pillows, styling) are normalized by silhouette area, not real size.
 */
const SIZE_BENCHMARKS: Record<string, { width: number; height: number }> = {
  seating: { width: 78, height: 35 },
  tables: { width: 72, height: 30 },
  bars: { width: 60, height: 42 },
  storage: { width: 54, height: 40 },
  "large-decor": { width: 48, height: 40 },
};

/**
 * Median width per live subcategory, measured from the catalog. Used only as a
 * width fallback when an item has no parseable dimensions at all — the category
 * median is far too blunt (`tables` medians 40", but its side tables median 20"
 * and its dining tables 96").
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
 * Compression exponent. Raw real-size ratio is flattened before use so the
 * difference between a 52" loveseat and a 96" sofa is a readable nuance rather
 * than a 2x tile-mass gap.
 */
const COMPRESSION = 0.6;
const MIN_RATIO = 0.82;
const MAX_RATIO = 1.12;

function compress(ratio: number) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, Math.pow(ratio, COMPRESSION)));
}

export type PhysicalScale = {
  /** Overall mass multiplier from real size (geometric mean of W and H). */
  size: number;
  /** Height-only multiplier — caps genuinely short pieces that photograph tall. */
  height: number;
  /** True when real dimensions were parsed for a benchmarked category. */
  measured: boolean;
};

export function physicalScaleFor(product: ScalableProduct): PhysicalScale {
  const canonical = canonicalCategorySlug(product.categorySlug);
  const benchmark = canonical ? SIZE_BENCHMARKS[canonical] : undefined;
  if (!benchmark) return { size: 1, height: 1, measured: false };

  const refSize = Math.sqrt(benchmark.width * benchmark.height);
  const dims = parseDimensionsInches(product.dimensions);

  if (dims) {
    return {
      size: compress(Math.sqrt(dims.width * dims.height) / refSize),
      height: compress(dims.height / benchmark.height),
      measured: true,
    };
  }

  // Width-only measurement still carries real signal; assume the category's
  // archetype height so the mass term stays truthful on the axis we know.
  const sub = product.liveSubcategories?.[0]?.trim().toLowerCase();
  const width =
    parseWidthInches(product.dimensions) ??
    (sub ? SUBCATEGORY_TYPICAL[sub] : undefined);
  if (!width) return { size: 1, height: 1, measured: false };

  return {
    size: compress(Math.sqrt(width * benchmark.height) / refSize),
    height: 1,
    measured: true,
  };
}

