import { getCollectionCatalog } from '../src/lib/phase3-catalog.ts';
import aliases from './title-aliases.json' with { type: 'json' };
const cat = await getCollectionCatalog();
const products = cat.products;

const targets = ['Blue Ombre Fringe Lumbar','Blue Ombre Fringe Pillow','Green Tassel Pillow'];
for (const live of targets) {
  const g = (aliases.groups||[]).find(x=>x.live===live);
  console.log(`\n=== ${live} (rms: ${(g?.rms||[]).join(',')}) ===`);
  for (const id of (g?.rms||[])) {
    const p = products.find(x=>String(x.id)===String(id));
    console.log(`  rms ${id}: ${p ? p.title : 'NOT IN CATALOG'}`);
  }
  // And list any products containing key fragment
  const frag = live.split(' ')[0].toLowerCase();
  const hits = products.filter(p => p.title.toLowerCase().includes(frag) && p.title.toLowerCase().includes('fringe'));
  console.log(`  fuzzy hits for "${frag}":`);
  hits.forEach(h=>console.log(`    - rms ${h.id}: ${h.title}`));
}
