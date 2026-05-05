/**
 * Editorial cover image per browse group.
 *
 * Owner-curated specimen shot per category. Covers are pulled directly from
 * the owner's inventory storage so they update when she replaces the file.
 * Any group without an entry falls back to the first product's primary image.
 */
import type { BrowseGroupId } from "@/lib/collection-browse-groups";

export const CATEGORY_COVERS: Partial<Record<BrowseGroupId, string>> = {
  sofas:
    "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/SEATING/SOFA/RESHMA Botanical Sofa 0.png",
};
