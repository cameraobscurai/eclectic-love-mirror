import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
const cat = getCollectionCatalog();
console.log('total products:', cat.products.length);

// Count products by parent group and whether a search for the family title finds them
import { buildBrowseGroupBuckets } from '../src/lib/collection-browse-groups.ts';
const buckets = buildBrowseGroupBuckets(cat);

// products that ended up under no group at all
const allInBuckets = new Set();
for (const b of Object.values(buckets)) for (const p of b.products) allInBuckets.add(p.slug);
const orphans = cat.products.filter(p => !allInBuckets.has(p.slug));
console.log('orphan (in no browse group):', orphans.length);
orphans.slice(0,30).forEach(p=>console.log('  -', p.rmsId, '|', p.title, '|', p.liveCategory||'(no live)'));
