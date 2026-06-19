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

export type Swatch = { hex: string; name: string; from: string };

// Tones extracted from the actual inspo + product files. Each swatch is
// traceable to a real image in the picker — palette as proof, not decoration.
export const REAL_PALETTE: Swatch[] = [
  { hex: "#E2DED2", name: "Limestone",    from: "Amangiri"   },
  { hex: "#D1BE9B", name: "Bleached Oak", from: "Lars"       },
  { hex: "#C8A989", name: "Travertine",   from: "Tibur"      },
  { hex: "#8B7562", name: "Cane",         from: "Fawn"       },
  { hex: "#A13B22", name: "Clay Ember",   from: "Dos Mas"    },
  { hex: "#6D7D96", name: "Blue Smoke",   from: "Lynden"     },
  { hex: "#4B332C", name: "Walnut",       from: "Botond"     },
  { hex: "#211E1A", name: "Char",         from: "Brooke"     },
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

// Tether origins per swatch: where the line is drawn FROM in Scene 3.
// Each entry matches REAL_PALETTE index → its real source image.
export type SwatchOrigin = { kind: "inspo" | "product"; idx: number; x: number; y: number };
export const SWATCH_ORIGINS: SwatchOrigin[] = [
  { kind: "inspo",   idx: 0, x: 0.50, y: 0.30 },  // Limestone     ← Amangiri
  { kind: "product", idx: 0, x: 0.50, y: 0.50 },  // Bleached Oak  ← Lars
  { kind: "product", idx: 4, x: 0.50, y: 0.50 },  // Travertine    ← Tibur
  { kind: "product", idx: 2, x: 0.50, y: 0.50 },  // Cane          ← Fawn
  { kind: "inspo",   idx: 2, x: 0.50, y: 0.50 },  // Clay Ember    ← Dos Mas
  { kind: "inspo",   idx: 1, x: 0.50, y: 0.50 },  // Blue Smoke    ← Lynden
  { kind: "product", idx: 1, x: 0.50, y: 0.50 },  // Walnut        ← Botond
  { kind: "inspo",   idx: 4, x: 0.50, y: 0.50 },  // Char          ← Brooke
];

// Per-scene accent tone used by the wide rail hairline.
// Pulled from REAL_PALETTE so the rail is visibly tied to the palette.
export const SCENE_ACCENT: string[] = [
  "#6D7D96", // S1 Imagined  — Blue Smoke (inspo)
  "#D1BE9B", // S2 Sourced   — Bleached Oak (product)
  "#A13B22", // S3 Composed  — Clay Ember
  "#4B332C", // S4 Designed  — Walnut
  "#211E1A", // S5 Realized  — Char
];

// Site canvas geometry (1080×1920 9:16).
// Mirrors the .fluid-canvas gutter from the site (~56–64px).
// Generous vertical rhythm — the site breathes; the video should too.
export const GUTTER = 72;
export const CONTENT_W = 1080 - GUTTER * 2;   // 936
export const HEADER_TOP = 100;                 // wordmark band
export const STEP_TOP = 250;                   // STEP 0X label (more air under chrome)
export const TITLE_TOP = 310;                  // big serif title
export const RULE_TOP = 452;                   // hairline under title (extra breathing)
export const CONTENT_TOP = 560;                // content starts (clear of italic subtitle)
export const CONTENT_BOTTOM = 1680;            // above progress bar
