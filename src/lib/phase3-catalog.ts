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
  /** Owner-selected subcategory slug from inventory_items.subcategory_slug.
   *  Overrides keyword classification when it matches the parent's sub list. */
  ownerSubcategory?: string | null;
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
let cachedAt = 0;

/**
 * How long a merged catalog (baked JSON + published overlay) may be reused.
 *
 * In the browser this is effectively "forever" for one page view. On the
 * server the module lives for the whole worker lifetime, so an unbounded
 * memo meant a published photo reorder never appeared on SSR'd pages until
 * the worker recycled — the exact "I reordered, it saved, the site didn't
 * change" report. A short TTL keeps SSR cheap and still self-heals.
 */
const CATALOG_TTL_MS = 30_000;
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
  if (cached && Date.now() - cachedAt < CATALOG_TTL_MS) return cached;
  if (cached) {
    cached = null;
    loadPromise = null;
  }
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const base = await getCollectionCatalogBase();

    // LIVE overlay — admin edits (reorder, image uploads/reorder, cover
    // swaps, card backgrounds) write to DB and show up on the next site load
    // without re-baking the JSON snapshot. Keyed by rms_id since baked
    // products may use the RMS id as their primary id.
    const overlay = await fetchLiveOverlay();

    // Filename-level identity so the same photo under a different signed /
    // versioned URL is not duplicated inside a family tile.
    //
    // Re-uploads through the admin land in squarespace-mirror with a hex
    // prefix and underscore separators ("593a2c94135d-FLORENCE_Lantern_2.png")
    // while the baked copy keeps the original name ("FLORENCE Lantern 2.png").
    // Without normalising both, a family tile shows the same photo twice —
    // which is exactly what /collection/florence-weathered-zinc-lantern did.
    const imgKey = (url: string) => {
      try {
        const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
        const ext = (base.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
        const stem = base
          .slice(0, base.length - ext.length)
          .replace(/^[0-9a-f]{8,}-/i, "")
          .replace(/[_+\-\s]+/g, " ")
          .trim()
          .toLowerCase();
        return (stem ? stem + ext : base.toLowerCase()) || url;
      } catch {
        return url;
      }
    };

    // A macro/close-up shot is never a cover. These are shot against a wall
    // (opaque backdrop, cropped hardware) and read as a broken tile next to
    // the transparent full-product cutouts. Demote, never drop.
    const isDetailShot = (url: string) =>
      /(detail|close[\s._-]?up|closeup|macro|swatch|hardware|texture)/i.test(imgKey(url));
    const coverFirst = (imgs: CollectionImage[]): CollectionImage[] => {
      if (imgs.length < 2 || !isDetailShot(imgs[0].url)) return imgs;
      const idx = imgs.findIndex((i) => !isDetailShot(i.url));
      if (idx <= 0) return imgs;
      const next = [...imgs.slice(idx, idx + 1), ...imgs.filter((_, i) => i !== idx)];
      return next.map((img, i) => ({ ...img, position: i, isHero: i === 0 }));
    };




    const products = base.products.map((p) => {
      const live = overlay.get(p.id);
      const members = p.variants ?? [];
      const hasFamily = members.length > 0;
      if (!live && !hasFamily) return p;
      const eo = live?.editorial_order !== undefined && live?.editorial_order !== null
        ? live.editorial_order
        : (p.editorialOrder ?? null);

      // Live images win when the row has a non-empty array. Empty/null
      // falls back to baked so legacy rows with `images = '{}'` don't
      // blank their tiles.
      const liveImages = live?.images;
      let baseImages: CollectionImage[] = Array.isArray(liveImages) && liveImages.length > 0
        ? liveImages.map((url, i) => ({
            url,
            position: i,
            isHero: i === 0,
            inferredFilename: null,
            altText: null,
          }))
        : p.images;

      // FAMILY TILES (tableware collections like EDEN): the baked tile merges
      // photos from every variant row, but the overlay is keyed per RMS row.
      // Without this, a family tile would collapse to just the lead row's
      // single photo — which is exactly why only one image showed publicly.
      // Rebuild the merged set: group/"Set" shots from the bake (never owned
      // by a variant row) first, then each member's live images in order.
      let variantsOut = members;
      if (hasFamily) {
        const memberIds = [p.id, ...members.map((v) => v.id)];
        const liveMemberUrls: string[] = [];
        let anyLive = false;
        for (const id of memberIds) {
          const row = overlay.get(id);
          if (!row || !Array.isArray(row.images) || row.images.length === 0) continue;
          anyLive = true;
          for (const u of row.images) liveMemberUrls.push(u);
        }
        if (anyLive) {
          const variantKeys = new Set(
            members
              .map((v) => (v.imageUrl ? imgKey(v.imageUrl) : ""))
              .filter(Boolean),
          );
          const seen = new Set<string>();
          const merged: CollectionImage[] = [];
          const push = (url: string, altText: string | null) => {
            const k = imgKey(url);
            if (seen.has(k)) return;
            seen.add(k);
            merged.push({
              url,
              position: merged.length,
              isHero: merged.length === 0,
              inferredFilename: null,
              altText,
            });
          };
          // Owner control: any photo on the LEAD row that isn't one of the
          // variant shots is a collection/group photo she uploaded — it wins
          // the cover slot, in her drag order.
          const leadRow = overlay.get(p.id);
          for (const u of (Array.isArray(leadRow?.images) ? leadRow.images : [])) {
            if (variantKeys.has(imgKey(u))) continue;
            push(u, null);
          }
          // Then baked group shots (the "Set" photo) — no variant row owns these.
          for (const img of p.images) {
            if (variantKeys.has(imgKey(img.url))) continue;
            push(img.url, img.altText);
          }
          for (const u of liveMemberUrls) push(u, null);

          baseImages = merged;
          variantsOut = members.map((v) => {
            const row = overlay.get(v.id);
            const firstLive = Array.isArray(row?.images) ? row?.images[0] : undefined;
            return {
              ...v,
              title: row?.title ?? v.title,
              dimensions: row?.dimensions_raw ?? v.dimensions,
              stockedQuantity: row?.quantity_label ?? v.stockedQuantity,
              imageUrl: firstLive ?? v.imageUrl ?? null,
            };
          });
        }
      }

      // NOTE: AI-upscaled covers are intentionally NOT used as the hero image.
      // The upscaler baked in opaque backdrops and invented cast shadows, which
      // read as grey boxes next to the transparent cutouts everywhere else.
      // The original product photo is the source of truth for slot 0.


      baseImages = coverFirst(baseImages);
      const v = p.imagesVersion ?? 0;
      const images = v ? bustImages(baseImages, v) : baseImages;
      return {
        ...p,
        editorialOrder: eo,
        cardBackgroundUrl: live?.card_background_url ?? p.cardBackgroundUrl ?? null,
        coverFocalX: live?.cover_focal_x ?? p.coverFocalX ?? null,
        coverFocalY: live?.cover_focal_y ?? p.coverFocalY ?? null,
        images,
        primaryImage: images[0] ?? null,
        imageCount: images.length,
        variants: variantsOut,
        ownerSubcategory: live?.subcategory_slug ?? p.ownerSubcategory ?? null,
      };
    });

    // Products added since the last bake exist only in the overlay. Append
    // them so /admin → New product → Publish is enough to go live.
    //
    // "known" must also cover variant rows folded into family tiles at bake
    // time — they are public-ready with images, so without this they would
    // reappear as duplicate standalone tiles.
    const known = new Set<string>();
    for (const p of base.products) {
      known.add(p.id);
      for (const v of p.variants ?? []) known.add(v.id);
    }

    const additions: CollectionProduct[] = [];
    for (const [rmsId, live] of overlay) {
      if (known.has(rmsId)) continue;
      if (live.public_ready !== true) continue;
      if (!live.title || !live.category) continue;
      const urls = Array.isArray(live.images) ? live.images : [];
      const imgs: CollectionImage[] = urls.map((url, i) => ({
        url,
        position: i,
        isHero: i === 0,
        inferredFilename: null,
        altText: null,
      }));
      if (imgs.length === 0) continue;
      additions.push({
        id: rmsId,
        sourceUrl: "",
        slug: live.slug ?? rmsId,
        categorySlug: live.category,
        displayCategory:
          base.facets.find((f) => f.slug === live.category)?.display ?? live.category,
        title: live.title,
        description: live.description ?? null,
        dimensions: live.dimensions_raw ?? null,
        stockedQuantity: live.quantity_label ?? null,
        isCustomOrder: false,
        confidence: 1,
        needsManualReview: false,
        images: imgs,
        primaryImage: imgs[0],
        imageCount: imgs.length,
        publicReady: true,
        scrapedOrder: Number.MAX_SAFE_INTEGER,
        subcategory: null,
        ownerSubcategory: live.subcategory_slug ?? null,
        ownerSiteRank: null,
        editorialOrder: live.editorial_order ?? null,
        cardBackgroundUrl: live.card_background_url ?? null,
        coverFocalX: live.cover_focal_x ?? null,
        coverFocalY: live.cover_focal_y ?? null,
      });
    }

    const all = additions.length > 0 ? [...products, ...additions] : products;
    const facets =
      additions.length > 0
        ? base.facets.map((f) => ({
            ...f,
            count: f.count + additions.filter((a) => a.categorySlug === f.slug).length,
          }))
        : base.facets;

    cached = { products: all, facets, total: all.length };
    cachedAt = Date.now();
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
  /** Owner-selected subcategory (inventory_items.subcategory_slug). */
  subcategory_slug?: string | null;
  /** Identity fields — present only in overlays published after 2026-08-06.
   *  Used to render products added since the last catalog bake. */
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  description?: string | null;
  dimensions_raw?: string | null;
  quantity_label?: string | null;
  public_ready?: boolean | null;
};


async function fetchLiveOverlay(): Promise<Map<string, LiveOverlayRow>> {
  const map = new Map<string, LiveOverlayRow>();

  // Fast path: single request for the published overlay snapshot written
  // by /admin/photos → Publish. One JSON fetch, CDN-cacheable, no pagination.
  // Cache "snapshot missing" in sessionStorage so we don't spam 400s on
  // every route change until an admin clicks Publish for the first time.
  const MISSING_KEY = "eh:overlay-missing";
  const missing =
    typeof sessionStorage !== "undefined" && sessionStorage.getItem(MISSING_KEY) === "1";
  if (!missing) {
    try {
      const base =
        (import.meta as unknown as { env?: Record<string, string | undefined> }).env
          ?.VITE_SUPABASE_URL;
      if (base) {
        // Resolve manifest pointer first, then fetch the immutable overlay blob.
        // Manifest is tiny + short-TTL; blob is immutable + long-TTL.
        const manRes = await fetch(
          `${base}/storage/v1/object/public/squarespace-mirror/catalog/manifest.json?t=${Math.floor(Date.now() / 60000)}`,
          { cache: "no-cache" },
        );
        if (manRes.ok) {
          const manifest = (await manRes.json()) as { overlayKey?: string };
          if (manifest.overlayKey) {
            const res = await fetch(
              `${base}/storage/v1/object/public/squarespace-mirror/${manifest.overlayKey}`,
              { cache: "force-cache" },
            );
            if (res.ok) {
              const payload = (await res.json()) as {
                overlay: Record<string, LiveOverlayRow>;
              };
              if (payload && payload.overlay) {
                for (const [rmsId, row] of Object.entries(payload.overlay)) {
                  map.set(rmsId, row);
                }
                return map;
              }
            }
          }
        } else if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(MISSING_KEY, "1");
        }
      }
    } catch {
      /* fall through to paginated live query */
    }
  }


  // Fallback: paginated live query. Used until the first Publish runs, or
  // if the snapshot fetch fails.
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("rms_id, editorial_order, images, card_background_url, cover_focal_x, cover_focal_y, title, slug, category, description, dimensions_raw, quantity_label, public_ready, subcategory_slug")
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
            title: row.title,
            slug: row.slug,
            category: row.category,
            description: row.description,
            dimensions_raw: row.dimensions_raw,
            quantity_label: row.quantity_label,
            public_ready: row.public_ready,
            subcategory_slug: row.subcategory_slug ?? null,
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
  cachedAt = 0;
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
