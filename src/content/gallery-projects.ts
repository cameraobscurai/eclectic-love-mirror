// ---------------------------------------------------------------------------
// Gallery — project content
//
// Owner-locked 15-slot sequence (notes 2026-05-19). Title shape is
// LOCATION, ST as the display name with the event planner as the eyebrow.
//
// `pending: true` = storage folder not yet uploaded; tile renders a charcoal
// placeholder via `pendingGalleryHero(...)`. Flip off + wire a real manifest
// when the folder lands.
//
// `coverDirective` encodes owner intent for the future bake/pick script:
//   - filenameHint / excludeHints — hard picks + drops from owner notes
//   - distance — close/medium/far rotation so adjacent tiles never repeat
//   - toneSlot — 1 (darkest/moodiest) → 15 (pastels), enforces the cover arc
//
// `curationNotes` are the owner's per-gallery directives, verbatim shorthand.
// ---------------------------------------------------------------------------

export type GalleryCategory =
  | "Luxury Weddings"
  | "Meetings + Incentive Travel"
  | "Social + Non-Profit";

export interface GalleryImage {
  /** Poster/thumbnail URL. For video plates this is the poster JPG. */
  src: string;
  alt: string;
  /** Optional MP4 URL — when set, the lightbox renders a <video> with `src`
   *  as the poster. Filmstrip thumbs render a play badge. */
  video?: string;
}

export interface CoverDirective {
  /** Owner's hard pick — substring matched against filenames. */
  filenameHint?: string;
  /** Filenames containing any of these substrings are excluded. */
  excludeHints?: string[];
  /** Cover distance preference for cross-gallery variety. */
  distance: "close" | "medium" | "far";
  /** 1 (darkest/moodiest) → 15 (pastels) — owner's dark→pastel cover arc. */
  toneSlot: number;
}

export interface GalleryProject {
  /** Two-digit slot number, drives the numbered rhythm. */
  number: string;
  /** Display name — LOCATION, ST. */
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
  /** Owner's per-gallery directives (verbatim shorthand). */
  curationNotes?: string;
  /** Cover-pick rules consumed by the bake script when folders land. */
  coverDirective?: CoverDirective;
  /** Catalog slugs to surface as a "Shop the Look" rail in the lightbox. */
  relatedInventorySlugs?: string[];
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
  dosMasEnLaMesaGalleryHero,
  dosMasEnLaMesaGalleryImages,
  eastonEventsMontanaGalleryHero,
  eastonEventsMontanaGalleryImages,
  lyndenLaneGalleryHero,
  lyndenLaneGalleryImages,
  pendingGalleryHero,
  anguillaMicheleRagoGalleryHero,
  anguillaMicheleRagoGalleryImages,
  brushCreekLoveThisDayGalleryHero,
  brushCreekLoveThisDayGalleryImages,
  brushCreekDiwanGalleryHero,
  brushCreekDiwanGalleryImages,
  bishopsLodge42NorthGalleryHero,
  bishopsLodge42NorthGalleryImages,
  encoreBostonDiwanGalleryHero,
  encoreBostonDiwanGalleryImages,
  privateResidenceTxCinergyGalleryHero,
  privateResidenceTxCinergyGalleryImages,
  blackberryFarmsEastonGalleryHero,
  blackberryFarmsEastonGalleryImages,
  fourSeasonsVailCassieLamereGalleryHero,
  fourSeasonsVailCassieLamereGalleryImages,
} from "./gallery-manifests";
import { galleriesUrl, publicStorageUrl } from "@/lib/storage-image";
import { promoteHeroes } from "@/lib/gallery-hero-promotion";

// Planners hard-excluded from the gallery surface.
export const GALLERY_EXCLUDE_PLANNERS = ["VanderWeide"] as const;
// Planners under NDA — referenced but never published.
export const GALLERY_NDA_PLANNERS = ["Thomas"] as const;

// Brooke Keegan cover: owner specified MKSadler 4118.
const brookeKeganDuntonHero4118: GalleryImage = {
  src: galleriesUrl("JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4118-2.jpg"),
  alt: "Candlelit detail at Dunton Hot Springs — MKSadler 4118",
};

// Easton Events × Dunton Hot Springs — 5 reels mirrored to videos/dunton-easton/.
// See scripts-tmp/dunton-videos-manifest.json.
const DUNTON_EASTON_VIDEO_BASE = publicStorageUrl("videos", "dunton-easton").replace(
  /\/$/,
  "",
);
const duntonEastonReels: GalleryImage[] = [
  { slug: "03-ceremony",   label: "Ceremony" },
  { slug: "04-reception",  label: "Reception" },
  { slug: "01-rehearsal",  label: "Rehearsal" },
  { slug: "05-casino-night", label: "Casino Night" },
  { slug: "02-fashion",    label: "Fashion" },
].map(({ slug, label }) => ({
  src: `${DUNTON_EASTON_VIDEO_BASE}/${slug}.jpg`,
  video: `${DUNTON_EASTON_VIDEO_BASE}/${slug}.mp4`,
  alt: `${label} reel — Easton Events at Dunton Hot Springs`,
}));


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
    detailImages: promoteHeroes(amangiriGalleryImages, {
      // Hard-pin: 5-perspective jury (Vogue editor / scroll-stopper / landscape
      // critic / luxury bride) + owner's favorite. Algorithm was burying these.
      pin: [
        "gahan__Raven_s_Nest_at_Night_3",            // jury #1 — canyon cathedral, wide
        "chinledinner__D9D9D665",                    // ⭐ owner favorite — long-table vs sandstone
        "gahan__Raven_s_Nest_at_Night2",             // glowing curved table, blue hour
        "chinledinner__ADD_ON_Night_Shot_3",         // moody single-structure remote luxury
      ],
    }),
    summary:
      "Long-table Chinle dinner against the sandstone, lounge moments from the amphitheater, and the landscape framing every plate.",
    coords: [-111.4357, 37.0306],
    curationNotes:
      "Feature. Chinle dinner; lounge from amphitheater; landscape; Fireside all 5. Skip pool deck.",
    coverDirective: { distance: "far", toneSlot: 1 },
  },
  {
    number: "02",
    name: "PRIVATE RESIDENCE ASPEN, CO",
    planner: "ASPEN EVENT WORKS",
    region: "Colorado",
    kind: "Wedding",
    location: "Aspen, Colorado — Private Ranch",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: aspenEventWorksGalleryHero,
    detailImages: promoteHeroes(aspenEventWorksGalleryImages),
    summary:
      "A private ranch wedding in the Aspen meadows — day to personal to night, tented dinner under linen.",
    coords: [-106.8175, 39.1911],
    curationNotes:
      "Tent 2. Day → personal interleaved → end at night.",
    coverDirective: { filenameHint: "Tent 2", distance: "close", toneSlot: 2 },
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
    heroImage: brookeKeganDuntonHero4118,
    detailImages: promoteHeroes(brookeKeganDuntonGalleryImages),
    summary:
      "A candlelit weekend at Dunton — long meadow tables, the historic saloon interior, and intimate detail across every hour.",
    coords: [-108.0728, 37.7669],
    curationNotes: "Feature 06.15 — all pics. MKSadler 4118.",
    coverDirective: {
      filenameHint: "MKSADLER-4118",
      distance: "medium",
      toneSlot: 3,
    },
  },
  {
    number: "04",
    name: "BRUSH CREEK RANCH, WY",
    planner: "DIWAN BY DESIGN",
    region: "Wyoming",
    kind: "Wedding",
    location: "Saratoga, Wyoming",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: brushCreekDiwanGalleryHero,
    detailImages: promoteHeroes(brushCreekDiwanGalleryImages),
    summary:
      "Wedding day on the ranch — open ceremony in the meadow, reception staged against the Wyoming horizon.",
    coords: [-106.8083, 41.4549],
    curationNotes: "Sapna + Ari — Sangeet + Wedding favorites.",
    coverDirective: { distance: "medium", toneSlot: 4 },
  },
  {
    number: "05",
    name: "TELLURIDE, CO",
    planner: "LYNDEN LANE",
    region: "Colorado",
    kind: "Private Celebration",
    location: "Telluride, Colorado",
    year: "2025",
    category: "Luxury Weddings",
    heroImage: lyndenLaneGalleryHero,
    detailImages: promoteHeroes(lyndenLaneGalleryImages),
    summary:
      "A modernist outdoor program — sculptural lounges set against the architecture, layered florals through the evening.",
    coords: [-107.8123, 37.9375],
    curationNotes: "Exclude :1083. Cover = 1143.",
    coverDirective: {
      filenameHint: "1143",
      excludeHints: ["1083"],
      distance: "far",
      toneSlot: 5,
    },
  },
  {
    number: "06",
    name: "FOUR SEASONS VAIL, CO",
    planner: "CASSIE LAMERE EVENTS",
    region: "Colorado",
    kind: "Wedding Weekend",
    location: "Vail, Colorado",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: fourSeasonsVailCassieLamereGalleryHero,
    detailImages: promoteHeroes(fourSeasonsVailCassieLamereGalleryImages),
    summary:
      "An alpine weekend at Four Seasons Vail with Cassie Lamere — feature program across welcome, ceremony, reception.",
    coords: [-106.3742, 39.6403],
    curationNotes: "Feature Cassie. Folder: Cassime Lamere.",
    coverDirective: { distance: "medium", toneSlot: 1 },
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
    detailImages: promoteHeroes(eastonEventsMontanaGalleryImages),
    summary:
      "A tented celebration in the Big Sky landscape — alpine welcome lounges, ceremony beneath the peaks, reception running late into the evening.",
    coords: [-111.3088, 45.2841],
    curationNotes: "Feature Montana folder.",
    coverDirective: { distance: "close", toneSlot: 2 },
  },
  {
    number: "08",
    name: "DUNTON HOT SPRINGS, CO",
    planner: "EASTON EVENTS",
    region: "Colorado",
    kind: "Wedding",
    location: "Dunton, Colorado",
    year: "2022",
    category: "Luxury Weddings",
    heroImage: dosMasEnLaMesaGalleryHero,
    detailImages: promoteHeroes(dosMasEnLaMesaGalleryImages),
    summary:
      "Dos Mas en la Mesa — a saturated mountain wedding staged across the Dunton property over a long Colorado weekend.",
    coords: [-108.0728, 37.7669],
    curationNotes: "Folder: Dos Mas en la Mesa.",
    coverDirective: { distance: "close", toneSlot: 3 },
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
    heroImage: bishopsLodge42NorthGalleryHero,
    detailImages: promoteHeroes(bishopsLodge42NorthGalleryImages),
    summary:
      "Cocktail hour to ceremony to tent, with Santa Fe earth tones running through Friday's details.",
    coords: [-105.9378, 35.6870],
    curationNotes:
      "Feature Santa Fe. Cocktail hour → ceremony → tent (10) → Friday details (5).",
    coverDirective: { distance: "close", toneSlot: 4 },
  },
  {
    number: "10",
    name: "BLACKBERRY FARMS, TN",
    planner: "EASTON EVENTS",
    region: "Tennessee",
    kind: "Wedding Weekend",
    location: "Walland, Tennessee",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: blackberryFarmsEastonGalleryHero,
    detailImages: promoteHeroes(blackberryFarmsEastonGalleryImages),
    summary:
      "A December weekend at Blackberry Farms — wood-paneled dining, lantern light, layered hospitality detail.",
    coords: [-83.8090, 35.7434],
    curationNotes: "Folder: December Blackberry Farms.",
    coverDirective: { distance: "far", toneSlot: 5 },
  },
  {
    number: "11",
    name: "BRUSH CREEK RANCH, WY",
    planner: "LOVE THIS DAY",
    region: "Wyoming",
    kind: "Wedding Weekend",
    location: "Saratoga, Wyoming",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: brushCreekLoveThisDayGalleryHero,
    detailImages: promoteHeroes(brushCreekLoveThisDayGalleryImages),
    summary:
      "Westworld Americana — color-blocked favorites, Carrie King Americana plus wedding, Ralph red-white-denim throughline.",
    coords: [-106.8083, 41.4549],
    curationNotes:
      "LTD favorites — open, arrange on color (Westworld). Carrie King: Americana + N+B wedding (3). Ralph: red/white/denim. Westworld. Erich add-ons: Westworld.",
    coverDirective: { distance: "far", toneSlot: 1 },
  },
  {
    number: "12",
    name: "THE ENCORE, MA",
    planner: "DIWAN BY DESIGN",
    region: "Massachusetts",
    kind: "Wedding",
    location: "Boston, Massachusetts",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: encoreBostonDiwanGalleryHero,
    detailImages: promoteHeroes(encoreBostonDiwanGalleryImages),
    summary:
      "A ballroom wedding at The Encore — architectural scale, layered floral, evening dance program.",
    coords: [-71.0589, 42.3601],
    coverDirective: { distance: "medium", toneSlot: 2 },
  },
  {
    number: "13",
    name: "ANGUILLA, CARIBBEAN",
    planner: "MICHELLE RAGO DESTINATIONS",
    region: "Caribbean",
    kind: "Destination Wedding",
    location: "Anguilla, British West Indies",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: anguillaMicheleRagoGalleryHero,
    detailImages: promoteHeroes(anguillaMicheleRagoGalleryImages),
    summary:
      "Wedding-day lounge by the sea — a destination program built around the water with quiet detail throughout.",
    coords: [-63.0686, 18.2206],
    curationNotes: "Feature Anguilla folder. Wedding day lounge by the sea.",
    coverDirective: { distance: "medium", toneSlot: 3 },
  },
  {
    number: "14",
    name: "PRIVATE RESIDENCE, TX",
    planner: "CINERGY WORKS",
    region: "Texas",
    kind: "Private Celebration",
    location: "Texas",
    year: "2024",
    category: "Luxury Weddings",
    heroImage: privateResidenceTxCinergyGalleryHero,
    detailImages: promoteHeroes(privateResidenceTxCinergyGalleryImages),
    summary:
      "A private residence celebration — tablescape detail and deep evening tones across the property.",
    coords: [-97.7431, 30.2672],
    coverDirective: { distance: "close", toneSlot: 4 },
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
    heroImage: birchDesignGalleryHero,
    detailImages: promoteHeroes(birchDesignGalleryImages),
    summary:
      "Aspen weekend with Birch — Caribou rehearsal dinner, Aspen Art Museum welcome party, disco after-party in pastel light.",
    coords: [-106.8231, 39.1880],
    curationNotes: "Folder: BIRCH-DESIGN. Slot moved to end of sequence.",
    coverDirective: { distance: "far", toneSlot: 5 },
  }
];

