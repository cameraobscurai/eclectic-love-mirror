import { getProductBrowseGroup } from '../src/lib/collection-taxonomy.ts';
import cat from '../src/data/inventory/current_catalog.json' with { type: 'json' };
const items = cat.products || cat;
const buckets = {};
for (const p of items) {
  const g = getProductBrowseGroup(p) || '__none__';
  (buckets[g] ||= []).push(p.title || p.name);
}
console.log('sofas count:', buckets.sofas?.length);
console.log((buckets.sofas || []).sort().join('\n'));
console.log('---');
// Find sofas/loveseats/settees that DIDN'T land in sofas
const missed = items.filter(p => /sofa|loveseat|settee|couch|sectional/i.test(p.title||p.name||'') && getProductBrowseGroup(p) !== 'sofas');
console.log('missed (title looks like sofa but classified elsewhere):');
console.log(missed.map(p=>`  ${getProductBrowseGroup(p)} <- ${p.title||p.name} [${p.category||p.categorySlug}]`).join('\n'));
