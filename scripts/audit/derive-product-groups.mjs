#!/usr/bin/env node
// Auto-derive product groups from RMS catalog rows.
//
// Hypothesis: the live Eclectic Hive site groups RMS rows that share a title
// prefix into a single product card (e.g. "Adonis Coupe Glass" + "Adonis Red
// Wine Glass" + "Adonis Highball" → one "Adonis Glassware" card). This script
// clusters catalog rows by shared first 1-2 tokens within the same category
// slug and shows what the public-facing card list would look like.
//
// DRY RUN. No writes. Output: scripts/audit/product-groups.json
//
//   bun scripts/audit/derive-product-groups.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/inventory/current_catalog.json"), "utf8"));
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/live-truth.json"), "utf8"));

// ── tokenization ─────────────────────────────────────────────────────────────
const STOP = new Set(["the", "a", "an", "and", "&", "with", "of", "in", "by", "set"]);
function tokens(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/'/g, "").split(/\s+/).filter(w => w && !STOP.has(w));
}
// Token is a "name root" if it's not a measurement, color, or material descriptor.
const DESCRIPTOR = new Set([
  "matte","black","white","natural","grey","gray","brown","blue","green","red","pink","cream","ivory","gold","silver","brass","copper","amber","smoke","clear","charcoal","sage","tan","beige","oatmeal","mulberry","sand","stone","walnut","oak","mango","ash","wicker","cane","linen","velvet","leather","wool","silk","cotton","fur","hide","wood","metal","marble","glass","alabaster","ceramic","porcelain","stoneware","jute","fabric","plush","tufted","carved","antique","vintage","rustic","french","quartz","speckle","pattern","yellow","botanical","textile","sculptural","cut","scallop","tambour","customizable","mini","large","small","oversize","round","square","tall","short","deep","wide","arm","armless",
]);
const MEASURE = /^\d+("|in|inch|inches|ft|cm|mm|x|w|d|h|'|°)?$/;
function isRoot(tok) {
  return !DESCRIPTOR.has(tok) && !MEASURE.test(tok);
}
function rootKey(title) {
  const ts = tokens(title);
  // Use the first 1 token as the cluster root (the unique product family name).
  // Most live cards are "<RootName> <Type>" or just "<RootName>".
  return ts[0] ?? "";
}

// ── group catalog by (categorySlug, rootKey) ─────────────────────────────────
const groups = new Map(); // key -> { root, slug, items: [] }
for (const p of catalog.products) {
  const root = rootKey(p.title);
  if (!root) continue;
  const key = `${p.categorySlug}::${root}`;
  if (!groups.has(key)) groups.set(key, { root, slug: p.categorySlug, items: [] });
  groups.get(key).items.push({ id: p.id, title: p.title, slug: p.slug });
}

// Singletons (1-item "groups") are just regular products, not interesting.
const multiGroups = [...groups.values()].filter(g => g.items.length >= 2);
const singletons = [...groups.values()].filter(g => g.items.length === 1);

// ── compare to live cards ────────────────────────────────────────────────────
// For each live card, find matching group by root token + see if the item
// count is plausible.
const liveByRoot = new Map();
for (const [title, info] of Object.entries(truth)) {
  const root = rootKey(title);
  if (!root) continue;
  if (!liveByRoot.has(root)) liveByRoot.set(root, []);
  liveByRoot.get(root).push({ title, ...info });
}

// Diagnostics: how many live cards' root token corresponds to a multi-row group?
let liveCoveredByMulti = 0;
let liveCoveredBySingle = 0;
let liveUnknown = 0;
const liveCardSizes = []; // [(liveTitle, derivedGroupSize)]
for (const [root, lives] of liveByRoot) {
  for (const l of lives) {
    const matches = [...groups.values()].filter(g => g.root === root);
    const totalRows = matches.reduce((n, g) => n + g.items.length, 0);
    if (totalRows >= 2) { liveCoveredByMulti++; liveCardSizes.push([l.title, totalRows]); }
    else if (totalRows === 1) liveCoveredBySingle++;
    else liveUnknown++;
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  catalogTotal: catalog.products.length,
  derivedGroups: {
    total: groups.size,
    multiItem: multiGroups.length,
    singletons: singletons.length,
    largestGroups: multiGroups.sort((a,b)=>b.items.length-a.items.length).slice(0, 25)
      .map(g => ({ root: g.root, slug: g.slug, count: g.items.length, sample: g.items.slice(0,3).map(i=>i.title) })),
  },
  liveCoverage: {
    liveTotal: Object.keys(truth).length,
    coveredByMultiGroup: liveCoveredByMulti,
    coveredBySingleProduct: liveCoveredBySingle,
    rootNotInCatalog: liveUnknown,
  },
  // Quick projection: catalog rows after collapsing multi-groups into one card each
  projectedPublicCards:
    singletons.length + multiGroups.length,
};

fs.writeFileSync(path.join(ROOT, "scripts/audit/product-groups.json"),
  JSON.stringify({ ...out, multiGroups, singletons: singletons.slice(0, 0) }, null, 2));

console.log("\nProduct grouping — DRY RUN");
console.log("──────────────────────────");
console.log(`Catalog rows:                  ${out.catalogTotal}`);
console.log(`Derived groups (root token):   ${out.derivedGroups.total}`);
console.log(`  multi-item groups:           ${out.derivedGroups.multiItem}`);
console.log(`  singletons (1-row groups):   ${out.derivedGroups.singletons}`);
console.log(`\nProjected public-facing cards: ${out.projectedPublicCards}`);
console.log(`Live site cards (truth):       ${out.liveCoverage.liveTotal}`);
console.log(`  → delta:                     ${out.projectedPublicCards - out.liveCoverage.liveTotal}`);

console.log(`\nLive coverage by derived group:`);
console.log(`  live root → multi-item RMS group: ${out.liveCoverage.coveredByMultiGroup}`);
console.log(`  live root → single RMS row:       ${out.liveCoverage.coveredBySingleProduct}`);
console.log(`  live root NOT in catalog:         ${out.liveCoverage.rootNotInCatalog}`);

console.log(`\nLargest derived groups (sample):`);
for (const g of out.derivedGroups.largestGroups.slice(0, 12)) {
  console.log(`  ${String(g.count).padStart(2)}× ${g.root.padEnd(14)} [${g.slug}]   e.g. ${g.sample.join(" | ")}`);
}

console.log(`\nManifest written to scripts/audit/product-groups.json`);
console.log("No catalog or DB writes performed.");
