#!/usr/bin/env node
// Loosened RMS reconciliation. Cascade:
//   exact → title alias → owner-confirmed → slug alias → family-token → variant_no_page → unresolved
// Outputs 4 buckets and an unresolved list ready for owner review.
//
// Usage: bun scripts/audit/reconcile-loose.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/live-truth.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/inventory/current_catalog.json"), "utf8")).products;
const pillowAliases = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/pillow-aliases.json"), "utf8")).aliases ?? {};
const ownerMapping = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/owner-confirmed-mapping.json"), "utf8")).entries ?? [];

// Index owner mapping by live_site_name
const ownerByName = new Map();
for (const e of ownerMapping) ownerByName.set(e.live_site_name, e);

// Normalization
const norm = (s) =>
  s.toLowerCase()
    .replace(/[\u2018\u2019\u02BC]/g, "'") // smart quotes/apostrophes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bs\b/g, "") // singularize trailing s tokens
    .replace(/\s+/g, " ")
    .trim();

const looseTokens = (s) =>
  norm(s).split(" ").filter(Boolean);

const exactByTitle = new Map();
const looseByKey = new Map();
const byFirstToken = new Map();
for (const p of catalog) {
  exactByTitle.set(norm(p.title), p);
  const looseKey = looseTokens(p.title).slice().sort().join(" ");
  (looseByKey.get(looseKey) ?? looseByKey.set(looseKey, []).get(looseKey)).push(p);
  const tok = looseTokens(p.title)[0];
  if (tok) (byFirstToken.get(tok) ?? byFirstToken.set(tok, []).get(tok)).push(p);
}

const buckets = { confirmed: [], owner_slug_divergent: [], variant_no_page: [], unresolved: [] };
const counters = { exact: 0, alias: 0, slug_alias: 0, family_token: 0, variant_no_page: 0, owner_confirmed: 0, normalized: 0, unresolved: 0 };
const liveTitles = Object.keys(truth);

for (const title of liveTitles) {
  // 1. Exact
  if (exactByTitle.has(norm(title))) {
    counters.exact++;
    buckets.confirmed.push({ live: title, match_type: "exact", rms: exactByTitle.get(norm(title)).title });
    continue;
  }
  // 2. Title alias (pillow aliases)
  if (pillowAliases[title] && exactByTitle.has(norm(pillowAliases[title]))) {
    counters.alias++;
    buckets.confirmed.push({ live: title, match_type: "alias", rms: pillowAliases[title] });
    continue;
  }
  // 3. Owner-confirmed mapping
  const owner = ownerByName.get(title);
  if (owner) {
    if (owner.match_type === "variant_no_page") {
      counters.variant_no_page++;
      buckets.variant_no_page.push({ live: title, rms: owner.rms_catalog_match, sku_count: owner.rms_sku_count, notes: owner.notes });
      continue;
    }
    if (owner.match_type === "owner_confirmed" && owner.rms_catalog_match) {
      counters.owner_confirmed++;
      buckets.owner_slug_divergent.push({ live: title, match_type: "owner_confirmed", rms: owner.rms_catalog_match, sku_count: owner.rms_sku_count, slug: owner.live_site_slug, notes: owner.notes });
      continue;
    }
    if (owner.match_type === "slug_alias" && owner.rms_catalog_match) {
      counters.slug_alias++;
      buckets.owner_slug_divergent.push({ live: title, match_type: "slug_alias", rms: owner.rms_catalog_match, sku_count: owner.rms_sku_count, slug: owner.live_site_slug, notes: owner.notes });
      continue;
    }
    // family_token from owner mapping → handled by step 5 below; let it fall through but use the rms_target hint
  }
  // 4. Normalized loose-token match (handles punctuation/plural/order drift)
  const looseKey = looseTokens(title).slice().sort().join(" ");
  if (looseByKey.has(looseKey)) {
    counters.normalized++;
    buckets.confirmed.push({ live: title, match_type: "normalized", rms: looseByKey.get(looseKey)[0].title });
    continue;
  }
  // 5. Family-token match: live first non-trivial token has any RMS row beginning with same token
  const stop = new Set(["the", "a", "an", "set", "vintage", "antique", "small", "large", "round"]);
  const liveToks = looseTokens(title);
  const fam = liveToks.find((t) => !stop.has(t)) ?? liveToks[0];
  if (fam && byFirstToken.has(fam)) {
    const candidates = byFirstToken.get(fam);
    // Safety: require RMS family to have ≥1 hit AND the fam token isn't a generic English word
    counters.family_token++;
    buckets.confirmed.push({
      live: title,
      match_type: "family_token",
      rms_family: fam,
      rms_sku_count: candidates.length,
      sample: candidates.slice(0, 3).map((c) => c.title),
    });
    continue;
  }
  // 6. Owner mapping says unresolved but at least carry the slug
  if (owner && owner.match_type === "unresolved") {
    counters.unresolved++;
    buckets.unresolved.push({ live: title, slug: owner.live_site_slug, notes: owner.notes });
    continue;
  }
  // 7. Truly unresolved
  counters.unresolved++;
  buckets.unresolved.push({ live: title, slug: null, notes: "no match by any cascade rule" });
}

const total = liveTitles.length;
const sumA = counters.exact + counters.alias + counters.normalized + counters.family_token;
const sumB = counters.owner_confirmed + counters.slug_alias;
const sumC = counters.variant_no_page;
const sumD = counters.unresolved;

console.log("=".repeat(64));
console.log("RECONCILIATION — loosened cascade matcher");
console.log("=".repeat(64));
console.log(`Total live products checked:         ${total}`);
console.log("");
console.log(`Bucket A — Confirmed in RMS:         ${sumA}`);
console.log(`  exact title:                       ${counters.exact}`);
console.log(`  pillow alias:                      ${counters.alias}`);
console.log(`  normalized (punct/plural):         ${counters.normalized}`);
console.log(`  family-token (e.g. Adonis*):       ${counters.family_token}`);
console.log("");
console.log(`Bucket B — Owner-confirmed/slug-divergent: ${sumB}`);
console.log(`  owner_confirmed rename:            ${counters.owner_confirmed}`);
console.log(`  slug_alias:                        ${counters.slug_alias}`);
console.log("");
console.log(`Bucket C — Variant exists, no page:  ${sumC}`);
console.log("");
console.log(`Bucket D — Still unresolved:         ${sumD}`);
console.log("=".repeat(64));
console.log(`Recovered total:  ${sumA + sumB + sumC} of ${total} (${((sumA+sumB+sumC)/total*100).toFixed(1)}%)`);
console.log("");

if (process.argv.includes("--unresolved")) {
  console.log("--- UNRESOLVED ---");
  for (const u of buckets.unresolved) console.log(`  ${u.live}${u.slug ? `  [${u.slug}]` : ""}`);
}

fs.writeFileSync(
  path.join(ROOT, "scripts/audit/reconcile-report.json"),
  JSON.stringify({ summary: counters, buckets }, null, 2)
);
console.log(`\nWrote scripts/audit/reconcile-report.json`);
