#!/usr/bin/env node
// Dump a parent's products grouped by subcategory for editorial ranking.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const parent = process.argv[2];
if (!parent) { console.error('usage: dump-slice.mjs <parent>'); process.exit(1); }

const catalog = JSON.parse(readFileSync(resolve(root, 'src/data/inventory/current_catalog.json'), 'utf8'));

// Inline minimal port of productParent + classifySub for cocktail-bar.
function parentOf(p) {
  if (p.categorySlug === 'storage') return 'cocktail-bar';
  if ((p.title||'').toLowerCase().includes('console')) return 'lounge-tables';
  const liveMap = { lounge:'lounge-seating','lounge-tables':'lounge-tables','cocktail-bar':'cocktail-bar', dining:'dining', tableware:'tableware', textiles:'textiles', rugs:'rugs', styling:'styling','large-decor':'large-decor', light:'lighting', lighting:'lighting' };
  if (p.liveCategory && liveMap[p.liveCategory]) return liveMap[p.liveCategory];
  // fallback by categorySlug
  if (p.categorySlug === 'bars') return 'cocktail-bar';
  return null;
}
const has = (t,kws)=>kws.some(k=>t.includes(k));
function classifySub(parent, p) {
  const t = (p.title||'').toLowerCase();
  const cat = (p.categorySlug||'').toLowerCase();
  const liveSubs = (p.liveSubcategories||[]).map(s=>s.toLowerCase());
  const SUBS = { 'cocktail-bar': [['bars','Bars'],['cocktail-tables','Cocktail Tables'],['community-tables','Community Tables'],['stools','Stools'],['storage','Storage']] };
  if (liveSubs.length) {
    for (const ls of liveSubs) {
      const hit = (SUBS[parent]||[]).find(([id,label])=>label.toLowerCase()===ls);
      if (hit) return hit[0];
    }
  }
  if (parent==='cocktail-bar') {
    if (has(t,['cocktail table'])) return 'cocktail-tables';
    if (has(t,['barstool','stool'])) return 'stools';
    if (has(t,['community table','long table'])) return 'community-tables';
    if (cat==='storage' || has(t,['cabinet','credenza','sideboard'])) return 'storage';
    if (cat==='bars' || has(t,['back bar','backbar','bar cart','bar'])) return 'bars';
  }
  return null;
}

const slice = {};
let total = 0;
for (const p of catalog.products) {
  if (parentOf(p) !== parent) continue;
  const sub = classifySub(parent, p) || '_unclassified';
  (slice[sub] ||= []).push({
    rms_id: p.id,
    slug: p.slug,
    title: p.title,
    image: p.primaryImage,
    dimensions: p.dimensions || null,
    scrapedOrder: p.scrapedOrder,
    liveSubcategories: p.liveSubcategories || [],
  });
  total++;
}

mkdirSync(resolve(root, 'scripts-tmp/order'), { recursive: true });
const out = resolve(root, `scripts-tmp/order/${parent}.slice.json`);
writeFileSync(out, JSON.stringify(slice, null, 2));
console.log(`wrote ${out}`);
console.log(`total: ${total}`);
for (const [k,v] of Object.entries(slice)) console.log(`  ${k}: ${v.length}`);
