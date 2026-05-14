import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { classify } from '../src/lib/collection-taxonomy.ts';
import { getProductBrowseGroup } from '../src/lib/collection-browse-groups.ts';
import aliases from './title-aliases.json' with { type: 'json' };

const cat = await getCollectionCatalog();
const products = cat.products;
const byRms = new Map(products.map(p => [String(p.id), p]));

const groups = aliases.groups || [];
console.log('Groups (many→1 merged families):', groups.length);

const issues = [];
for (const g of groups) {
  const rmsIds = Array.isArray(g.rms) ? g.rms : [g.rms];
  // find a product whose title matches g.live
  const liveTitleNorm = g.live.toLowerCase().trim();
  const merged = products.find(p => p.title?.toLowerCase().trim() === liveTitleNorm)
    || products.find(p => rmsIds.includes(String(p.id)));
  if (!merged) {
    issues.push({ live: g.live, rms: rmsIds, problem: 'NOT FOUND in catalog' });
    continue;
  }
  const c = classify(merged);
  const parent = getProductBrowseGroup(merged);
  const cls = c.winner ? `${c.winner.parent}/${c.winner.subcategory ?? '-'}` : 'NONE';
  if (!c.winner || !c.winner.subcategory) {
    issues.push({
      live: g.live,
      title: merged.title,
      categorySlug: merged.categorySlug,
      parent,
      classifier: cls,
      problem: 'no subcategory rule fires',
    });
  }
}
console.log('\nIssues:', issues.length);
for (const i of issues) console.log(JSON.stringify(i));
