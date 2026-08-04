// Re-measure the width distribution that drives WIDTH_BENCHMARKS in
// src/components/collection/productPhysicalScale.ts.
//
//   node scripts/audit/width-percentiles.mjs
//
// Read-only. Run after every catalog re-import; if p90 or the median moved
// materially, update the benchmark table by hand.

import { readFileSync } from 'fs';

const catalog = JSON.parse(
  readFileSync(new URL('../../src/data/inventory/current_catalog.json', import.meta.url)),
);

const FEET = [
  /(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*w\b/i,
  /(\d+(?:\.\d+)?)\s*(?:'|’|ft\b)\s*[x×]/i,
];
const PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(?:"|”|in\b|inches)?\s*w\b/i,
  /\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i,
  /(\d+(?:\.\d+)?)\s*(?:"|”|in\b)?\s*[x×]\s*\d+(?:\.\d+)?/i,
];
const parseWidth = (d) => {
  if (!d) return null;
  const sane = (n) => (n > 360 ? null : n);
  for (const p of FEET) { const m = d.match(p); if (m) return sane(Number(m[1]) * 12); }
  for (const p of PATTERNS) { const m = d.match(p); if (m) return sane(Number(m[1])); }
  return null;
};

const CATEGORIES = ['seating', 'tables', 'bars', 'storage', 'large-decor'];

console.log('\nwidth percentiles (inches) — source: current_catalog.json');
console.log(`generated: ${catalog.meta?.generatedAt ?? 'unknown'}\n`);

for (const cat of CATEGORIES) {
  const rows = catalog.products.filter((p) => p.categorySlug === cat);
  const widths = rows.map((p) => parseWidth(p.dimensions)).filter(Boolean).sort((a, b) => a - b);
  const missing = rows.length - widths.length;
  const q = (f) => widths[Math.min(widths.length - 1, Math.floor(f * widths.length))];
  console.log(
    `${cat.padEnd(13)} n=${String(rows.length).padStart(3)}  no-dims=${String(missing).padStart(3)}` +
    `  p10=${q(0.1)}  p50=${q(0.5)} (typical)  p90=${q(0.9)} (reference)  max=${widths.at(-1)}`,
  );
}
console.log('\nreference := p90 (category). Update WIDTH_BENCHMARKS if these drift.\n');

// Subcategory medians drive SUBCATEGORY_TYPICAL — the fallback for items with
// no parseable width. Category medians are too blunt (side tables vs dining).
const bySub = {};
for (const p of catalog.products) {
  if (!CATEGORIES.includes(p.categorySlug)) continue;
  const w = parseWidth(p.dimensions);
  if (!w) continue;
  const sub = p.liveSubcategories?.[0]?.trim().toLowerCase() ?? '(none)';
  (bySub[sub] ??= []).push(w);
}
console.log('subcategory medians — SUBCATEGORY_TYPICAL:\n');
for (const k of Object.keys(bySub).sort()) {
  const a = bySub[k].sort((x, y) => x - y);
  console.log(`  ${k.padEnd(22)} n=${String(a.length).padStart(3)}  median=${a[Math.floor(a.length / 2)]}`);
}
console.log('');
