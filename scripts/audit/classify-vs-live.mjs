#!/usr/bin/env node
// Audit: compare classifier (productParent + classifySub) against the live
// Eclectic Hive truth table built from the owner's scraped XLSX.
//
//   node scripts/audit/classify-vs-live.mjs           # full report
//   node scripts/audit/classify-vs-live.mjs --misses  # mismatches only
//
// Exits non-zero if accuracy drops below thresholds (parent < 95%, sub < 85%).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/live-truth.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/inventory/current_catalog.json"), "utf8"));

// Tiny shim: import the TS modules via tsx if available, otherwise via bun.
// We expect this to be run with `bun scripts/audit/classify-vs-live.mjs`.
const { productParent, classifySub: _internalClassifySub } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/collection-parents.ts")).href
);

// classifySub isn't exported; re-implement via productMatchesSub probing.
const { productMatchesSub } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/collection-parents.ts")).href
);

const SUBS_BY_PARENT = {
  "lounge-seating": ["benches", "chairs", "ottomans", "sofas-loveseats"],
  "lounge-tables": ["coffee-tables", "consoles", "side-tables"],
  "cocktail-bar": ["bars", "cocktail-tables", "community-tables", "stools", "storage"],
  dining: ["consoles", "dining-chairs", "dining-tables"],
  tableware: ["dinnerware", "flatware", "glassware", "serveware"],
  lighting: ["candlelight", "chandeliers", "lamps", "specialty"],
  textiles: ["pillows", "throws"],
  rugs: ["rugs"],
  styling: ["accents", "crates-baskets", "games"],
  "large-decor": ["structures", "walls", "other"],
};

const SUB_LABEL_TO_ID = {
  // sub label (from XLSX) -> internal sub id
  "Sofas & Loveseats": "sofas-loveseats",
  "Chairs": "chairs",
  "Ottomans": "ottomans",
  "Benches": "benches",
  "Coffee Tables": "coffee-tables",
  "Side Tables": "side-tables",
  "Consoles": "consoles",
  "Bars": "bars",
  "Cocktail Tables": "cocktail-tables",
  "Community Tables": "community-tables",
  "Stools": "stools",
  "Storage": "storage",
  "Dining Chairs": "dining-chairs",
  "Dining Tables": "dining-tables",
  "Dinnerware": "dinnerware",
  "Flatware": "flatware",
  "Glassware": "glassware",
  "Serveware": "serveware",
  "Candlelight": "candlelight",
  "Chandeliers": "chandeliers",
  "Lamps": "lamps",
  "Specialty": "specialty",
  "Pillows": "pillows",
  "Throws": "throws",
  "Rugs": "rugs",
  "Accents": "accents",
  "Crates & Baskets": "crates-baskets",
  "Games": "games",
  "Structures": "structures",
  "Walls": "walls",
  "Other": "other",
};

const onlyMisses = process.argv.includes("--misses");

// Build a lookup of catalog products by normalized title.
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
const byTitle = new Map();
for (const p of catalog.products) byTitle.set(norm(p.title), p);

let parentTotal = 0,
  parentOk = 0,
  subTotal = 0,
  subOk = 0;
const parentMisses = [];
const subMisses = [];
const notFound = [];

for (const [title, info] of Object.entries(truth)) {
  const p = byTitle.get(norm(title));
  if (!p) {
    notFound.push(title);
    continue;
  }
  parentTotal++;
  const ourParent = productParent(p);
  if (ourParent === info.parent) parentOk++;
  else parentMisses.push({ title, live: info.parent, ours: ourParent });

  const expectedSubId = SUB_LABEL_TO_ID[info.subcategory];
  if (!expectedSubId) continue;
  subTotal++;
  // Probe: which sub does our classifier put it in (within ITS parent)?
  let ourSub = null;
  if (ourParent) {
    for (const s of SUBS_BY_PARENT[ourParent] ?? []) {
      if (productMatchesSub(p, ourParent, s)) {
        ourSub = s;
        break;
      }
    }
  }
  if (ourParent === info.parent && ourSub === expectedSubId) subOk++;
  else subMisses.push({ title, live: `${info.parent}/${expectedSubId}`, ours: `${ourParent}/${ourSub}` });
}

const pct = (n, d) => (d === 0 ? "n/a" : ((n / d) * 100).toFixed(1) + "%");

if (!onlyMisses) {
  console.log(`\nMatched ${parentTotal} of ${Object.keys(truth).length} live products to catalog (${notFound.length} not found).`);
  console.log(`Parent accuracy: ${parentOk}/${parentTotal} (${pct(parentOk, parentTotal)})`);
  console.log(`Sub accuracy:    ${subOk}/${subTotal} (${pct(subOk, subTotal)})`);
}

if (parentMisses.length) {
  console.log(`\n--- PARENT MISSES (${parentMisses.length}) ---`);
  for (const m of parentMisses) console.log(`  ${m.live.padEnd(16)} → ours=${m.ours ?? "null"}    ${m.title}`);
}
if (subMisses.length) {
  console.log(`\n--- SUB MISSES (${subMisses.length}) ---`);
  for (const m of subMisses) console.log(`  ${m.live.padEnd(36)} → ours=${m.ours ?? "null"}    ${m.title}`);
}
if (notFound.length && !onlyMisses) {
  console.log(`\n--- NOT FOUND IN CATALOG (${notFound.length}) ---`);
  for (const t of notFound.slice(0, 30)) console.log(`  ${t}`);
  if (notFound.length > 30) console.log(`  ... +${notFound.length - 30} more`);
}

const parentAcc = parentOk / parentTotal;
const subAcc = subOk / subTotal;
if (parentAcc < 0.95 || subAcc < 0.85) {
  console.error(`\nFAIL: parent ${pct(parentOk, parentTotal)} (need ≥95%), sub ${pct(subOk, subTotal)} (need ≥85%)`);
  process.exit(1);
}
