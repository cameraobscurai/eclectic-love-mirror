import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { getProductBrowseGroup } from '../src/lib/collection-browse-groups.ts';
const cat = getCollectionCatalog();

const stats = { total: cat.products.length, noLive: 0, fellThrough: 0, byParent: {} };
const examples = [];
for (const p of cat.products) {
  if (!p.liveCategory) {
    stats.noLive++;
    const g = getProductBrowseGroup(p);
    if (!g) {
      stats.fellThrough++;
      examples.push(p);
    } else {
      stats.byParent[g] = (stats.byParent[g]||0)+1;
    }
  }
}
console.log(JSON.stringify(stats,null,2));
console.log('\nFell through (no group at all):');
examples.slice(0,40).forEach(p=>console.log(' -',p.rmsId,'|',p.title));
