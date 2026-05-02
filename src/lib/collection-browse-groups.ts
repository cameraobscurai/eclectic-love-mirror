/**
 * Legacy module. Kept as a re-export shim so existing consumers
 * (collection.tsx, CollectionRail, CategoryGalleryOverview, ProductTile,
 * category-covers, sort-intelligence) don't need to change import paths.
 *
 * NEW CODE should import from `@/lib/collection-taxonomy` directly.
 *
 * The taxonomy itself — types, rules, scoring, classification — lives in
 * `collection-taxonomy.ts`. This file is intentionally trivial.
 */

export type {
  BrowseGroupId,
  BrowseTier,
  BrowseGroupOption,
} from "./collection-taxonomy";

export {
  OWNER_BROWSE_ORDER,
  SAFETY_NET_BROWSE_ORDER,
  BROWSE_GROUP_ORDER,
  BROWSE_GROUP_LABELS,
  BROWSE_GROUP_DESCRIPTIONS,
  BROWSE_GROUP_TIER,
  classify,
  getProductBrowseGroup,
  getBrowseGroupOptions,
  groupProductsByBrowseGroup,
} from "./collection-taxonomy";
