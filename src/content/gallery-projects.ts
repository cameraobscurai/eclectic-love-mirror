// ---------------------------------------------------------------------------
// Gallery — project content
//
// Storage-backed selected projects for the editorial gallery rail.
// Each project maps directly to a real folder in `image-galleries`.
// No fake projects, no stock imagery, no invented case-study copy.
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
  /** Full image set shown in the panel thumbnail strip. */
  detailImages: GalleryImage[];
  /** Optional internal subroute, only set when one actually exists. */
  href?: string;
  /** One short paragraph about the project. Optional. */
  note?: string;
}

import {
  amangiriGalleryImages,
  amangiriGalleryHero,
  aspenEventWorksGalleryHero,
  aspenEventWorksGalleryImages,
  birchDesignGalleryHero,
  birchDesignGalleryImages,
  brookeKeganDuntonGalleryHero,
  brookeKeganDuntonGalleryImages,
  eastonEventsMontanaGalleryHero,
  eastonEventsMontanaGalleryImages,
  lyndenLaneGalleryHero,
  lyndenLaneGalleryImages,
} from "./gallery-manifests";

export const galleryProjects: GalleryProject[] = [
  {
    number: "01",
    name: "Amangiri",
    location: "Canyon Point, UT",
    year: "2024",
    category: "Meetings + Incentive Travel",
    heroImage: amangiriGalleryHero,
    detailImages: amangiriGalleryImages,
    note: "An incentive program staged inside the Amangiri landscape — long-table dinners against the sandstone, lounge moments at canyon's edge, and quiet pedestal vignettes between courses.",
  },
  {
    number: "02",
    name: "Aspen Event Works",
    location: "Aspen, CO",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: aspenEventWorksGalleryHero,
    detailImages: aspenEventWorksGalleryImages,
  },
  {
    number: "03",
    name: "Birch Design Studio",
    location: "Caribou Club, Aspen",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: birchDesignGalleryHero,
    detailImages: birchDesignGalleryImages,
  },
  {
    number: "04",
    name: "Easton Events",
    location: "Big Sky, MT",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: eastonEventsMontanaGalleryHero,
    detailImages: eastonEventsMontanaGalleryImages,
  },
  {
    number: "05",
    name: "Brooke Keegan Events",
    location: "Dunton Hot Springs, CO",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: brookeKeganDuntonGalleryHero,
    detailImages: brookeKeganDuntonGalleryImages,
  },
  {
    number: "06",
    name: "Lynden Lane",
    location: "Private Residence",
    year: "2025",
    category: "Luxury Weddings",
    heroImage: lyndenLaneGalleryHero,
    detailImages: lyndenLaneGalleryImages,
  },
];
