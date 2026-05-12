import { getProductBrowseGroup } from '../src/lib/collection-taxonomy.ts';
import cat from '../src/data/inventory/current_catalog.json' with { type: 'json' };
const m = (cat.products||cat).find(p => /moxxi/i.test(p.title));
console.log(JSON.stringify({title:m?.title, cat:m?.categorySlug, group:getProductBrowseGroup(m), liveCat:m?.liveCategory, liveSub:m?.liveSubcategories}, null, 2));
