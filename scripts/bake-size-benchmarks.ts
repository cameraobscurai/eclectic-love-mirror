/**
 * Bake real-world size benchmarks from the catalog.
 *
 * Why: product tiles must read cohesively *against their neighbours*. A side
 * table's neighbours are other side tables, not dining tables — so a single
 * hand-tuned per-category archetype is always wrong for half the rows.
 *
 * This derives, straight from the shipped catalog:
 *   - per category: median silhouette mass (sqrt(W*H) in inches) + median height
 *   - per subcategory: the same, when there are enough measured rows to trust
 *
 * The fit solver then scales every item against its subcategory median (tight
 * compression: nuance within a shelf) and scales that subcategory against its
 * category median (loose compression: side tables genuinely read smaller than
 * dining tables). Items with no parseable dimensions inherit their subcategory
 * median exactly, so they sit level with their neighbours instead of falling
 * back to raw silhouette normalization.
 *
 * Run: bun run size:baseline
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import catalog from "../src/data/inventory/current_catalog.json";
import {
  parseDimensionsInches,
  parseWidthInches,
} from "../src/components/collection/productPhysicalScale";
import { shelfCategorySlug } from "../src/components/collection/categoryAliases";

/** Below this many measured rows a bucket's median is noise, not signal. */
const MIN_CATEGORY_ROWS = 5;
const MIN_SUBCATEGORY_ROWS = 4;

type Bucket = { mass: number[]; height: number[]; width: number[] };

const pct = (values: number[], q: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[i];
};

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round = (n: number) => Math.round(n * 10) / 10;

const categories = new Map<string, Bucket>();
const subcategories = new Map<string, Bucket>();

const push = (
  map: Map<string, Bucket>,
  key: string,
  mass: number,
  height: number,
  width: number,
) => {
  const bucket = map.get(key) ?? { mass: [], height: [], width: [] };
  bucket.mass.push(mass);
  bucket.height.push(height);
  bucket.width.push(width);
  map.set(key, bucket);
};

for (const product of (catalog as any).products as any[]) {
  const category = shelfCategorySlug(product);
  if (!category) continue;

  const dims = parseDimensionsInches(product.dimensions);
  const width = dims?.width ?? parseWidthInches(product.dimensions);
  if (!width) continue;

  // Width-only rows still carry real mass signal on the axis we know; they are
  // held out of the height medians so they cannot flatten them.
  const height = dims?.height ?? null;
  const mass = height ? Math.sqrt(width * height) : width * 0.62;

  const sub = String(product.liveSubcategories?.[0] ?? product.subcategory ?? "")
    .trim()
    .toLowerCase();

  push(categories, category, mass, height ?? 0, width);
  if (sub) push(subcategories, `${category}/${sub}`, mass, height ?? 0, width);
}

/**
 * Coefficient of variation of the real heights in a bucket.
 *
 * Some shelves are height-invariant in the real world — every bar is ~42" tall,
 * every stool ~30", every dining table ~30". Those must render at MATCHED
 * height and vary only in width, or a 6' bar and a 12' bar look like different
 * products. Shelves with genuinely varied heights (side tables, accents) stay
 * on area matching. Derived, not hand-listed.
 */
const heightCv = (heights: number[]): number => {
  if (heights.length < 3) return 1;
  const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
  if (!mean) return 1;
  const variance =
    heights.reduce((a, b) => a + (b - mean) ** 2, 0) / heights.length;
  return Math.sqrt(variance) / mean;
};

const summarize = (map: Map<string, Bucket>, minRows: number) => {
  const out: Record<
    string,
    { mass: number; height: number; n: number; w95: number; h95: number; hCv: number }
  > = {};
  for (const [key, bucket] of [...map.entries()].sort()) {
    if (bucket.mass.length < minRows) continue;
    const heights = bucket.height.filter((h) => h > 0);
    out[key] = {
      mass: round(median(bucket.mass)),
      height: round(median(heights)),
      n: bucket.mass.length,
      // Upper reference: the piece that should nearly fill its tile.
      w95: round(pct(bucket.width, 0.9)),
      h95: round(pct(heights, 0.9)),
      hCv: Math.round(heightCv(heights) * 1000) / 1000,
    };
  }
  return out;
};


const payload = {
  generatedAt: new Date().toISOString(),
  source: "src/data/inventory/current_catalog.json",
  categories: summarize(categories, MIN_CATEGORY_ROWS),
  subcategories: summarize(subcategories, MIN_SUBCATEGORY_ROWS),
};

const target = resolve(import.meta.dirname, "../src/data/inventory/size-benchmarks.json");
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `size-benchmarks: ${Object.keys(payload.categories).length} categories, ` +
    `${Object.keys(payload.subcategories).length} subcategories -> ${target}`,
);
