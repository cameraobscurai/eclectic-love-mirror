#!/usr/bin/env node
// Title reconciliation — DRY RUN, no writes.
//
// Compares live Eclectic Hive titles (scripts/audit/live-truth.json, built
// from owner's scrape XLSX) against the baked RMS catalog
// (src/data/inventory/current_catalog.json) to find the actual mapping.
//
// Output: scripts/audit/title-reconciliation.json with three buckets:
//   - exact:      normalized title === normalized title (already covered)
//   - confident:  fuzzy score >= 0.88 OR token-set match (safe to auto-apply)
//   - ambiguous:  best score 0.70-0.88 (owner reviews)
//   - missing:    no candidate above 0.70 (likely not in RMS, or renamed)
//
// Usage:  bun scripts/audit/title-reconciliation.mjs
// No DB writes. No file mutation outside scripts/audit/.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/audit/live-truth.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/inventory/current_catalog.json"), "utf8"));

// ── normalization ────────────────────────────────────────────────────────────
const STOP = new Set(["the", "a", "an", "and", "&", "with", "of", "in", "by", "set"]);
const STRIP_WORDS = [
  // descriptors that often differ between live site and RMS naming
  "vintage", "antique", "rustic", "matte", "black", "white", "natural",
  "leather", "wood", "metal", "marble", "stone", "fabric", "velvet", "linen",
  "brass", "iron", "wool", "silk", "cotton",
];
const STRIP_SET = new Set(STRIP_WORDS);

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s'"]/g, " ")
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}
function normTitle(s) {
  return tokens(s).join(" ");
}
function coreTokens(s) {
  return tokens(s).filter((w) => !STRIP_SET.has(w) && !/^\d+("|in|inch|ft|cm)?$/.test(w));
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}
// Cheap edit-distance ratio for short strings (Sørensen-Dice on bigrams).
function dice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const A = grams(a), B = grams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) {
    total += n;
    if (B.has(g)) inter += Math.min(n, B.get(g));
  }
  for (const n of B.values()) total += n;
  return (2 * inter) / total;
}

// ── index catalog ────────────────────────────────────────────────────────────
const catIndex = catalog.products.map((p) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  norm: normTitle(p.title),
  core: coreTokens(p.title),
  firstWord: tokens(p.title)[0] ?? "",
}));
const byNorm = new Map();
for (const c of catIndex) byNorm.set(c.norm, c);

// ── score live → catalog ─────────────────────────────────────────────────────
const exact = [];
const confident = [];
const ambiguous = [];
const missing = [];

for (const [liveTitle, info] of Object.entries(truth)) {
  const ln = normTitle(liveTitle);
  const lc = coreTokens(liveTitle);
  const lf = tokens(liveTitle)[0] ?? "";

  // Exact normalized hit
  const exactHit = byNorm.get(ln);
  if (exactHit) {
    exact.push({ liveTitle, rmsTitle: exactHit.title, rmsId: exactHit.id, slug: exactHit.slug });
    continue;
  }

  // Score every candidate. Cheap pre-filter: share at least one core token
  // OR same first word. Otherwise skip (keeps runtime O(n) practical).
  let best = null, second = null;
  for (const c of catIndex) {
    if (c.firstWord !== lf && !c.core.some((t) => lc.includes(t))) continue;
    const dn = dice(ln, c.norm);
    const jc = jaccard(lc, c.core);
    const score = 0.6 * dn + 0.4 * jc;
    if (!best || score > best.score) {
      second = best;
      best = { ...c, score, dice: dn, jaccard: jc };
    } else if (!second || score > second.score) {
      second = { ...c, score };
    }
  }

  if (!best || best.score < 0.50) {
    missing.push({ liveTitle, liveParent: info.parent, liveSub: info.subcategory, bestScore: best?.score ?? 0, bestGuess: best?.title ?? null });
  } else if (best.score >= 0.78 || (best.jaccard >= 0.7 && best.dice >= 0.6)) {
    confident.push({
      liveTitle,
      rmsTitle: best.title,
      rmsId: best.id,
      slug: best.slug,
      score: +best.score.toFixed(3),
      margin: second ? +(best.score - second.score).toFixed(3) : 1,
    });
  } else {
    ambiguous.push({
      liveTitle,
      liveParent: info.parent,
      candidates: [best, second].filter(Boolean).map((c) => ({
        rmsTitle: c.title,
        rmsId: c.id,
        slug: c.slug,
        score: +c.score.toFixed(3),
      })),
    });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: {
    liveTruth: "scripts/audit/live-truth.json",
    catalog: "src/data/inventory/current_catalog.json",
  },
  summary: {
    liveTotal: Object.keys(truth).length,
    catalogTotal: catalog.products.length,
    exact: exact.length,
    confident: confident.length,
    ambiguous: ambiguous.length,
    missing: missing.length,
  },
  exact,
  confident,
  ambiguous,
  missing,
};

fs.writeFileSync(
  path.join(ROOT, "scripts/audit/title-reconciliation.json"),
  JSON.stringify(out, null, 2),
);

console.log("\nTitle reconciliation — DRY RUN");
console.log("──────────────────────────────");
console.log(`Live products:    ${out.summary.liveTotal}`);
console.log(`Catalog products: ${out.summary.catalogTotal}`);
console.log(`  exact match:    ${out.summary.exact}`);
console.log(`  confident:      ${out.summary.confident}  (auto-apply candidates)`);
console.log(`  ambiguous:      ${out.summary.ambiguous}  (owner review)`);
console.log(`  missing:        ${out.summary.missing}  (likely renamed or absent from RMS)`);
console.log(`\nManifest written to scripts/audit/title-reconciliation.json`);
console.log("No catalog or DB writes performed.");

// Print a few samples per bucket for at-a-glance sanity.
const sample = (arr, n = 5) => arr.slice(0, n);
console.log("\n— Confident samples —");
for (const c of sample(confident)) console.log(`  ${c.score}  "${c.liveTitle}"  →  "${c.rmsTitle}"`);
console.log("\n— Ambiguous samples —");
for (const a of sample(ambiguous)) {
  console.log(`  "${a.liveTitle}"`);
  for (const cand of a.candidates) console.log(`    ${cand.score}  ${cand.rmsTitle}`);
}
console.log("\n— Missing samples —");
for (const m of sample(missing, 10)) console.log(`  ${m.bestScore.toFixed(2)}  "${m.liveTitle}"  best: ${m.bestGuess ?? "—"}`);
