// Server-side Phase 3 catalog. Reads frozen CSV exports bundled via Vite's
// ?raw import (works in dev, SSR, and edge worker runtimes — no fs at runtime).
// Joins products + images, computes the frontend product model.

import productsCsv from "@/data/phase3/phase3_final_products.csv?raw";
import imagesCsv from "@/data/phase3/phase3_final_images.csv?raw";
import reviewCsv from "@/data/phase3/phase3_manual_review_queue.csv?raw";
import { parsePhase3CSV, type CsvRow } from "./phase3-csv";

export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  accents1: "Accents",
  bars1: "Cocktail & Bar",
  "benches-ottomans1": "Benches & Ottomans",
  "chairs-stools1": "Chairs & Stools",
  "cocktail-bar": "Cocktail & Bar",
  dining: "Dining",
  "large-decor": "Large Decor",
  light: "Lighting",
  lounge: "Lounge Seating",
  "lounge-tables": "Lounge Tables",
  "pillows-throws1": "Pillows & Throws",
  rugs: "Rugs",
  "sofas-loveseats1": "Sofas & Loveseats",
  storage1: "Storage",
  styling: "Styling",
  tables1: "Tables",
  tableware: "Tableware",
  textiles: "Textiles",
};

export const CATEGORY_DISPLAY_ORDER: string[] = [
  "Lounge Seating",
  "Sofas & Loveseats",
  "Chairs & Stools",
  "Benches & Ottomans",
  "Lounge Tables",
  "Tables",
  "Dining",
  "Cocktail & Bar",
  "Tableware",
  "Textiles",
  "Pillows & Throws",
  "Rugs",
  "Lighting",
  "Large Decor",
  "Styling",
  "Accents",
  "Storage",
];

const KNOWN_404 = "https://www.eclectichive.com/cocktail-bar/broadway-32in";

export interface CollectionImage {
  url: string;
  position: number;
  isHero: boolean;
  inferredFilename: string | null;
  altText: string | null;
}

export interface CollectionProduct {
  id: string;
  sourceUrl: string;
  slug: string;
  categorySlug: string;
  displayCategory: string;
  title: string;
  description: string | null;
  dimensions: string | null;
  stockedQuantity: string | null;
  isCustomOrder: boolean;
  confidence: number;
  needsManualReview: boolean;
  images: CollectionImage[];
  primaryImage: CollectionImage | null;
  imageCount: number;
  publicReady: boolean;
  // Sort helpers
  scrapedOrder: number;
  // Subcategory bucket derived from title keywords (e.g. "chair", "stool")
  subcategory: string | null;
}

function bool(v: string | undefined): boolean {
  return v === "true" || v === "TRUE" || v === "1";
}
function nullable(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
function num(v: string | undefined, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function arr(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(";").map((s) => s.trim()).filter(Boolean);
}

// Subcategory keyword detection by category. Conservative — only buckets we can
// be confident in; everything else stays null and the user just sees the parent
// category.
const SUBCATEGORY_RULES: Record<string, Array<{ label: string; match: RegExp }>> = {
  "chairs-stools1": [
    { label: "Stools", match: /\bstool/i },
    { label: "Chairs", match: /\bchair/i },
  ],
  "benches-ottomans1": [
    { label: "Ottomans", match: /\bottoman|pouf/i },
    { label: "Benches", match: /\bbench/i },
  ],
  light: [
    { label: "Floor Lamps", match: /\bfloor\b.*\blamp|\blamp\b.*\bfloor/i },
    { label: "Table Lamps", match: /\btable\b.*\blamp|\blamp\b.*\btable/i },
    { label: "Pendants", match: /\bpendant|chandelier|sconce/i },
    { label: "Candles & Holders", match: /\bcandle|votive|hurricane/i },
  ],
  "lounge-tables": [
    { label: "Coffee Tables", match: /\bcoffee/i },
    { label: "Side Tables", match: /\bside\b/i },
    { label: "Console", match: /\bconsole/i },
  ],
  tables1: [
    { label: "Dining Tables", match: /\bdining/i },
    { label: "Console", match: /\bconsole/i },
    { label: "Side Tables", match: /\bside\b/i },
  ],
  textiles: [
    { label: "Linens", match: /\blinen|napkin|runner|tablecloth/i },
    { label: "Throws", match: /\bthrow|blanket/i },
  ],
  tableware: [
    { label: "Glassware", match: /\bglass|coupe|flute|tumbler|goblet/i },
    { label: "Plates", match: /\bplate|charger/i },
    { label: "Flatware", match: /\bflatware|spoon|fork|knife/i },
  ],
  "cocktail-bar": [
    { label: "Bars", match: /\bbar\b/i },
    { label: "Bar Carts", match: /\bcart/i },
  ],
  bars1: [
    { label: "Bars", match: /\bbar\b/i },
    { label: "Bar Carts", match: /\bcart/i },
  ],
};

function detectSubcategory(categorySlug: string, title: string): string | null {
  const rules = SUBCATEGORY_RULES[categorySlug];
  if (!rules) return null;
  for (const r of rules) if (r.match.test(title)) return r.label;
  return null;
}

let _cache: { all: CollectionProduct[]; built: number } | null = null;

export function buildCatalog(): CollectionProduct[] {
  if (_cache) return _cache.all;

  const productRows = parsePhase3CSV(productsCsv);
  const imageRows = parsePhase3CSV(imagesCsv);
  const reviewRows = parsePhase3CSV(reviewCsv);

  // Map review rows by url -> issue_type
  const reviewByUrl = new Map<string, string>();
  for (const r of reviewRows) reviewByUrl.set(r.url, r.issue_type ?? "");

  // Group images by scraped_product_id
  const imagesByProductId = new Map<string, CollectionImage[]>();
  for (const im of imageRows) {
    const pid = im.scraped_product_id;
    if (!pid || !im.image_url) continue;
    const list = imagesByProductId.get(pid) ?? [];
    list.push({
      url: im.image_url,
      position: num(im.position, 0),
      isHero: bool(im.is_hero),
      inferredFilename: nullable(im.inferred_filename),
      altText: nullable(im.alt_text),
    });
    imagesByProductId.set(pid, list);
  }
  for (const list of imagesByProductId.values()) {
    list.sort((a, b) => Number(b.isHero) - Number(a.isHero) || a.position - b.position);
  }

  const products: CollectionProduct[] = productRows.map((p, idx) => {
    const id = p.id;
    const url = p.url;
    const categorySlug = p.category_slug ?? "";
    const title =
      nullable(p.product_title_normalized) ??
      nullable(p.product_title_original) ??
      nullable(p.title) ??
      "(untitled)";
    const images = imagesByProductId.get(id) ?? [];
    const primaryImage =
      images.find((i) => i.isHero) ?? images.find((i) => i.position === 0) ?? images[0] ?? null;
    const confidence = num(p.final_confidence, 0);
    const needsManualReview = bool(p.needs_manual_review);
    const reviewIssue = reviewByUrl.get(url) ?? "";
    const isKnown404 = url === KNOWN_404 || reviewIssue === "source_404";

    const publicReady =
      !!primaryImage &&
      !isKnown404 &&
      !!nullable(p.product_title_normalized ?? p.product_title_original) &&
      confidence >= 0.7;

    return {
      id,
      sourceUrl: url,
      slug: p.product_slug ?? id,
      categorySlug,
      displayCategory: CATEGORY_DISPLAY_MAP[categorySlug] ?? categorySlug,
      title,
      description: nullable(p.description),
      dimensions: nullable(p.dimensions),
      stockedQuantity: nullable(p.stocked_quantity),
      isCustomOrder: bool(p.is_custom_order_co),
      confidence,
      needsManualReview,
      images,
      primaryImage,
      imageCount: images.length,
      publicReady,
      scrapedOrder: idx,
      subcategory: detectSubcategory(categorySlug, title),
    };
  });

  _cache = { all: products, built: Date.now() };
  return products;
}

export function getPublicCatalog(): CollectionProduct[] {
  return buildCatalog().filter((p) => p.publicReady);
}

export interface CategoryFacet {
  slug: string;
  display: string;
  count: number;
}

export function getCategoryFacets(): CategoryFacet[] {
  const all = getPublicCatalog();
  const counts = new Map<string, { display: string; count: number }>();
  for (const p of all) {
    const e = counts.get(p.categorySlug) ?? { display: p.displayCategory, count: 0 };
    e.count++;
    counts.set(p.categorySlug, e);
  }
  const facets: CategoryFacet[] = [...counts.entries()].map(([slug, v]) => ({
    slug,
    display: v.display,
    count: v.count,
  }));
  // Sort by configured display order, unknowns last
  const orderIdx = new Map<string, number>(
    CATEGORY_DISPLAY_ORDER.map((d, i) => [d, i] as const),
  );
  facets.sort((a, b) => {
    const ai = orderIdx.get(a.display) ?? 999;
    const bi = orderIdx.get(b.display) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.display.localeCompare(b.display);
  });
  return facets;
}

export interface CatalogPayload {
  products: CollectionProduct[];
  facets: CategoryFacet[];
  total: number;
}

export function getCatalogPayload(): CatalogPayload {
  const products = getPublicCatalog();
  return {
    products,
    facets: getCategoryFacets(),
    total: products.length,
  };
}
