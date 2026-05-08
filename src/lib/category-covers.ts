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
import cocktailTablesCover from "@/assets/category-covers/cocktail-tables.webp";
import sideTablesCover from "@/assets/category-covers/side-tables.png";
import lightingCover from "@/assets/category-covers/lighting.png";
import coffeeTablesCover from "@/assets/category-covers/coffee-tables.png";
import diningCover from "@/assets/category-covers/dining.png";
import barCover from "@/assets/category-covers/bar.png";

export const CATEGORY_COVERS: Partial<Record<BrowseGroupId, string>> = {
  sofas: sofasCover,
  chairs: chairsCover,
  "benches-ottomans": benchesOttomansCover,
  "cocktail-tables": cocktailTablesCover,
  "side-tables": sideTablesCover,
  "coffee-tables": coffeeTablesCover,
  dining: diningCover,
  bar: barCover,
  lighting: lightingCover,
};
