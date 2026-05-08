import { getProductBrowseGroup, BROWSE_GROUP_LABELS } from '../src/lib/collection-taxonomy.ts';
import cat from '../src/data/inventory/current_catalog.json' with { type: 'json' };
const items = cat.products || cat;

const byCategory = {};
const byGroup = {};
const byCatSub = {};
const unclassified = [];

for (const p of items) {
  const c = p.category || p.categorySlug || '__none__';
  byCategory[c] = (byCategory[c] || 0) + 1;
  const g = getProductBrowseGroup(p);
  if (!g) {
    unclassified.push({ title: p.title || p.name, category: c });
  } else {
    byGroup[g] = (byGroup[g] || 0) + 1;
    const k = `${c} :: ${g}`;
    byCatSub[k] = (byCatSub[k] || 0) + 1;
  }
}

const lines = [];
lines.push('# Inventory Quantity Report');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Total products: ${items.length}`);
lines.push('');

lines.push('## By Source Category (RMS)');
for (const [k, v] of Object.entries(byCategory).sort((a,b)=>b[1]-a[1])) {
  lines.push(`- ${k}: ${v}`);
}
lines.push('');

lines.push('## By Site Browse Group (classifier)');
for (const [k, v] of Object.entries(byGroup).sort((a,b)=>b[1]-a[1])) {
  lines.push(`- ${k} (${BROWSE_GROUP_LABELS[k] || k}): ${v}`);
}
lines.push('');

lines.push('## Cross-tab: Source Category × Browse Group');
const sources = [...new Set(Object.keys(byCatSub).map(k => k.split(' :: ')[0]))].sort();
for (const src of sources) {
  lines.push(`### ${src}`);
  const rows = Object.entries(byCatSub).filter(([k]) => k.startsWith(src + ' :: '))
    .map(([k,v]) => [k.split(' :: ')[1], v])
    .sort((a,b)=>b[1]-a[1]);
  for (const [g, n] of rows) lines.push(`- ${g}: ${n}`);
  lines.push('');
}

lines.push(`## Unclassified (no browse group): ${unclassified.length}`);
for (const u of unclassified.slice(0, 200)) {
  lines.push(`- [${u.category}] ${u.title}`);
}

const out = lines.join('\n');
import { writeFileSync } from 'node:fs';
writeFileSync('/mnt/documents/inventory-category-report.md', out);
console.log(out.split('\n').slice(0, 60).join('\n'));
console.log('...');
console.log(`\nWrote /mnt/documents/inventory-category-report.md (${out.length} chars)`);
