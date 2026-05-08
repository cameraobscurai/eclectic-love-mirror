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

import catalog from "@/data/inventory/current_catalog.json";

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
  /** Owner-curated rank from the wall reorder tool. When set, takes precedence
   *  over tonalRank in the tonal sort. */
  manualRank?: number | null;
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

export function getCollectionCatalog(): CatalogPayload {
  // Respect publicReady — items flipped false (e.g. owner-hidden) drop out
  // of the public grid, counts, and rails.
  const products = raw.products.filter((p) => p.publicReady !== false);
  return {
    products,
    facets: raw.facets,
    total: products.length,
  };
}
