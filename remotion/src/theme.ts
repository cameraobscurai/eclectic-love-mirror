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

// Real catalog products mirrored to public/products
export type Product = { src: string; title: string; category: string };
export const PRODUCTS: Product[] = [
  { src: "products/adelaide-chair.png", title: "ADELAIDE ARM CHAIR", category: "Seating" },
  { src: "products/aaron-table.png", title: "AARON COFFEE TABLE", category: "Tables" },
  { src: "products/alabaster-votive.png", title: "ALABASTER VOTIVE", category: "Candlelight" },
  { src: "products/alexander-decanter.png", title: "ALEXANDER DECANTER", category: "Serveware" },
  { src: "products/adonis-glass.png", title: "ADONIS GLASSWARE", category: "Tableware" },
  { src: "products/adele-disco.png", title: "MELTING DISCO BALL", category: "Styling" },
];
