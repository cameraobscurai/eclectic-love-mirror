#!/usr/bin/env bun
/**
 * Taxonomy Audit & Snapshot Test
 * ──────────────────────────────
 * Run: `bun scripts/audit-taxonomy.mjs`
 *
 * Two responsibilities (Phase A2 + A3 of the AAA filtering plan):
 *
 *   1. SNAPSHOT TEST — locks the current classification of every product in
 *      the catalog. Compares against `src/data/phase3/taxonomy_snapshot.json`.
 *      Exits non-zero if any product moved groups.
 *
 *   2. AUDIT REPORT — writes
 *      `src/data/phase3/phase3_classification_report.json` with:
 *        - Per-group counts
 *        - Low-margin classifications (close calls — owner-actionable)
 *        - Full per-product trace (used by future admin audit view)
 *      Also prints a human summary to stdout.
 *
 * To intentionally update the snapshot after a deliberate rule change:
 *   `bun scripts/audit-taxonomy.mjs --update`
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CATALOG_PATH = resolve(ROOT, "src/data/phase3/phase3_catalog.json");
const SNAPSHOT_PATH = resolve(ROOT, "src/data/phase3/taxonomy_snapshot.json");
const REPORT_PATH = resolve(ROOT, "src/data/phase3/phase3_classification_report.json");

const UPDATE = process.argv.includes("--update");
const LOW_MARGIN_THRESHOLD = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const { classify, BROWSE_GROUP_ORDER, BROWSE_GROUP_LABELS } = await import(
  resolve(ROOT, "src/lib/collection-taxonomy.ts")
);

// ─────────────────────────────────────────────────────────────────────────────
// Classify
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, { id: string; group: string; margin: number; candidates: any[] }>} */
const byId = {};
const counts = new Map();
const lowMargin = [];
const noRuleFired = [];

for (const p of catalog.products) {
  const r = classify(p);
  byId[p.id] = {
    id: p.id,
    title: p.title,
    categorySlug: p.categorySlug,
    group: r.group,
    margin: r.trace.margin,
    candidates: r.trace.candidates,
  };
  counts.set(r.group, (counts.get(r.group) ?? 0) + 1);
  if (r.trace.candidates.length === 0) noRuleFired.push(byId[p.id]);
  else if (r.trace.margin > 0 && r.trace.margin < LOW_MARGIN_THRESHOLD) {
    lowMargin.push(byId[p.id]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot diff
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ id: string; from: string; to: string; title: string }[]} */
const movedProducts = [];
let snapshotExists = existsSync(SNAPSHOT_PATH);
let snapshot = snapshotExists
  ? JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"))
  : null;

if (snapshot) {
  for (const id of Object.keys(byId)) {
    const prev = snapshot.assignments?.[id];
    const next = byId[id].group;
    if (prev && prev !== next) {
      movedProducts.push({
        id,
        from: prev,
        to: next,
        title: byId[id].title,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write report
// ─────────────────────────────────────────────────────────────────────────────

const report = {
  generatedAt: new Date().toISOString(),
  totalProducts: catalog.products.length,
  perGroupCounts: Object.fromEntries(
    BROWSE_GROUP_ORDER.map((id) => [id, counts.get(id) ?? 0]).filter(
      ([, n]) => n > 0,
    ),
  ),
  noRuleFiredCount: noRuleFired.length,
  noRuleFired: noRuleFired.map((p) => ({
    id: p.id,
    title: p.title,
    categorySlug: p.categorySlug,
    fallbackGroup: p.group,
  })),
  lowMarginCount: lowMargin.length,
  lowMarginThreshold: LOW_MARGIN_THRESHOLD,
  lowMargin: lowMargin
    .sort((a, b) => a.margin - b.margin)
    .map((p) => ({
      id: p.id,
      title: p.title,
      categorySlug: p.categorySlug,
      winner: p.group,
      margin: p.margin,
      candidates: p.candidates,
    })),
  movedSinceSnapshot: movedProducts,
};

writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot write / verify
// ─────────────────────────────────────────────────────────────────────────────

if (!snapshotExists || UPDATE) {
  const newSnapshot = {
    generatedAt: new Date().toISOString(),
    totalProducts: catalog.products.length,
    assignments: Object.fromEntries(
      Object.entries(byId).map(([id, v]) => [id, v.group]),
    ),
  };
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2));
  console.log(
    `\n📸 Snapshot ${snapshotExists ? "UPDATED" : "WRITTEN"} → ${SNAPSHOT_PATH}\n`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Console summary
// ─────────────────────────────────────────────────────────────────────────────

console.log("─── Per-group counts ───");
for (const id of BROWSE_GROUP_ORDER) {
  const n = counts.get(id) ?? 0;
  if (n > 0) console.log(`  ${BROWSE_GROUP_LABELS[id].padEnd(22)} ${n}`);
}
console.log(`  ${"─".repeat(28)}`);
console.log(`  ${"Total".padEnd(22)} ${catalog.products.length}`);

console.log("\n─── Health ───");
console.log(`  No rule fired (true fallbacks): ${noRuleFired.length}`);
console.log(`  Low-margin (<${LOW_MARGIN_THRESHOLD}):              ${lowMargin.length}`);

if (movedProducts.length > 0) {
  console.log(
    `\n⚠  ${movedProducts.length} product(s) moved groups since the last snapshot:`,
  );
  for (const m of movedProducts.slice(0, 25)) {
    console.log(`    ${m.from} → ${m.to}    ${m.title}`);
  }
  if (movedProducts.length > 25) {
    console.log(`    … and ${movedProducts.length - 25} more`);
  }
  if (UPDATE) {
    console.log(
      "\n   (snapshot was updated — these moves are now the new baseline)",
    );
    process.exit(0);
  }
  console.log(
    "\n   If these moves are intentional, re-run with --update to lock them in.",
  );
  process.exit(1);
}

console.log(`\n✓ No regressions. Report → ${REPORT_PATH}`);
