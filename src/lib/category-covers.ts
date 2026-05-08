/**
 * Editorial cover image per browse group.
 *
 * Owner-curated specimen shot per category. Any group without an entry
 * falls back to the first product's primary image.
 */
import type { BrowseGroupId } from "@/lib/collection-browse-groups";
import sofasCover from "@/assets/category-covers/sofas.png";
import chairsCover from "@/assets/category-covers/chairs.png";
import benchesOttomansCover from "@/assets/category-covers/benches-ottomans.png";

export const CATEGORY_COVERS: Partial<Record<BrowseGroupId, string>> = {
  sofas: sofasCover,
  chairs: chairsCover,
  "benches-ottomans": benchesOttomansCover,
};
