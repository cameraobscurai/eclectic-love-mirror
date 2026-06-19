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

// Palette extracted from the new inspo set — sorted lightest → darkest
// with editorial names (not hex names) above each swatch.
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

// Inspiration set — diverse subjects: interior, textile macro, still life,
// architecture, kilim flat-lay.
export const INSPO = [
  "inspo/01-table-dusk.jpg",
  "inspo/02-linen-texture.jpg",
  "inspo/03-candle-stilllife.jpg",
  "inspo/04-architecture.jpg",
  "inspo/05-kilim.jpg",
];

// Per-swatch origin coords (0-1) mapped to a source inspo image for the
// "extract palette" sequence. Each swatch travels from a real pixel region
// on a real image out to its final position.
export const SWATCH_ORIGINS: { inspoIndex: 0 | 1; x: number; y: number }[] = [
  { inspoIndex: 0, x: 0.50, y: 0.18 },  // Paper — sky/wall light
  { inspoIndex: 1, x: 0.30, y: 0.60 },  // Linen — fabric mid-tone
  { inspoIndex: 0, x: 0.30, y: 0.80 },  // Sand — floor stone
  { inspoIndex: 1, x: 0.70, y: 0.55 },  // Driftwood — fabric shadow
  { inspoIndex: 0, x: 0.65, y: 0.42 },  // Bronze — wall warmth
  { inspoIndex: 1, x: 0.85, y: 0.30 },  // Amber — deep linen fold
  { inspoIndex: 0, x: 0.20, y: 0.55 },  // Smoke — distant shadow
  { inspoIndex: 1, x: 0.50, y: 0.85 },  // Cocoa — fabric deep
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

export const PAPER_TEXTURE = "textures/paper-grain.jpg";
