// ---------------------------------------------------------------------------
// Amangiri — first real Gallery project AND home page hero composition.
//
// Source of truth: image-galleries/AMANGIRI/* in Lovable Cloud storage.
// All four homepage slots and the gallery project share the same URLs.
// ---------------------------------------------------------------------------

import { galleriesUrl } from "@/lib/storage-image";

const FILE = {
  leftTall: "AMANGIRI/923B893B-128A-4F0F-B4D7-2A1FD93D42B7.jpeg",
  topHero: "AMANGIRI/C631CFB9-BE43-465B-BB80-0AEF41D4210E.jpeg",
  detailOne: "AMANGIRI/3123EA4B-F726-4905-8E0A-D4B72CFE124F.jpeg",
  detailTwo: "AMANGIRI/ADD ON Close Up.jpg",
  // alternates available for swap-in
  welcome: "AMANGIRI/ADD ON Welcome.jpg",
  bar: "AMANGIRI/ADD On Bar 2.jpg",
  loungeFloral: "AMANGIRI/ADD ON Lounge + floral.jpg",
} as const;

export interface HomeHeroImage {
  src: string;
  alt: string;
  /** CSS object-position for object-cover crops. */
  position?: string;
}

export const amangiriHome: {
  leftTall: HomeHeroImage;
  topHero: HomeHeroImage;
  detailOne: HomeHeroImage;
  detailTwo: HomeHeroImage;
} = {
  leftTall: {
    src: galleriesUrl(FILE.leftTall),
    alt: "Lounge furniture set against a sandstone wall at Amangiri",
    position: "center 60%",
  },
  topHero: {
    src: galleriesUrl(FILE.topHero),
    alt: "Concrete console with sculptural vessels in the Amangiri desert",
    position: "center 50%",
  },
  detailOne: {
    src: galleriesUrl(FILE.detailOne),
    alt: "Pedestal vase with branches against a textured wall",
    position: "center center",
  },
  detailTwo: {
    src: galleriesUrl(FILE.detailTwo),
    alt: "Close-up of a stone pedestal with a small bud vase and wildflowers",
    position: "center center",
  },
};

// Full curated set used for the Gallery project panel.
const ALL_AMANGIRI = [
  FILE.topHero,
  FILE.leftTall,
  FILE.detailOne,
  FILE.detailTwo,
  FILE.welcome,
  FILE.bar,
  FILE.loungeFloral,
  "AMANGIRI/3E9A02E2-E2B5-48CD-ADD1-CA72696EB7ED.jpeg",
  "AMANGIRI/4D7CEAAF-3AB9-4FDE-8816-3E2F48884B2F.jpeg",
  "AMANGIRI/52F22DC9-772E-4E6C-AC83-A410C9872E57.jpeg",
  "AMANGIRI/7D28AF40-82DD-44AE-B61F-09E6B70710E8.jpeg",
  "AMANGIRI/8D3495B8-561D-4F8C-BA93-EE46B40063ED.jpeg",
  "AMANGIRI/98171ECC-C860-4911-BC61-6FD36A14E85E.jpeg",
  "AMANGIRI/9D0CDD36-2379-485A-95AC-D1002BB7270D.jpeg",
  "AMANGIRI/9E9035E0-E84F-4079-B303-B815CC5F99F9.jpeg",
  "AMANGIRI/A4B28427-D41D-4FE6-94E5-D96D5EAE6C65.jpeg",
  "AMANGIRI/AD86EF2A-10FA-4656-938D-5001FF32CC0E.jpeg",
  "AMANGIRI/F48C68F1-2D4F-42FC-A6C2-16F90B2E8730.jpeg",
  "AMANGIRI/F756DB53-AEA0-48F7-87F5-6A65E580DCA9.jpeg",
];

export const amangiriGalleryImages = ALL_AMANGIRI.map((p) => ({
  src: galleriesUrl(p),
  alt: "Amangiri event environment by Eclectic Hive",
}));
