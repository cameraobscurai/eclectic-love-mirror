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

const PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(?:"|”|in\b|inches)?\s*w\b/i,
  /\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i,
  /(\d+(?:\.\d+)?)\s*(?:"|”|in\b)?\s*[x×]\s*\d+(?:\.\d+)?/i,
];
const parseWidth = (d) => {
  if (!d) return null;
  for (const p of PATTERNS) { const m = d.match(p); if (m) return Number(m[1]); }
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
console.log('\nreference := p90, typical := p50. Update productPhysicalScale.ts if these drift.\n');
