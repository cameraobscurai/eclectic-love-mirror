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
    imageUrl?: string | null;
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
  /** Editorial-curated order (lower = earlier within subcategory). Null = unranked. */
  editorialOrder?: number | null;
  /** Editorial backdrop URL for the collection tile. Sourced live from
   *  inventory_items.card_background_url. Null when no backdrop is set. */
  cardBackgroundUrl?: string | null;
  /** Admin-set focal point on the cover image, 0–1 normalized. When both
   *  are set, NormalizedProductImage skips silhouette measurement and uses
   *  these as the center of attention. Null = auto-measure. */
  coverFocalX?: number | null;
  coverFocalY?: number | null;
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

let cached: CatalogPayload | null = null;
let loadPromise: Promise<CatalogPayload> | null = null;
let baseCached: CatalogPayload | null = null;
let baseLoadPromise: Promise<CatalogPayload> | null = null;
let categoryDisplayOrder: string[] = [];

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

/**
 * Baked-only catalog — zero network. The /collection route loader awaits
 * this so first paint never blocks on the Supabase overlay round-trip
 * (which was 200–800ms on cold visits). Admin overlay edits (reorder,
 * image uploads, card backgrounds, focal points) are merged in post-mount
 * via getCollectionCatalog().
 */
export async function getCollectionCatalogBase(): Promise<CatalogPayload> {
  if (baseCached) return baseCached;
  if (baseLoadPromise) return baseLoadPromise;
  baseLoadPromise = import("@/data/inventory/current_catalog.json").then((mod) => {
    const raw = ((mod as { default?: RawCatalog }).default ?? mod) as RawCatalog;
    categoryDisplayOrder = raw.meta.categoryDisplayOrder;
    const products = raw.products
      .filter((p) => p.publicReady !== false)
      .map((p) => {
        const v = p.imagesVersion ?? 0;
        const images = v ? bustImages(p.images, v) : p.images;
        return { ...p, images, primaryImage: images[0] ?? null };
      });
    baseCached = { products, facets: raw.facets, total: products.length };
    return baseCached;
  });
  return baseLoadPromise;
}

export async function getCollectionCatalog(): Promise<CatalogPayload> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const base = await getCollectionCatalogBase();

    // LIVE overlay — admin edits (reorder, image uploads/reorder, cover
    // swaps, card backgrounds) write to DB and show up on the next site load
    // without re-baking the JSON snapshot. Keyed by rms_id since baked
    // products may use the RMS id as their primary id.
    const overlay = await fetchLiveOverlay();

    const products = base.products.map((p) => {
      const live = overlay.get(p.id);
      if (!live) return p;
      const eo = live.editorial_order !== undefined && live.editorial_order !== null
        ? live.editorial_order
        : (p.editorialOrder ?? null);

      // Live images win when the row has a non-empty array. Empty/null
      // falls back to baked so legacy rows with `images = '{}'` don't
      // blank their tiles.
      const liveImages = live.images;
      let baseImages: CollectionImage[] = Array.isArray(liveImages) && liveImages.length > 0
        ? liveImages.map((url, i) => ({
            url,
            position: i,
            isHero: i === 0,
            inferredFilename: null,
            altText: null,
          }))
        : p.images;

      // AI-upscaled cover overrides slot 0; original moves to slot 1.
      if (live.upscaled_cover_url && baseImages.length > 0) {
        const original = baseImages[0];
        baseImages = [
          { url: live.upscaled_cover_url, position: 0, isHero: true, inferredFilename: null, altText: original.altText ?? null },
          { ...original, position: 1, isHero: false },
          ...baseImages.slice(1).map((im, i) => ({ ...im, position: i + 2, isHero: false })),
        ];
      }

      const v = p.imagesVersion ?? 0;
      const images = v ? bustImages(baseImages, v) : baseImages;
      return {
        ...p,
        editorialOrder: eo,
        cardBackgroundUrl: live.card_background_url ?? p.cardBackgroundUrl ?? null,
        coverFocalX: live.cover_focal_x ?? p.coverFocalX ?? null,
        coverFocalY: live.cover_focal_y ?? p.coverFocalY ?? null,
        images,
        primaryImage: images[0] ?? null,
      };
    });
    cached = { products, facets: base.facets, total: products.length };
    return cached;
  })();
  return loadPromise;
}

type LiveOverlayRow = {
  editorial_order: number | null;
  images: string[] | null;
  card_background_url: string | null;
  cover_focal_x: number | null;
  cover_focal_y: number | null;
  upscaled_cover_url: string | null;
};

async function fetchLiveOverlay(): Promise<Map<string, LiveOverlayRow>> {
  const map = new Map<string, LiveOverlayRow>();
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("rms_id, editorial_order, images, card_background_url, cover_focal_x, cover_focal_y, upscaled_cover_url")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data as Array<{ rms_id: string } & LiveOverlayRow>) {
        if (row.rms_id) {
          map.set(row.rms_id, {
            editorial_order: row.editorial_order,
            images: row.images,
            card_background_url: row.card_background_url,
            cover_focal_x: row.cover_focal_x,
            cover_focal_y: row.cover_focal_y,
            upscaled_cover_url: row.upscaled_cover_url,
          });
        }
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  } catch (e) {
    // Non-fatal: fall back to baked values.
    console.warn("[catalog] live overlay failed:", e);
  }
  return map;
}

/** Drop the in-memory cache so the next getCollectionCatalog() call re-fetches
 *  the editorial_order overlay. Used by /admin/photos after a reorder save. */
export function invalidateCollectionCatalog(): void {
  cached = null;
  loadPromise = null;
}

/**
 * Async accessor for the categoryDisplayOrder list. The catalog must be
 * loaded first; await getCollectionCatalog() before calling.
 */
export async function getCategoryDisplayOrder(): Promise<string[]> {
  await getCollectionCatalog();
  return categoryDisplayOrder;
}
