import { readFileSync } from 'fs';
const cat = JSON.parse(readFileSync('src/data/inventory/current_catalog.json','utf8'));
const items = Array.isArray(cat) ? cat : (cat.products || cat.items || Object.values(cat)[0]);
console.log('catalog n=', items.length, Object.keys(items[0]).slice(0,25));
const seating = items.filter(p=>(p.categorySlug||p.category_slug||'').includes('seating'));
console.log('seating', seating.length);
console.log(seating.slice(0,3).map(p=>({t:p.title,d:p.dimensions,sub:p.subcategory||p.liveSubcategories})));
