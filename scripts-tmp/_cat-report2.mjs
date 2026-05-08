import { getProductBrowseGroup, BROWSE_GROUP_LABELS } from '../src/lib/collection-taxonomy.ts';
import cat from '../src/data/inventory/current_catalog.json' with { type: 'json' };
import { writeFileSync } from 'node:fs';
const items = cat.products || cat;

// Supabase truth (status=available, the public set), pasted from read_query.
const SUPA = {
  bars: 48, candlelight: 17, chandeliers: 14, 'furs-pelts': 6,
  'large-decor': 33, lighting: 28, 'pillows-throws': 165, rugs: 26,
  seating: 102, serveware: 52, storage: 10, styling: 84,
  subrentals: 7, tables: 75, tableware: 166,
};
const supaTotal = Object.values(SUPA).reduce((a,b)=>a+b,0);

// Baked catalog (what the live site actually shows)
const baked = {};
const bakedByGroup = {};
const bakedByCatGroup = {};
const unclassified = [];
for (const p of items) {
  const c = p.category || '__none__';
  baked[c] = (baked[c]||0)+1;
  const g = getProductBrowseGroup(p);
  if (!g) { unclassified.push(p); continue; }
  bakedByGroup[g] = (bakedByGroup[g]||0)+1;
  const k = `${c}::${g}`;
  bakedByCatGroup[k] = (bakedByCatGroup[k]||0)+1;
}
const bakedTotal = items.length;

const L = [];
L.push('# INVENTORY QUANTITY REPORT');
L.push(`Generated: ${new Date().toISOString()}`);
L.push('');
L.push(`- Supabase truth (status=available): **${supaTotal}** items`);
L.push(`- Live site catalog (current_catalog.json): **${bakedTotal}** items`);
L.push(`- **Gap: ${supaTotal - bakedTotal} items missing from the live site**`);
L.push('');

L.push('## Per-category: Supabase vs Live Site');
L.push('| Category | Supabase | Live site | Gap |');
L.push('|---|---:|---:|---:|');
const cats = [...new Set([...Object.keys(SUPA), ...Object.keys(baked)])].sort();
for (const c of cats) {
  const s = SUPA[c] ?? 0;
  const b = baked[c] ?? 0;
  const gap = s - b;
  const flag = gap > 0 ? ` ⚠️` : '';
  L.push(`| ${c} | ${s} | ${b} | ${gap}${flag} |`);
}
L.push('');

L.push('## Live site: per browse group (subcategory)');
L.push('| Browse group | Label | Count |');
L.push('|---|---|---:|');
for (const [g,n] of Object.entries(bakedByGroup).sort((a,b)=>b[1]-a[1])) {
  L.push(`| ${g} | ${BROWSE_GROUP_LABELS[g]||g} | ${n} |`);
}
L.push('');

L.push('## Live site: source category × browse group');
const sources = [...new Set(Object.keys(bakedByCatGroup).map(k => k.split('::')[0]))].sort();
for (const src of sources) {
  L.push(`### ${src} (live: ${baked[src]||0} / supabase: ${SUPA[src]||0})`);
  const rows = Object.entries(bakedByCatGroup)
    .filter(([k]) => k.startsWith(src+'::'))
    .map(([k,v])=>[k.split('::')[1],v])
    .sort((a,b)=>b[1]-a[1]);
  for (const [g,n] of rows) L.push(`- ${g}: ${n}`);
  L.push('');
}

L.push(`## Unclassified on live site: ${unclassified.length}`);
L.push('(items in catalog with no browse group — won\'t appear under any tile)');
for (const u of unclassified.slice(0,100)) L.push(`- [${u.category}] ${u.title}`);

writeFileSync('/mnt/documents/inventory-quantity-report.md', L.join('\n'));
console.log(L.slice(0,40).join('\n'));
console.log('...');
console.log(`\nWrote /mnt/documents/inventory-quantity-report.md`);
