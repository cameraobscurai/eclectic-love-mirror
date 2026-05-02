// Client-safe catalog accessor. Reads a pre-baked JSON snapshot that was
// generated from the Phase 3 CSVs by `scripts/build-phase3-catalog.mjs`.
//
// No fs, no node:path, no `?raw` CSV parsing, no server functions.
// Safe to import from any client component, route, or hook.
//
// To regenerate the snapshot after CSV updates:
//   bun scripts/build-phase3-catalog.mjs

import catalog from "@/data/phase3/phase3_catalog.json";

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
