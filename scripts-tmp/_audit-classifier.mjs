import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import { getProductBrowseGroup } from '../src/lib/collection-browse-groups.ts';
const cat = getCollectionCatalog();
console.log('keys:', Object.keys(cat));
const products = cat.products || cat.items || [];
console.log('count:', products.length);
console.log('sample keys:', Object.keys(products[0]||{}));
