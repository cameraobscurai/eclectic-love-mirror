/**
 * Editorial cover image per browse group.
 *
 * Owner-curated specimen shot per category. Any group without an entry
 * falls back to the first product's primary image.
 *
 * Each cover ships through the vite-imagetools `?preset=editorial` pipeline,
 * which produces an AVIF + WebP <picture> at 768/1280/1920 widths. The
 * overview tiles render at ~180–250 CSS px so the browser picks the smallest
 * variant — saving 4–10× over the raw PNG originals.
 */
import type { BrowseGroupId } from "@/lib/collection-browse-groups";
import sofasCover from "@/assets/category-covers/sofas.png?preset=editorial";
import chairsCover from "@/assets/category-covers/chairs.png?preset=editorial";
import benchesOttomansCover from "@/assets/category-covers/benches-ottomans.png?preset=editorial";
import cocktailTablesCover from "@/assets/category-covers/cocktail-tables.png?preset=editorial";
import sideTablesCover from "@/assets/category-covers/side-tables.png?preset=editorial";
import lightingCover from "@/assets/category-covers/lighting.png?preset=editorial";
import coffeeTablesCover from "@/assets/category-covers/coffee-tables.png?preset=editorial";
import diningCover from "@/assets/category-covers/dining.png?preset=editorial";
import barCover from "@/assets/category-covers/bar.png?preset=editorial";
import pillowsCover from "@/assets/category-covers/pillows.png?preset=editorial";
import throwsCover from "@/assets/category-covers/throws.png?preset=editorial";
import tablewareCover from "@/assets/category-covers/tableware.png?preset=editorial";
import stylingCover from "@/assets/category-covers/styling.png?preset=editorial";
import rugsCover from "@/assets/category-covers/rugs.png?preset=editorial";

/** Picture-shaped object returned by vite-imagetools `as=picture`. */
export interface CoverPicture {
  sources: Record<string, string>;
  img: { src: string; w: number; h: number };
}

/** Convenience: get the fallback raster URL from a CoverPicture (or pass-through string). */
export function coverUrl(cover: CoverPicture | string | undefined | null): string | null {
  if (!cover) return null;
  if (typeof cover === "string") return cover;
  return cover.img.src;
}

export const CATEGORY_COVERS: Partial<Record<BrowseGroupId, CoverPicture>> = {
  sofas: sofasCover as unknown as CoverPicture,
  chairs: chairsCover as unknown as CoverPicture,
  "benches-ottomans": benchesOttomansCover as unknown as CoverPicture,
  "cocktail-tables": cocktailTablesCover as unknown as CoverPicture,
  "side-tables": sideTablesCover as unknown as CoverPicture,
  "coffee-tables": coffeeTablesCover as unknown as CoverPicture,
  dining: diningCover as unknown as CoverPicture,
  bar: barCover as unknown as CoverPicture,
  lighting: lightingCover as unknown as CoverPicture,
  pillows: pillowsCover as unknown as CoverPicture,
  throws: throwsCover as unknown as CoverPicture,
  tableware: tablewareCover as unknown as CoverPicture,
  styling: stylingCover as unknown as CoverPicture,
  rugs: rugsCover as unknown as CoverPicture,
};
