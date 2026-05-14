import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
const cat = await getCollectionCatalog();
const products = cat.products;
console.log('sample product keys:', Object.keys(products[0]));
// Find products that are bucketed at parent but have no subcategory tag
const noSub = products.filter(p => !p.browseSubcategories || p.browseSubcategories.length===0);
console.log('no subcategory:', noSub.length);
const byParent = {};
for (const p of noSub) {
  const k = p.parentBrowseGroup || '(none)';
  byParent[k] = (byParent[k]||0)+1;
}
console.log(JSON.stringify(byParent,null,2));
console.log('\nExamples:');
noSub.slice(0,30).forEach(p=>console.log(' -',p.rmsId,'|',p.parentBrowseGroup,'|',p.title));
