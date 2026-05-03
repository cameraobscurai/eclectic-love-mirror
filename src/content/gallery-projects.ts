// ---------------------------------------------------------------------------
// Gallery — project content
//
// Storage-backed selected projects for the editorial gallery.
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
  /** Single-word region tag for the lightbox eyebrow ("Utah", "Colorado"). */
  region: string;
  /** Short engagement type ("Wedding", "Private Celebration"). */
  kind: string;
  location: string;
  year: string;
  category: GalleryCategory;
  /** Hero/cover image for the index card and lightbox first plate. */
  heroImage: GalleryImage;
  /** Full image set shown in the lightbox filmstrip. */
  detailImages: GalleryImage[];
  /** ~25 word description for the lightbox sidebar. Grounded in real facts. */
  summary: string;
  /** Real venue coordinates [lng, lat] for the gallery map. */
  coords: [number, number];
  /** Optional internal subroute, only set when one actually exists. */
  href?: string;
  /** Optional longer note. Currently unused; reserved. */
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
    region: "Utah",
    kind: "Incentive Program",
    location: "Canyon Point, Utah",
    year: "2024",
    category: "Meetings + Incentive Travel",
    heroImage: amangiriGalleryHero,
    detailImages: amangiriGalleryImages,
    summary:
      "An incentive program staged inside the Amangiri landscape — long-table dinners against the sandstone, lounge moments at canyon's edge, quiet pedestal vignettes between courses.",
    coords: [-111.4357, 37.0306],
  },
  {
    number: "02",
    name: "Aspen Event Works",
    region: "Colorado",
    kind: "Wedding",
    location: "Aspen, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: aspenEventWorksGalleryHero,
    detailImages: aspenEventWorksGalleryImages,
    summary:
      "A private ranch wedding in the Aspen meadows — ceremony framed by mountain light, tented dinner under linen, and a champagne tower carrying through to the after.",
    coords: [-106.8175, 39.1911],
  },
  {
    number: "03",
    name: "Birch Design Studio",
    region: "Colorado",
    kind: "Wedding Weekend",
    location: "Caribou Club, Aspen",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: birchDesignGalleryHero,
    detailImages: birchDesignGalleryImages,
    summary:
      "A wedding weekend in Aspen — antler bar at the welcome, deep-green rehearsal dinner at Caribou, and a disco after-party brought from the Aspen Art Museum.",
    coords: [-106.8231, 39.1880],
  },
  {
    number: "04",
    name: "Easton Events",
    region: "Montana",
    kind: "Wedding",
    location: "Big Sky, Montana",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: eastonEventsMontanaGalleryHero,
    detailImages: eastonEventsMontanaGalleryImages,
    summary:
      "A tented celebration in the Big Sky landscape — alpine welcome lounges, ceremony beneath the peaks, and a long reception running late into the Montana evening.",
    coords: [-111.3088, 45.2841],
  },
  {
    number: "05",
    name: "Brooke Keegan Events",
    region: "Colorado",
    kind: "Wedding",
    location: "Dunton Hot Springs, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: brookeKeganDuntonGalleryHero,
    detailImages: brookeKeganDuntonGalleryImages,
    summary:
      "A multi-day wedding at Dunton Hot Springs — long meadow tables, candlelit interiors of the historic saloon, and intimate detail across every hour of the weekend.",
    coords: [-108.0728, 37.7669],
  },
  {
    number: "06",
    name: "Lynden Lane",
    region: "California",
    kind: "Private Celebration",
    location: "Private Residence",
    year: "2025",
    category: "Luxury Weddings",
    heroImage: lyndenLaneGalleryHero,
    detailImages: lyndenLaneGalleryImages,
    summary:
      "A private residence celebration — outdoor lounges set against modernist architecture, layered florals, and a quietly composed evening that unfolds across the property.",
    coords: [-118.4912, 34.0259],
  },
];
