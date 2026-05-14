import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { productParent, productMatchesSub } from '../src/lib/collection-parents.ts';
import aliases from './title-aliases.json' with { type: 'json' };

const cat = await getCollectionCatalog();
const products = cat.products;

// Build subcategory list per parent dynamically by scanning all products
const subsByParent = {};
for (const p of products) {
  const parent = productParent(p);
  if (!parent) continue;
  // Probe known subs by trying classify via an internal heuristic — instead,
  // just collect the result of productMatchesSub against any sub seen.
}
// Simpler: just check if each product has ANY sub by scanning a known list per parent
const PARENT_SUBS = {
  'lounge-seating': ['sofas-loveseats','chairs','benches','ottomans'],
  'lounge-tables': ['coffee-tables','side-tables','consoles'],
  'cocktail-bar': ['cocktail-tables','bars','stools','community-tables','storage'],
  'dining': ['dining-chairs','dining-tables','consoles'],
  'tableware': ['serveware','glassware','flatware','dinnerware'],
  'lighting': ['chandeliers','lamps','candlelight','specialty'],
  'textiles': ['pillows','throws'],
  'rugs': ['rugs'],
  'styling': ['accents','crates-baskets'],
  'large-decor': ['walls','structures','other'],
  'furs-pelts': [],
};

function findSub(p) {
  const parent = productParent(p);
  if (!parent) return { parent: null, sub: null };
  for (const s of (PARENT_SUBS[parent] || [])) {
    if (productMatchesSub(p, parent, s)) return { parent, sub: s };
  }
  return { parent, sub: null };
}

// AUDIT 1: All catalog products — those with parent but no sub (invisible under sub filter)
let invisibleCount = 0;
const invisibleByParent = {};
for (const p of products) {
  const { parent, sub } = findSub(p);
  if (parent && !sub && (PARENT_SUBS[parent]||[]).length > 0) {
    invisibleCount++;
    invisibleByParent[parent] = (invisibleByParent[parent]||0)+1;
  }
}
console.log('=== INVISIBLE UNDER SUB FILTER (only show in "All") ===');
console.log('total:', invisibleCount, '/', products.length);
console.log(JSON.stringify(invisibleByParent, null, 2));

// AUDIT 2: Merged groups specifically
const groups = aliases.groups || [];
console.log('\n=== MERGED GROUPS AUDIT ===');
const merged_issues = [];
for (const g of groups) {
  const live = g.live.toLowerCase().trim();
  const merged = products.find(p => p.title?.toLowerCase().trim() === live);
  if (!merged) {
    merged_issues.push({ live: g.live, problem: 'NOT FOUND' });
    continue;
  }
  const { parent, sub } = findSub(merged);
  if (!parent) {
    merged_issues.push({ live: g.live, problem: 'no parent' });
  } else if (!sub && (PARENT_SUBS[parent]||[]).length > 0) {
    merged_issues.push({ live: g.live, title: merged.title, parent, problem: 'no sub — only "All"' });
  }
}
console.log('issues:', merged_issues.length, '/', groups.length);
for (const i of merged_issues) console.log(' -', JSON.stringify(i));
