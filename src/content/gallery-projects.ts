// ---------------------------------------------------------------------------
// Gallery — project content
//
// Storage-backed selected projects for the editorial gallery.
// 15 projects in owner-confirmed order. Title shape: LOCATION, ST as the
// display name with the event planner as the eyebrow/subtitle.
//
// `pending: true` means the storage folder hasn't been uploaded yet — the
// project still appears in the index + filmstrip with a neutral charcoal
// placeholder, but the lightbox renders a quiet "in preparation" plate.
// Flip `pending` off + wire a real hero/manifest once the folder lands.
// ---------------------------------------------------------------------------

export type GalleryCategory =
  | "Luxury Weddings"
  | "Meetings + Incentive Travel"
  | "Social + Non-Profit";

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface GalleryProject {
  /** Two-digit slot number, drives the numbered rhythm. */
  number: string;
  /** Display name — LOCATION, ST (or LOCATION, REGION for international). */
  name: string;
  /** Event planner / design partner — rendered as eyebrow above the name. */
  planner: string;
  /** Single-word region tag for analytics + future filtering. */
  region: string;
  /** Engagement type ("Wedding", "Incentive Program", etc). */
  kind: string;
  /** Long-form location ("Canyon Point, Utah"). */
  location: string;
  year: string;
  category: GalleryCategory;
  heroImage: GalleryImage;
  detailImages: GalleryImage[];
  /** ~25 word summary for the lightbox sidebar. */
  summary: string;
  /** [lng, lat] for future mapping. [0,0] = unset. */
  coords: [number, number];
  /** True when storage folder isn't uploaded yet. */
  pending?: boolean;
  href?: string;
  note?: string;
}

import {
  amangiriGalleryImages,
  amangiriGalleryHero,
  aspenEventWorksGalleryHero,
  aspenEventWorksGalleryImages,
  brookeKeganDuntonGalleryHero,
  brookeKeganDuntonGalleryImages,
  dosMasEnLaMesaGalleryHero,
  dosMasEnLaMesaGalleryImages,
  eastonEventsMontanaGalleryHero,
  eastonEventsMontanaGalleryImages,
  lyndenLaneGalleryHero,
  lyndenLaneGalleryImages,
  pendingGalleryHero,
} from "./gallery-manifests";

export const galleryProjects: GalleryProject[] = [
  {
    number: "01",
    name: "AMANGIRI, AZ",
    planner: "EASTON EVENTS",
    region: "Utah",
    kind: "Incentive Program",
    location: "Canyon Point, Utah",
    year: "2024",
    category: "Meetings + Incentive Travel",
    heroImage: amangiriGalleryHero,
    detailImages: amangiriGalleryImages,
    summary:
      "Long-table Chinle dinner against the sandstone, lounge moments from the amphitheater, and the landscape framing every plate.",
    coords: [-111.4357, 37.0306],
  },
  {
    number: "02",
    name: "BRUSH CREEK RANCH, WY",
    planner: "LOVE THIS DAY",
    region: "Wyoming",
    kind: "Wedding Weekend",
    location: "Saratoga, Wyoming",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Brush Creek Ranch — Love This Day"),
    detailImages: [],
    summary:
      "Westworld Americana — color-blocked favorites, Carrie King Americana plus wedding, Ralph red-white-denim throughline.",
    coords: [-106.8083, 41.4549],
    pending: true,
  },
  {
    number: "03",
    name: "DUNTON HOT SPRINGS, CO",
    planner: "BROOKE KEEGAN EVENTS",
    region: "Colorado",
    kind: "Wedding",
    location: "Dunton, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: brookeKeganDuntonGalleryHero,
    detailImages: brookeKeganDuntonGalleryImages,
    summary:
      "A candlelit weekend at Dunton — long meadow tables, the historic saloon interior, and intimate detail across every hour.",
    coords: [-108.0728, 37.7669],
  },
  {
    number: "04",
    name: "DUNTON HOT SPRINGS, CO",
    planner: "EASTON EVENTS",
    region: "Colorado",
    kind: "Wedding",
    location: "Dunton, Colorado",
    year: "2022",
    category: "Luxury Weddings",
    heroImage: dosMasEnLaMesaGalleryHero,
    detailImages: dosMasEnLaMesaGalleryImages,
    summary:
      "Dos Mas en la Mesa — a saturated mountain wedding staged across the Dunton property over a long Colorado weekend.",
    coords: [-108.0728, 37.7669],
  },
  {
    number: "05",
    name: "BLACKBERRY FARMS, TN",
    planner: "EASTON EVENTS",
    region: "Tennessee",
    kind: "Wedding Weekend",
    location: "Walland, Tennessee",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Blackberry Farms — Easton Events"),
    detailImages: [],
    summary:
      "A December weekend at Blackberry Farms — wood-paneled dining, lantern light, layered hospitality detail.",
    coords: [-83.8090, 35.7434],
    pending: true,
  },
  {
    number: "06",
    name: "PRIVATE RESIDENCE, TX",
    planner: "CINERGY WORKS",
    region: "Texas",
    kind: "Private Celebration",
    location: "Texas",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Private Residence, TX — Cinergy Works"),
    detailImages: [],
    summary:
      "A private residence celebration — tablescape detail and deep evening tones across the property.",
    coords: [-97.7431, 30.2672],
    pending: true,
  },
  {
    number: "07",
    name: "BIG SKY, MT",
    planner: "EASTON EVENTS",
    region: "Montana",
    kind: "Wedding",
    location: "Big Sky, Montana",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: eastonEventsMontanaGalleryHero,
    detailImages: eastonEventsMontanaGalleryImages,
    summary:
      "A tented celebration in the Big Sky landscape — alpine welcome lounges, ceremony beneath the peaks, reception running late into the evening.",
    coords: [-111.3088, 45.2841],
  },
  {
    number: "08",
    name: "BRUSH CREEK RANCH, WY",
    planner: "DIWAN BY DESIGN",
    region: "Wyoming",
    kind: "Wedding",
    location: "Saratoga, Wyoming",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Brush Creek Ranch — Diwan by Design"),
    detailImages: [],
    summary:
      "Wedding day on the ranch — open ceremony in the meadow, reception staged against the Wyoming horizon.",
    coords: [-106.8083, 41.4549],
    pending: true,
  },
  {
    number: "09",
    name: "BISHOP'S LODGE, NM",
    planner: "42 NORTH",
    region: "New Mexico",
    kind: "Wedding Weekend",
    location: "Santa Fe, New Mexico",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Bishop's Lodge — 42 North"),
    detailImages: [],
    summary:
      "Cocktail hour to ceremony to tent, with Santa Fe earth tones running through Friday's details.",
    coords: [-105.9378, 35.6870],
    pending: true,
  },
  {
    number: "10",
    name: "THE ENCORE, MA",
    planner: "DIWAN BY DESIGN",
    region: "Massachusetts",
    kind: "Wedding",
    location: "Boston, Massachusetts",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("The Encore — Diwan by Design"),
    detailImages: [],
    summary:
      "A ballroom wedding at The Encore — architectural scale, layered floral, evening dance program.",
    coords: [-71.0589, 42.3601],
    pending: true,
  },
  {
    number: "11",
    name: "FOUR SEASONS VAIL, CO",
    planner: "CASSIE LAMERE EVENTS",
    region: "Colorado",
    kind: "Wedding Weekend",
    location: "Vail, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Four Seasons Vail — Cassie Lamere Events"),
    detailImages: [],
    summary:
      "An alpine weekend at Four Seasons Vail with Cassie Lamere — feature program across welcome, ceremony, reception.",
    coords: [-106.3742, 39.6403],
    pending: true,
  },
  {
    number: "12",
    name: "ASPEN, CO",
    planner: "ASPEN EVENT WORKS",
    region: "Colorado",
    kind: "Wedding",
    location: "Aspen, Colorado — Private Ranch",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: aspenEventWorksGalleryHero,
    detailImages: aspenEventWorksGalleryImages,
    summary:
      "A private ranch wedding in the Aspen meadows — day to personal to night, tented dinner under linen.",
    coords: [-106.8175, 39.1911],
  },
  {
    number: "13",
    name: "TELLURIDE, CO",
    planner: "LYNDEN LANE",
    region: "Colorado",
    kind: "Private Celebration",
    location: "Telluride, Colorado",
    year: "2025",
    category: "Luxury Weddings",
    heroImage: lyndenLaneGalleryHero,
    detailImages: lyndenLaneGalleryImages,
    summary:
      "A modernist outdoor program — sculptural lounges set against the architecture, layered florals through the evening.",
    coords: [-107.8123, 37.9375],
  },
  {
    number: "14",
    name: "ANGUILLA, CARIBBEAN",
    planner: "MICHELLE RAGO DESTINATIONS",
    region: "Caribbean",
    kind: "Destination Wedding",
    location: "Anguilla, British West Indies",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Anguilla — Michelle Rago Destinations"),
    detailImages: [],
    summary:
      "Wedding-day lounge by the sea — a destination program built around the water with quiet detail throughout.",
    coords: [-63.0686, 18.2206],
    pending: true,
  },
  {
    number: "15",
    name: "HOTEL JEROME, CO",
    planner: "BIRCH DESIGN STUDIO",
    region: "Colorado",
    kind: "Wedding Weekend",
    location: "Aspen, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: pendingGalleryHero("Hotel Jerome — Birch Design Studio"),
    detailImages: [],
    summary:
      "Sapna and Ari at Hotel Jerome — pastel welcome, rehearsal detail, and a celebratory program across Aspen.",
    coords: [-106.8231, 39.1880],
    pending: true,
  },
];
