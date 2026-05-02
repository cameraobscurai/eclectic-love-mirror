// ---------------------------------------------------------------------------
// Gallery — project content
//
// Single source of truth for the editorial selected-projects rail. When the
// owner approves real project media, populate `galleryProjects` below.
// Until then, the array stays empty and the Gallery renders an intentional
// empty exhibition scaffold (see GalleryEmptyFilmstrip).
//
// No fake projects, no fake links, no stock images.
// ---------------------------------------------------------------------------

export type GalleryCategory =
  | "Luxury Weddings"
  | "Meetings + Incentive Travel"
  | "Social + Non-Profit";

export interface GalleryImage {
  /** Absolute or app-relative URL. Bundled assets get hashed by Vite. */
  src: string;
  /** Required for accessibility. Describe the photograph, not the brand. */
  alt: string;
}

export interface GalleryProject {
  /** Two-digit slot number, e.g. "01". Drives the numbered rhythm. */
  number: string;
  name: string;
  location: string;
  year: string;
  category: GalleryCategory;
  /** Hero/cover image for the rail card and the project panel. */
  heroImage: GalleryImage;
  /** Detail crops shown in the panel thumbnail strip. */
  detailImages: GalleryImage[];
  /** Optional internal subroute, only set when one actually exists. */
  href?: string;
  /** One short paragraph about the project. Optional. */
  note?: string;
}

import { amangiriGalleryImages, amangiriHome } from "./amangiri";

export const galleryProjects: GalleryProject[] = [
  {
    number: "01",
    name: "Amangiri",
    location: "Canyon Point, UT",
    year: "2024",
    category: "Meetings + Incentive Travel",
    heroImage: {
      src: amangiriHome.topHero.src,
      alt: amangiriHome.topHero.alt,
    },
    detailImages: amangiriGalleryImages,
    note: "An incentive program staged inside the Amangiri landscape — long-table dinners against the sandstone, lounge moments at canyon's edge, and quiet pedestal vignettes between courses.",
  },
];

