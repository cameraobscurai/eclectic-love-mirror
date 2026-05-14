import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));
const items = cat.items || cat;
for (const name of ['adonis','donaver','sage']) {
  console.log('\n==='+name+'===');
  const matches = items.filter(i => (i.name||'').toLowerCase().includes(name) || (i.parent_slug||'').toLowerCase().includes(name) || (i.slug||'').toLowerCase().includes(name));
  for (const m of matches) {
    console.log(m.slug, '|', m.name, '|', JSON.stringify(m.images||[]).slice(0,300));
  }
}
