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
import cocktailTablesCover from "@/assets/category-covers/cocktail-tables.png";
import sideTablesCover from "@/assets/category-covers/side-tables.png";
import lightingCover from "@/assets/category-covers/lighting.png";
import coffeeTablesCover from "@/assets/category-covers/coffee-tables.png";
import diningCover from "@/assets/category-covers/dining.png";
import barCover from "@/assets/category-covers/bar.png";
import pillowsCover from "@/assets/category-covers/pillows.png";
import throwsCover from "@/assets/category-covers/throws.png";
import tablewareCover from "@/assets/category-covers/tableware.png";
import stylingCover from "@/assets/category-covers/styling.png";
import rugsCover from "@/assets/category-covers/rugs.png";

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
  pillows: pillowsCover,
  throws: throwsCover,
  tableware: tablewareCover,
  styling: stylingCover,
  rugs: rugsCover,
};
