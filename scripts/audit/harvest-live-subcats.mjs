// Harvest liveSlug -> {category, subcategories[]} from the live Squarespace JSON feeds.
// Uses each item's `categories` array (the Squarespace tag filter behind ?category=).
// Output: scripts/audit/live-subcategory-map.json
import { writeFileSync } from 'node:fs';

const CATS = [
  'lounge','lounge-tables','cocktail-bar','dining','tableware',
  'textiles','rugs','styling','large-decor','light',
];

const out = { byLiveSlug: {}, byCategory: {} };
for (const cat of CATS) {
  const url = `https://www.eclectichive.com/${cat}?format=json-pretty`;
  const r = await fetch(url, { headers: { 'user-agent': 'eh-audit/1.0' } });
  if (!r.ok) { console.error('FAIL', cat, r.status); continue; }
  const d = await r.json();
  const items = d.items || [];
  out.byCategory[cat] = {};
  for (const it of items) {
    const slug = it.urlId;
    const subs = Array.isArray(it.categories) ? it.categories : [];
    out.byLiveSlug[slug] = {
      title: it.title,
      category: cat,
      subcategories: subs,
      fullUrl: it.fullUrl,
    };
    for (const s of subs) {
      out.byCategory[cat][s] = (out.byCategory[cat][s] || 0) + 1;
    }
  }
  console.log(`[${cat}] ${items.length} items, subcats:`, Object.keys(out.byCategory[cat]).join(' · '));
}
writeFileSync('scripts/audit/live-subcategory-map.json', JSON.stringify(out, null, 2));
console.log('total liveSlugs:', Object.keys(out.byLiveSlug).length);
