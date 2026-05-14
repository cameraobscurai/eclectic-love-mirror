import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const manifest = JSON.parse(readFileSync('/tmp/set-cover-manifest.json','utf8'));

const updates = [];
for (const g of manifest) {
  for (const m of g.matches) {
    if (m.alreadyCover) continue;
    updates.push({ id: m.id, title: m.title, coverUrl: g.coverUrl });
  }
}
console.log(`Applying ${updates.length} cover updates...`);

// Pull current images
const ids = updates.map(u => u.id);
const cur = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('inventory_items').select('id,images').in('id', ids.slice(i,i+200));
  for (const r of data) cur.set(r.id, r.images || []);
}

let ok = 0, fail = 0;
const errs = [];
const batch = 8;
for (let i = 0; i < updates.length; i += batch) {
  await Promise.all(updates.slice(i, i+batch).map(async u => {
    const imgs = cur.get(u.id) || [];
    const newImgs = [u.coverUrl, ...imgs.filter(x => x !== u.coverUrl)];
    const { error } = await sb.from('inventory_items').update({ images: newImgs }).eq('id', u.id);
    if (error) { fail++; errs.push({ title: u.title, err: error.message }); }
    else ok++;
  }));
}
console.log(`OK ${ok} | FAIL ${fail}`);
if (errs.length) console.log(JSON.stringify(errs.slice(0,10), null, 2));
