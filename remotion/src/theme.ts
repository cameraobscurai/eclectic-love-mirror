// Eclectic Hive brand palette — in lockstep with src/styles.css.
// Site is flat white #ffffff with charcoal #1a1a1a type. No warm cream.
export const COLORS = {
  charcoal: "#1a1a1a",
  cream: "#ffffff",      // alias of paper; site flattened to flat white
  paper: "#ffffff",
  sand: "#d4cdc4",
  ink: "#1a1a1a",
  rule: "rgba(26,26,26,0.10)",  // border / charcoal/10
  ruleStrong: "rgba(26,26,26,0.25)",
  muted: "rgba(26,26,26,0.55)",
  micro: "rgba(26,26,26,0.45)",
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

export const INSPO = [
  "inspo/01-amangiri-dinner.jpg",
  "inspo/02-lynden-lounge.jpg",
  "inspo/03-dos-mas-tablescape.jpg",
  "inspo/04-brush-creek-sangeet.jpg",
  "inspo/05-brooke-hot-springs.jpg",
];

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

export type SwatchOrigin = { kind: "inspo" | "product"; idx: number; x: number; y: number };
export const SWATCH_ORIGINS: SwatchOrigin[] = [
  { kind: "inspo",   idx: 0, x: 0.50, y: 0.20 },
  { kind: "product", idx: 5, x: 0.55, y: 0.40 },
  { kind: "inspo",   idx: 4, x: 0.30, y: 0.50 },
  { kind: "product", idx: 0, x: 0.50, y: 0.50 },
  { kind: "inspo",   idx: 1, x: 0.65, y: 0.45 },
  { kind: "inspo",   idx: 2, x: 0.55, y: 0.55 },
  { kind: "product", idx: 1, x: 0.50, y: 0.55 },
  { kind: "inspo",   idx: 3, x: 0.45, y: 0.65 },
];

// Site canvas geometry (1080×1920 9:16).
// Mirrors the .fluid-canvas gutter from the site (~56–64px).
export const GUTTER = 64;
export const CONTENT_W = 1080 - GUTTER * 2;   // 952
export const HEADER_TOP = 100;                 // wordmark band
export const STEP_TOP = 220;                   // STEP 0X label
export const TITLE_TOP = 268;                  // big serif title
export const RULE_TOP = 400;                   // hairline under title
export const CONTENT_TOP = 432;                // content starts
export const CONTENT_BOTTOM = 1720;            // above progress bar
