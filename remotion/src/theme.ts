// Eclectic Hive brand palette — keep in lockstep with src/styles.css
export const COLORS = {
  charcoal: "#1a1a1a",
  cream: "#faf6ec",
  paper: "#f5f1ea",
  sand: "#d4cdc4",
  sandDeep: "#b8ad9f",
  ink: "#2b2520",
  ember: "#8a6a44",
} as const;

export type Swatch = { hex: string; name: string };
export const REAL_PALETTE: Swatch[] = [
  { hex: "#FAF4DC", name: "Paper" },
  { hex: "#E9D7B3", name: "Linen" },
  { hex: "#D2B99B", name: "Sand" },
  { hex: "#B6A28B", name: "Driftwood" },
  { hex: "#997E63", name: "Bronze" },
  { hex: "#A46539", name: "Amber" },
  { hex: "#6B5745", name: "Smoke" },
  { hex: "#543C23", name: "Cocoa" },
];

// Real brand gallery photos
export const INSPO = [
  "inspo/01-amangiri-dinner.jpg",
  "inspo/02-lynden-lounge.jpg",
  "inspo/03-dos-mas-tablescape.jpg",
  "inspo/04-brush-creek-sangeet.jpg",
  "inspo/05-brooke-hot-springs.jpg",
];

// 8 curated catalog products across 8 different categories.
export type Product = { src: string; title: string; category: string; hero?: boolean };
export const PRODUCTS: Product[] = [
  { src: "products/01-lars-table.png",        title: "LARS BLEACHED OAK TABLE",     category: "Tables",      hero: true },
  { src: "products/02-botond-chandelier.png", title: "BOTOND WALNUT CHANDELIER",    category: "Lighting" },
  { src: "products/03-fawn-chair.png",        title: "FAWN NATURAL CANE CHAIR",     category: "Seating" },
  { src: "products/04-beauregard-bar.png",    title: "BEAUREGARD TAMBOUR BAR",      category: "Bars" },
  { src: "products/05-tibur-tray.png",        title: "TIBUR TRAVERTINE TRAY",       category: "Serveware" },
  { src: "products/06-akoya-tableware.png",   title: "AKOYA TABLEWARE",             category: "Tableware" },
  { src: "products/07-amalia-votive.png",     title: "AMALIA SMOKE GLASS VOTIVE",   category: "Candlelight" },
  { src: "products/08-keitha-rug.png",        title: "KEITHA CHUNKY JUTE RUG",      category: "Rugs" },
];

// Each swatch is extracted from a DIFFERENT source — across inspo AND products.
// asset: "inspo" or "product" + index. The Palette scene draws a hairline from
// each source thumbnail in the constellation to the swatch's final position.
export type SwatchOrigin = { kind: "inspo" | "product"; idx: number; x: number; y: number };
export const SWATCH_ORIGINS: SwatchOrigin[] = [
  { kind: "inspo",   idx: 0, x: 0.50, y: 0.20 }, // Paper      — Amangiri sky
  { kind: "product", idx: 5, x: 0.55, y: 0.40 }, // Linen      — Akoya tableware
  { kind: "inspo",   idx: 4, x: 0.30, y: 0.50 }, // Sand       — Brooke hot springs
  { kind: "product", idx: 0, x: 0.50, y: 0.50 }, // Driftwood  — Lars table
  { kind: "inspo",   idx: 1, x: 0.65, y: 0.45 }, // Bronze     — Lynden lounge
  { kind: "inspo",   idx: 2, x: 0.55, y: 0.55 }, // Amber      — Dos Mas tablescape
  { kind: "product", idx: 1, x: 0.50, y: 0.55 }, // Smoke      — Botond chandelier
  { kind: "inspo",   idx: 3, x: 0.45, y: 0.65 }, // Cocoa      — Brush Creek sangeet
];

export const PAPER_TEXTURE = "textures/paper-grain.jpg";
