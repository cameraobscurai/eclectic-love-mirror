// Eclectic Hive brand palette — keep in lockstep with src/styles.css
export const COLORS = {
  charcoal: "#1a1a1a",
  cream: "#ffffff",
  paper: "#f7f4ee",
  sand: "#d4cdc4",
  sandDeep: "#b8ad9f",
  ink: "#2b2520",
  ember: "#8a6a44",
} as const;

// Palette extracted (k-means) from the actual inspo/*.{webp,jpg,png} set in public/inspo.
// Sorted dark → light for editorial flow.
export const REAL_PALETTE = [
  "#1d1e1d",
  "#4f493e",
  "#736f63",
  "#848c93",
  "#a8a7a2",
  "#c0beb8",
  "#e9e1cf",
  "#f6f6f6",
];

// Legacy alias used by older scene code
export const SAMPLE_PALETTE = REAL_PALETTE;

// Real inspo files in public/inspo
export const INSPO = [
  "inspo/01.webp",
  "inspo/02.webp",
  "inspo/03.jpg",
  "inspo/04.png",
  "inspo/05.jpg",
];

// Real catalog products mirrored to public/products — curated mix the client
// would actually pin (no novelty items, varied categories, varied silhouettes).
export type Product = { src: string; title: string; category: string };
export const PRODUCTS: Product[] = [
  { src: "products/01-auset-banquette.png", title: "AUSET LINEN BANQUETTE", category: "Seating" },
  { src: "products/02-alora-chair.png", title: "ALORA BOTANICAL CHAIR", category: "Seating" },
  { src: "products/03-calloway-table.png", title: "CALLOWAY MARBLE TABLE", category: "Tables" },
  { src: "products/04-cressida-lamp.png", title: "CRESSIDA MARBLE LAMP", category: "Lighting" },
  { src: "products/05-alabaster-votive.png", title: "ALABASTER VOTIVE", category: "Candlelight" },
  { src: "products/06-linen-pillow.png", title: "BEIGE LINEN PILLOW", category: "Pillows" },
  { src: "products/07-evren-rug.png", title: "EVREN KILIM RUG", category: "Rugs" },
  { src: "products/08-keaton-mirror.png", title: "KEATON FLOOR MIRROR", category: "Large Decor" },
];
