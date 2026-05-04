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
  return {
    products: raw.products,
    facets: raw.facets,
    total: raw.total,
  };
}
