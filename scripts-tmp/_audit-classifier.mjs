import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { getProductBrowseGroup } from '../src/lib/collection-browse-groups.ts';
const cat = await getCollectionCatalog();
console.log('keys:', Object.keys(cat));
const products = cat.products || [];
console.log('total:', products.length);
const stats = { noLive: 0, fellThrough: 0, byParent: {} };
const fell = [];
const noTitleKeyword = [];
for (const p of products) {
  if (!p.liveCategory) {
    stats.noLive++;
    const g = getProductBrowseGroup(p);
    if (!g) { stats.fellThrough++; fell.push(p); }
    else stats.byParent[g] = (stats.byParent[g]||0)+1;
  }
}
console.log(JSON.stringify(stats,null,2));
console.log('\nFell through:', fell.length);
fell.slice(0,50).forEach(p=>console.log(' -',p.rmsId,'|',p.title));
