/**
 * Editorial cover image per browse group.
 *
 * Each cover is a single, museum-grade product shot on pure seamless white —
 * one piece, one shadow, one register across all 18. The covers live as
 * static assets so they ship with the bundle (no CDN round-trip, no failure
 * mode, perfect cache).
 *
 * Coverage is intentionally partial during the rollout. Any group without
 * an entry falls back to the "first product in the bucket" hero in
 * CategoryGalleryOverview, so the gallery is always complete.
 */
import type { BrowseGroupId } from "@/lib/collection-browse-groups";
import sofasCover from "@/assets/category-covers/sofas.jpg";

export const CATEGORY_COVERS: Partial<Record<BrowseGroupId, string>> = {
  sofas: sofasCover,
};
