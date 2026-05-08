// Client-safe catalog accessor. Reads a pre-baked JSON snapshot generated
// from the live `inventory_items` table (Lovable Cloud / Supabase) by
// `scripts/bake-catalog.mjs`. The owner's Current RMS export is the source
// of truth; this snapshot is what the Collection page renders on first paint.
//
// To regenerate after a fresh inventory import:
//   bun scripts/bake-catalog.mjs
//
// (The legacy `phase3_catalog.json` snapshot is kept on disk for archival
// reference but is no longer imported anywhere.)

// NOTE: catalog JSON is dynamically imported below so it doesn't land in any
// route's eager chunk. The first call to getCollectionCatalog() pays the
// fetch + parse cost once; subsequent calls hit a module-level cache.

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
  /** Per-product image cache-buster. Compact unix seconds derived from the
   *  inventory row's `updated_at` at bake time. Appended as `?v=…` to every
   *  Supabase storage URL so newly uploaded images displace stale browser
   *  cache the instant the row is touched, without invalidating images on
   *  unchanged products. */
  imagesVersion?: number;
  publicReady: boolean;
  scrapedOrder: number;
  subcategory: string | null;
  /**
   * Owner-curated rank within the live eclectichive.com category page.
   * Lower = higher up in her grid. Null when the product is not on her
   * live site (newer scrapes, retired items, or placeholder titles).
   * Captured by scripts/capture-owner-site-order.mjs and joined at build
   * time. Used as the primary in-category sort key.
   */
  ownerSiteRank: number | null;
  /** Live-site category slug (e.g. "cocktail-bar") when matched to the
   *  Squarespace snapshot. Overrides keyword-based parent routing. */
  liveCategory?: string | null;
  /** Live-site subcategory labels (e.g. ["Cocktail Tables"]). */
  liveSubcategories?: string[];
  /** Variant rows collapsed under this family tile (e.g. Thistle Red Wine,
   *  Thistle Coupe…). Empty for standalone products. Populated by
   *  scripts/family-rollup.mjs at bake time. */
  variants?: Array<{
    id: string;
    title: string;
    dimensions: string | null;
    stockedQuantity: string | null;
  }>;
  /** AI-tagged primary material color, hex (e.g. "#8b6f4a"). Null when untagged. */
  colorHex?: string | null;
  /** Secondary dominant hex for patterned/multi-color items. */
  colorHexSecondary?: string | null;
  /** CIELAB L* 0–100 (0=black, 100=white). */
  colorLightness?: number | null;
  /** Hue 0–360. Null for neutrals (chroma < 8). */
  colorHue?: number | null;
  /** Chroma 0–130. */
  colorChroma?: number | null;
  /** Family bucket: black|charcoal|brown|tan|cream|white|grey|red|orange|yellow|green|blue|purple|pink|metallic-warm|metallic-cool|multi */
  colorFamily?: string | null;
  /** warm | neutral | cool */
  colorTemperature?: string | null;
  /** Pre-computed sort key (lower = darker / earlier). Null when untagged. */
  tonalRank?: number | null;
  /** True when AI and pixel-extract disagree, or owner flagged for review. */
  colorNeedsReview?: boolean;
}

export interface CategoryFacet {
  slug: string;
  display: string;
  count: number;
}

export interface CatalogPayload {
  products: CollectionProduct[];
  facets: CategoryFacet[];
  total: number;
}

interface RawCatalog extends CatalogPayload {
  meta: {
    generatedAt: string;
    totalRecords: number;
    publicReadyCount: number;
    excludedCount: number;
    categoryDisplayOrder: string[];
  };
}

const raw = catalog as RawCatalog;

export const CATEGORY_DISPLAY_ORDER: string[] = raw.meta.categoryDisplayOrder;

/**
 * Append `?v={imagesVersion}` to Supabase storage URLs only. Untouched URLs
 * (eclectichive.com sourceUrls, anything off-platform) pass through unchanged.
 * Idempotent: never double-appends if a `v=` param is already present.
 */
function bustUrl(url: string, version: number): string {
  if (!url || !version) return url;
  if (!url.includes("/storage/v1/")) return url;
  if (/[?&]v=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

function bustImages(
  imgs: CollectionImage[],
  version: number,
): CollectionImage[] {
  if (!version) return imgs;
  return imgs.map((img) => ({ ...img, url: bustUrl(img.url, version) }));
}

export function getCollectionCatalog(): CatalogPayload {
  // Respect publicReady — items flipped false (e.g. owner-hidden) drop out
  // of the public grid, counts, and rails.
  const products = raw.products
    .filter((p) => p.publicReady !== false)
    .map((p) => {
      const v = p.imagesVersion ?? 0;
      if (!v) return p;
      const images = bustImages(p.images, v);
      return {
        ...p,
        images,
        primaryImage: images[0] ?? null,
      };
    });
  return {
    products,
    facets: raw.facets,
    total: products.length,
  };
}
