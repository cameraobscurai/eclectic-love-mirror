// ---------------------------------------------------------------------------
// Gallery order overrides — shared helpers
//
// Galleries default to the manifest sequence in src/content/gallery-manifests
// + the build-time `promoteHeroes` fallback. When an admin reorders a gallery
// via /admin/gallery, the new order lands in `public.gallery_orders` and is
// applied at runtime by this module.
//
// `keyFor(src)` is the stable identifier for a plate — the storage path under
// the image-galleries bucket, e.g. "AMANGIRI/chinledinner__D9D9D665-...jpeg".
// ---------------------------------------------------------------------------

import type { GalleryImage, GalleryProject } from "@/content/gallery-projects";

/** Extract the storage path from a full public URL — the stable plate key. */
export function keyFor(src: string): string {
  const marker = "/image-galleries/";
  const i = src.indexOf(marker);
  if (i === -1) return src;
  return decodeURIComponent(src.slice(i + marker.length));
}

/** Stable slug for a gallery, derived from its display name. */
export function gallerySlug(project: Pick<GalleryProject, "name">): string {
  return project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type GalleryOrder = {
  gallery_slug: string;
  order_keys: string[];
};

/**
 * Apply a saved order to a gallery's image list.
 *
 * - When no override exists, returns the images unchanged (caller keeps the
 *   manifest/promoteHeroes default).
 * - When an override exists, plates listed in `order_keys` are emitted in
 *   that order; any plates not listed (new uploads, etc) are appended at the
 *   end in their original order so nothing disappears.
 */
export function applyGalleryOrder(
  images: readonly GalleryImage[],
  order: GalleryOrder | null | undefined,
): GalleryImage[] {
  if (!order || !order.order_keys || order.order_keys.length === 0) {
    return [...images];
  }
  const byKey = new Map<string, GalleryImage>();
  for (const img of images) byKey.set(keyFor(img.src), img);

  const used = new Set<string>();
  const ordered: GalleryImage[] = [];
  for (const k of order.order_keys) {
    const img = byKey.get(k);
    if (img && !used.has(k)) {
      ordered.push(img);
      used.add(k);
    }
  }
  // Orphans — plates not in the saved order (e.g. added after last save).
  for (const img of images) {
    const k = keyFor(img.src);
    if (!used.has(k)) ordered.push(img);
  }
  return ordered;
}
