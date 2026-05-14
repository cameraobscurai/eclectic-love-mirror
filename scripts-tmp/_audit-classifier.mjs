import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { classify } from '../src/lib/collection-taxonomy.ts';
const cat = await getCollectionCatalog();
const products = cat.products;

let unclassified = [];
let lowConf = [];
let multiByParent = {};
for (const p of products) {
  const c = classify(p);
  if (!c.winner || c.winner.score === 0) {
    unclassified.push(p);
  } else if (c.confidence < 50) {
    lowConf.push({p, c});
  }
}
console.log('total:', products.length);
console.log('unclassified (no rule fired):', unclassified.length);
console.log('low-confidence (winner - 2nd < 50):', lowConf.length);
console.log('\nUnclassified:');
unclassified.slice(0,40).forEach(p=>console.log(' -',p.id,'|',p.title,'|',p.categorySlug));
console.log('\nLow-confidence sample:');
lowConf.slice(0,20).forEach(({p,c})=>console.log(' -',p.title,'→',c.winner?.parent,'/',c.winner?.subcategory,'conf',c.confidence));
