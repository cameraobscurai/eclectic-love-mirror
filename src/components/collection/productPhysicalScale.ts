import { canonicalCategorySlug } from "./categoryAliases";

/** Minimal shape needed to scale a product — any catalog/admin row satisfies it. */
export type ScalableProduct = {
  categorySlug?: string | null;
  dimensions?: string | null;
};

export type PhysicalDims = { width: number; height: number } | null;

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`\s*(?:"|”|''|in\b|inches)?\s*`;

/**
 * Parse real-world inches out of catalog dimension strings.
 * Handles `52"W x 30"D x 36.5"H`, `58"w x 18"D x 22"H`,
 * `36"Dia x 18.5"H`, and trailing notes like `- 20" Seat Height`.
 */
export function parseDimensionsInches(dimensions: string | null | undefined): PhysicalDims {
  if (!dimensions) return null;
  const s = dimensions.replace(/seat\s+height/gi, "");

  const wMatch =
    s.match(new RegExp(`${NUM}${UNIT}w\\b`, "i")) ??
    s.match(new RegExp(`${NUM}${UNIT}dia(?:meter)?\\b`, "i"));
  const hMatch = s.match(new RegExp(`${NUM}${UNIT}h\\b`, "i"));

  let width = wMatch ? Number(wMatch[1]) : null;
  let height = hMatch ? Number(hMatch[1]) : null;

  if (width == null || height == null) {
    // Fall back to a bare `W x D x H` triple.
    const triple = s.match(
      new RegExp(`${NUM}${UNIT}[x×]${UNIT}${NUM}${UNIT}[x×]${UNIT}${NUM}`, "i"),
    );
    if (triple) {
      width = width ?? Number(triple[1]);
      height = height ?? Number(triple[3]);
    }
  }

  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/** Back-compat helper — width only. */
export function parseWidthInches(dimensions: string | null | undefined): number | null {
  return parseDimensionsInches(dimensions)?.width ?? null;
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

  const dims = parseDimensionsInches(product.dimensions);
  // No usable measurement: sit at the neutral rule rather than inventing a
  // shrink. Unmeasured items would otherwise disagree with measured neighbours.
  if (!dims) return { size: 1, height: 1, measured: false };

  const refSize = Math.sqrt(benchmark.width * benchmark.height);
  const size = compress(Math.sqrt(dims.width * dims.height) / refSize);
  const height = compress(dims.height / benchmark.height);
  return { size, height, measured: true };
}

/** Legacy single-number accessor. */
export function physicalScale(product: ScalableProduct): number {
  return physicalScaleFor(product).size;
}
