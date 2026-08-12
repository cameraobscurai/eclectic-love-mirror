// Deletion suppression ("tombstones").
//
// The public catalog is a baked JSON snapshot merged with a published
// overlay. The overlay is assembled by WALKING LIVE ROWS, so a deleted row
// simply stops being mentioned — its baked tile survives on the live site
// (and on the admin grid) until the next full bake. That is the "I deleted
// it, the image is still there, and clicking it errors" report.
//
// Fix: deletion writes a row into `deleted_items`, publish serializes those
// rms_ids as a suppress-list, and this module applies the list at read time.
//
// Four properties, all exercised by tests/tombstones.test.ts:
//   1. Suppression runs on the tile AND on every entry in variants[] — a
//      deleted variant row is folded inside a baked family, so filtering
//      only top-level products moves the ghost down a level.
//   2. A tombstoned family LEAD does not remove the tile: the siblings are
//      still rentable. The next surviving variant becomes display-lead until
//      the next bake makes it real.
//   3. A tombstoned standalone tile (no surviving variants) is dropped.
//   4. Self-expiring — the next bake reads the database, where the row is
//      absent, so `deleted_items` is purged at bake time (bake-catalog.mjs).

export interface TombstoneImage {
  url: string;
  position: number;
  isHero: boolean;
  inferredFilename: string | null;
  altText: string | null;
}

export interface TombstoneVariant {
  id: string;
  title: string;
  dimensions: string | null;
  stockedQuantity: string | null;
  imageUrl?: string | null;
}

export interface TombstoneProduct {
  id: string;
  title: string;
  dimensions: string | null;
  stockedQuantity: string | null;
  images: TombstoneImage[];
  primaryImage: TombstoneImage | null;
  imageCount: number;
  variants?: TombstoneVariant[];
}

function reindex(images: TombstoneImage[]): TombstoneImage[] {
  return images.map((img, index) => ({ ...img, position: index, isHero: index === 0 }));
}

/**
 * Apply the published suppress-list to merged catalog products.
 *
 * Pure and generic so the fixtures can drive it without the catalog loader.
 */
export function applyTombstones<T extends TombstoneProduct>(
  products: T[],
  deleted: ReadonlySet<string>,
): T[] {
  if (deleted.size === 0) return products;

  const out: T[] = [];
  for (const p of products) {
    const survivors = (p.variants ?? []).filter((v) => !deleted.has(v.id));
    const leadGone = deleted.has(p.id);

    if (!leadGone) {
      // Ghost chip case: the tile lives, one of its variant rows does not.
      if (p.variants && survivors.length !== p.variants.length) {
        out.push({ ...p, variants: survivors });
      } else {
        out.push(p);
      }
      continue;
    }

    // Lead is tombstoned. No surviving sibling → the tile goes with it.
    if (survivors.length === 0) continue;

    // Lead is tombstoned but siblings remain. Promote the next survivor to
    // display-lead rather than rendering a tile sourced from a dead row.
    const [promoted, ...rest] = survivors;
    let images = p.images;
    if (promoted.imageUrl) {
      const hit = images.find((img) => img.url === promoted.imageUrl);
      images = hit
        ? reindex([hit, ...images.filter((img) => img !== hit)])
        : reindex([
            {
              url: promoted.imageUrl,
              position: 0,
              isHero: true,
              inferredFilename: null,
              altText: promoted.title,
            },
            ...images,
          ]);
    }

    out.push({
      ...p,
      title: promoted.title,
      dimensions: promoted.dimensions ?? p.dimensions,
      stockedQuantity: promoted.stockedQuantity ?? p.stockedQuantity,
      images,
      primaryImage: images[0] ?? null,
      imageCount: images.length,
      variants: rest,
    });
  }
  return out;
}
