/**
 * BOH — single configuration surface (manifest-corrected, v3-hardened).
 *
 * Every route below was verified against the repo audit. Pencils and tools
 * whose admin targets don't exist yet were REMOVED, not pointed at 404s —
 * a silent 404 is worse than absence. They're preserved in DEFERRED_TOOLS
 * at the bottom so nothing is forgotten when those editors get built.
 *
 * Two links (`/admin/photos?filter=…` and `/admin/products?group=`) require
 * the small validateSearch patches in PATCHES.md before they filter.
 */
import { PARENT_ORDER, PARENT_LABELS, type ParentId } from "@/lib/collection-parents";
import { type BrowseGroupId } from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS, coverUrl } from "@/lib/category-covers";

// ————————————————————————————————————————————— design tokens (from prototype)
export const T = {
  bg: "#191817",
  panel: "#201F1D",
  page: "#141312",
  ink: "#EAE6DE",
  muted: "#9B9484",
  dim: "#6E695F",
  faint: "#4A463E",
  attention: "#C4735A",
  hairline: "rgba(235,230,220,0.10)",
  hairlineHover: "rgba(235,230,220,0.38)",
  chipBg: "rgba(20,19,17,0.92)",
  serif: "'Cormorant Garamond', serif",
  sans: "'Archivo', sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  zoomEase: "cubic-bezier(0.3, 0.7, 0.25, 1)",
  zoomMs: 460,
  railW: 340,
  frameW: 1400, // Firecrawl viewport === zoom canvas: one coordinate space
  frameH: 920,
} as const;

// ————————————————————————————————————————————— top-level pages (zoomable)
export interface BohPage {
  num: string;
  name: string;
  route: string;
  slug: string; // storage key: boh-tiles/<slug>.jpg
}

export const PAGES: BohPage[] = [
  { num: "01", name: "Home", route: "/", slug: "home" },
  { num: "02", name: "Collection", route: "/collection", slug: "collection" },
  { num: "03", name: "Atelier", route: "/atelier", slug: "atelier" },
  { num: "04", name: "Gallery", route: "/gallery", slug: "gallery" },
  { num: "05", name: "Studio", route: "/stylebrief", slug: "stylebrief" },
  { num: "06", name: "Contact", route: "/contact", slug: "contact" },
];

// ————————————————————————————————————————————— category groups (strip)
/**
 * Derived from the repo's existing taxonomy — the same PARENT_ORDER /
 * PARENT_LABELS that /collection browse uses. NOT the CATEGORY_ORDER in
 * board-deck.ts (that's the proposal-board taxonomy; different list).
 */
export interface NavGroup {
  slug: string;
  name: string;
  image: string | null;
}

/**
 * CATEGORY_COVERS is keyed by BrowseGroupId (18 leaf ids), not ParentId
 * (11 slugs) — one representative leaf per parent stands in for the strip.
 * All 11 targets confirmed present in category-covers.ts.
 */
const PARENT_COVER_GROUP: Record<ParentId, BrowseGroupId> = {
  "lounge-seating": "sofas",
  "lounge-tables": "side-tables",
  "cocktail-bar": "bar",
  dining: "dining",
  tableware: "tableware",
  lighting: "lighting",
  textiles: "pillows",
  rugs: "rugs",
  styling: "styling",
  "large-decor": "storage",
  "furs-pelts": "throws",
};

export const NAV_GROUPS: NavGroup[] = PARENT_ORDER.map((slug) => ({
  slug,
  name: PARENT_LABELS[slug],
  image: coverUrl(CATEGORY_COVERS[PARENT_COVER_GROUP[slug]]),
}));

// ————————————————————————————————————————————— tool rail (grid header)
export interface BohTool {
  label: string;
  route: string;
  desc: string;
  countKey?: "openInquiries" | "totalItems"; // teamCount dropped: no team table exists
}

export const TOOL_RAIL: BohTool[] = [
  { label: "INBOX", route: "/admin/insights", desc: "Inquiry pipeline · new → quoted → booked", countKey: "openInquiries" },
  { label: "PHOTOS", route: "/admin/photos", desc: "Image binder" },
  { label: "COLORS", route: "/admin/colors", desc: "AI color tags" },
  { label: "PRODUCTS", route: "/admin/products", desc: "Catalog records", countKey: "totalItems" },
  { label: "TEAM", route: "/admin/team", desc: "Roles & invites" },
  // was /admin/insights#health (anchor doesn't exist); image-health is the
  // real catalog-health surface and keeps this distinct from INBOX
  { label: "HEALTH", route: "/admin/image-health", desc: "Image & catalog health" },
];

// ————————————————————————————————————————————— per-page tools (zoom rail)
export interface PageTool {
  title: string;
  sub: string;
  route: string;
}

export const PAGE_TOOLS: Record<string, PageTool[]> = {
  home: [
    { title: "HERO CLIPS", sub: "Swap or reorder the seasonal videos.", route: "/admin/upload-hero" },
  ],
  collection: [
    { title: "EDITORIAL ORDER", sub: "Reorder the archive (editorial sort is the default view).", route: "/admin/products" },
    { title: "PHOTO COVERAGE", sub: "Products missing images.", route: "/admin/photos?filter=missing" }, // needs PATCHES.md §1
  ],
  atelier: [
    { title: "PROCESS IMAGES", sub: "Swap fabrication photography.", route: "/admin/photos?page=atelier" }, // needs PATCHES.md §1
  ],
  gallery: [
    { title: "EVENT SETS", sub: "Add or reorder gallery sets.", route: "/admin/gallery" },
    { title: "COVER FRAMES", sub: "Choose the lead image per set.", route: "/admin/gallery" },
  ],
  stylebrief: [
    { title: "SUBMISSIONS", sub: "Briefs land in the inbox.", route: "/admin/insights" },
  ],
  contact: [
    { title: "INQUIRY DESTINATION", sub: "Where submissions land.", route: "/admin/insights" },
  ],
};

// ————————————————————————————————————————————— edit points (data-boh contract)
export interface EditPoint {
  label: string;
  route: string;
}

/**
 * Only keys with REAL admin destinations. Public pages may emit data-boh
 * attributes for keys not listed here — resolveEditPoint returns null and
 * no pencil renders. That's the graceful path for surfaces whose editors
 * don't exist yet (see DEFERRED_TOOLS).
 */
export const EDIT_POINTS: Record<string, EditPoint> = {
  "home.hero": { label: "✎ HERO CLIPS", route: "/admin/upload-hero" },
  "home.strip": { label: "✎ SEASONAL CLIPS", route: "/admin/upload-hero" },
  "gallery.sets": { label: "✎ EVENT SETS", route: "/admin/gallery" },
  "stylebrief.form": { label: "✎ SUBMISSIONS", route: "/admin/insights" },
  "contact.form": { label: "✎ INQUIRY DESTINATION", route: "/admin/insights" },
  // dynamic — id appended after a colon: data-boh="product:EH-0412"
  product: { label: "✎ EDIT", route: "/admin/products?id={id}" },
  photo: { label: "✎ IMAGE", route: "/admin/photos?product={id}" }, // needs PATCHES.md §1
};

export function resolveEditPoint(raw: string): (EditPoint & { key: string }) | null {
  const [key, id] = raw.split(":");
  const ep = EDIT_POINTS[key];
  if (!ep) return null;
  return { key: raw, label: ep.label, route: id ? ep.route.replace("{id}", id) : ep.route };
}

// ————————————————————————————————————————————— deferred (no admin target yet)
/**
 * Removed from live config because their destinations don't exist. When an
 * editor ships, move the entry back into EDIT_POINTS / PAGE_TOOLS.
 */
export const DEFERRED_TOOLS = [
  "collection.title",
  "atelier.copy",
  "settings.wordmark",
  "settings.collection-defaults",
  "stylebrief.schema",
  "contact.form-fields",
] as const;
