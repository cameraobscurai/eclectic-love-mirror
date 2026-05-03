// Pre-bakes src/data/phase3/phase3_catalog.json from the frozen Phase 3 CSVs.
// Run with: bun scripts/build-phase3-catalog.mjs
//
// Public-ready rule (locked):
//   primaryImage && !known_404 && title && final_confidence >= 0.70

import { readFileSync, writeFileSync } from "node:fs";

function parse(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = []; let row = [], field = "", q = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); field = ""; if (!(row.length === 1 && row[0] === "")) rows.push(row); row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); if (!(row.length === 1 && row[0] === "")) rows.push(row); }
  const h = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(h.map((k, j) => [k, r[j] ?? ""])));
}

const CATEGORY_DISPLAY_MAP = {
  accents1: "Accents", bars1: "Cocktail & Bar", "benches-ottomans1": "Benches & Ottomans",
  "chairs-stools1": "Chairs & Stools", "cocktail-bar": "Cocktail & Bar", dining: "Dining",
  "large-decor": "Large Decor", light: "Lighting", lounge: "Lounge Seating",
  "lounge-tables": "Lounge Tables", "pillows-throws1": "Pillows & Throws", rugs: "Rugs",
  "sofas-loveseats1": "Sofas & Loveseats", storage1: "Storage", styling: "Styling",
  tables1: "Tables", tableware: "Tableware", textiles: "Textiles",
};
const CATEGORY_DISPLAY_ORDER = [
  "Lounge Seating", "Sofas & Loveseats", "Chairs & Stools", "Benches & Ottomans", "Lounge Tables",
  "Tables", "Dining", "Cocktail & Bar", "Tableware", "Textiles", "Pillows & Throws", "Rugs",
  "Lighting", "Large Decor", "Styling", "Accents", "Storage",
];
// Subcategory keyword detection per category. Order matters — first match wins.
// 0-count subcategories are auto-hidden in the UI by faceting against the
// public-ready set, so over-listing here is safe.
const SUBCATEGORY_RULES = {
  // Lounge Seating
  lounge: [
    { label: "Sofas", match: /\bsofa|loveseat|settee/i },
    { label: "Benches", match: /\bbench/i },
    { label: "Ottomans", match: /\bottoman|pouf/i },
    { label: "Stools", match: /\bstool/i },
    { label: "Chairs", match: /\bchair|armchair|club|wingback|slipper/i },
  ],
  "sofas-loveseats1": [
    { label: "Sofas", match: /\bsofa/i },
    { label: "Loveseats", match: /\bloveseat|settee/i },
  ],
  "chairs-stools1": [
    { label: "Stools", match: /\bstool/i },
    { label: "Chairs", match: /\bchair/i },
  ],
  "benches-ottomans1": [
    { label: "Ottomans", match: /\bottoman|pouf/i },
    { label: "Benches", match: /\bbench/i },
  ],
  // Tables
  tables1: [
    { label: "Dining Tables", match: /\bdining/i },
    { label: "Highboys", match: /\bhighboy|high\s*top|cocktail\s*table|pub\s*table/i },
    { label: "Consoles", match: /\bconsole/i },
    { label: "Side Tables", match: /\bside\b|accent\s*table/i },
    { label: "Coffee Tables", match: /\bcoffee/i },
  ],
  "lounge-tables": [
    { label: "Coffee Tables", match: /\bcoffee/i },
    { label: "Side Tables", match: /\bside\b|accent\s*table/i },
    { label: "Consoles", match: /\bconsole/i },
  ],
  // Cocktail & Bar (both legacy slugs)
  "cocktail-bar": [
    { label: "Back Bars", match: /\bback\s*bar/i },
    { label: "Bar Carts", match: /\bcart/i },
    { label: "Bar Shelving", match: /\bshel(f|ving)|hutch|étagère|etagere/i },
    { label: "Bars", match: /\bbar\b/i },
  ],
  bars1: [
    { label: "Back Bars", match: /\bback\s*bar/i },
    { label: "Bar Carts", match: /\bcart/i },
    { label: "Bar Shelving", match: /\bshel(f|ving)|hutch|étagère|etagere/i },
    { label: "Bars", match: /\bbar\b/i },
  ],
  // Large Decor
  "large-decor": [
    { label: "Screens", match: /\bscreen|divider|partition/i },
    { label: "Fireplaces", match: /\bfireplace|hearth/i },
    { label: "Planters", match: /\bplanter|urn|jardiniere/i },
    { label: "Mirrors", match: /\bmirror/i },
    { label: "Structures", match: /\barch|pergola|gazebo|column|pedestal|backdrop|frame|structure/i },
  ],
  // Lighting
  light: [
    { label: "Floor Lamps", match: /\bfloor\b.*\blamp|\blamp\b.*\bfloor/i },
    { label: "Table Lamps", match: /\btable\b.*\blamp|\blamp\b.*\btable/i },
    { label: "Pendants", match: /\bpendant|chandelier|sconce/i },
    { label: "Candles & Holders", match: /\bcandle|votive|hurricane/i },
  ],
  // Tableware
  tableware: [
    { label: "Glassware", match: /\bglass|coupe|flute|tumbler|goblet/i },
    { label: "Plates", match: /\bplate|charger/i },
    { label: "Flatware", match: /\bflatware|spoon|fork|knife/i },
  ],
  // Textiles / Linens
  textiles: [
    { label: "Linens", match: /\blinen|napkin|runner|tablecloth/i },
    { label: "Throws", match: /\bthrow|blanket/i },
  ],
};
const KNOWN_404 = "https://www.eclectichive.com/cocktail-bar/broadway-32in";
const nullable = v => { if (v == null) return null; const t = v.trim(); return t.length === 0 ? null : t; };
const bool = v => v === "true" || v === "TRUE" || v === "1";
const num = (v, f = 0) => { if (v == null || v === "") return f; const n = Number(v); return Number.isFinite(n) ? n : f; };
const detectSub = (cat, title) => { const r = SUBCATEGORY_RULES[cat]; if (!r) return null; for (const x of r) if (x.match.test(title)) return x.label; return null; };

const productRows = parse(readFileSync("src/data/phase3/phase3_final_products.csv", "utf8"));
const imageRows = parse(readFileSync("src/data/phase3/phase3_final_images.csv", "utf8"));
const reviewRows = parse(readFileSync("src/data/phase3/phase3_manual_review_queue.csv", "utf8"));

// ---- Owner-site order (soft hint) -----------------------------------------
// Captured by scripts/capture-owner-site-order.mjs. Optional: if the file is
// missing, ownerSiteRank stays null on every product and current behavior
// holds. Title match is deterministic — no LLM. Unmatched titles are printed
// per-category so we can spot-check.
const normalizeTitle = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

let ownerOrder = null;
try {
  ownerOrder = JSON.parse(readFileSync("src/data/phase3/owner_site_order.json", "utf8"));
} catch {
  console.log("owner_site_order.json not found — skipping ownerSiteRank join.");
}

// Build lookup: internalCategorySlug → Map<normalizedTitle, rank>
const ownerRankByCategory = new Map();
if (ownerOrder?.liveCategories && ownerOrder?.internalToLive) {
  for (const [internalSlug, liveKey] of Object.entries(ownerOrder.internalToLive)) {
    const titles = ownerOrder.liveCategories[liveKey] ?? [];
    const map = new Map();
    titles.forEach((t, i) => {
      const k = normalizeTitle(t);
      if (k && !map.has(k)) map.set(k, i);
    });
    ownerRankByCategory.set(internalSlug, map);
  }
}

const reviewByUrl = new Map(reviewRows.map(r => [r.url, r.issue_type ?? ""]));
const imagesByPid = new Map();
for (const im of imageRows) {
  if (!im.scraped_product_id || !im.image_url) continue;
  const a = imagesByPid.get(im.scraped_product_id) ?? [];
  a.push({ url: im.image_url, position: num(im.position, 0), isHero: bool(im.is_hero), inferredFilename: nullable(im.inferred_filename), altText: nullable(im.alt_text) });
  imagesByPid.set(im.scraped_product_id, a);
}
for (const list of imagesByPid.values()) list.sort((a, b) => Number(b.isHero) - Number(a.isHero) || a.position - b.position);

const products = productRows.map((p, idx) => {
  const id = p.id, url = p.url, categorySlug = p.category_slug ?? "";
  const title = nullable(p.product_title_normalized) ?? nullable(p.product_title_original) ?? nullable(p.title) ?? "(untitled)";
  const images = imagesByPid.get(id) ?? [];
  const primaryImage = images.find(i => i.isHero) ?? images.find(i => i.position === 0) ?? images[0] ?? null;
  const confidence = num(p.final_confidence, 0);
  const reviewIssue = reviewByUrl.get(url) ?? "";
  const isKnown404 = url === KNOWN_404 || reviewIssue === "source_404";
  const publicReady = !!primaryImage && !isKnown404 && !!nullable(p.product_title_normalized ?? p.product_title_original) && confidence >= 0.7;
  // Owner-site rank: lookup by normalized title within the product's
  // categorySlug. Null for unmatched items — they tail by keyword rank in
  // the runtime sorter.
  const rankMap = ownerRankByCategory.get(categorySlug);
  const ownerSiteRank = rankMap?.get(normalizeTitle(title)) ?? null;
  return {
    id, sourceUrl: url, slug: p.product_slug ?? id, categorySlug,
    displayCategory: CATEGORY_DISPLAY_MAP[categorySlug] ?? categorySlug,
    title, description: nullable(p.description), dimensions: nullable(p.dimensions),
    stockedQuantity: nullable(p.stocked_quantity), isCustomOrder: bool(p.is_custom_order_co),
    confidence, needsManualReview: bool(p.needs_manual_review), images, primaryImage,
    imageCount: images.length, publicReady, scrapedOrder: idx, subcategory: detectSub(categorySlug, title),
    ownerSiteRank,
  };
});

const publicProducts = products.filter(p => p.publicReady);
const counts = new Map();
for (const p of publicProducts) {
  const e = counts.get(p.categorySlug) ?? { display: p.displayCategory, count: 0 };
  e.count++; counts.set(p.categorySlug, e);
}
const orderIdx = new Map(CATEGORY_DISPLAY_ORDER.map((d, i) => [d, i]));
const facets = [...counts.entries()]
  .map(([slug, v]) => ({ slug, display: v.display, count: v.count }))
  .sort((a, b) => (orderIdx.get(a.display) ?? 999) - (orderIdx.get(b.display) ?? 999) || a.display.localeCompare(b.display));

const out = {
  products: publicProducts, facets, total: publicProducts.length,
  meta: {
    generatedAt: new Date().toISOString(),
    totalRecords: products.length,
    publicReadyCount: publicProducts.length,
    excludedCount: products.length - publicProducts.length,
    categoryDisplayOrder: CATEGORY_DISPLAY_ORDER,
  },
};
writeFileSync("src/data/phase3/phase3_catalog.json", JSON.stringify(out));
console.log(`Wrote ${publicProducts.length} public-ready / ${products.length} total. ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);

// Owner-site match report (public-ready products only).
if (ownerRankByCategory.size > 0) {
  console.log("\nOwner-site rank coverage (public-ready):");
  const byCat = new Map();
  for (const p of publicProducts) {
    const e = byCat.get(p.categorySlug) ?? { total: 0, matched: 0, unmatched: [] };
    e.total++;
    if (p.ownerSiteRank != null) e.matched++;
    else e.unmatched.push(p.title);
    byCat.set(p.categorySlug, e);
  }
  for (const [slug, e] of [...byCat.entries()].sort()) {
    const pct = e.total ? Math.round((e.matched / e.total) * 100) : 0;
    console.log(`  ${slug.padEnd(22)} ${String(e.matched).padStart(3)}/${String(e.total).padEnd(3)}  ${pct}%`);
    if (e.unmatched.length && e.unmatched.length <= 8) {
      for (const t of e.unmatched) console.log(`      · ${t}`);
    } else if (e.unmatched.length) {
      for (const t of e.unmatched.slice(0, 5)) console.log(`      · ${t}`);
      console.log(`      · …and ${e.unmatched.length - 5} more`);
    }
  }
}
