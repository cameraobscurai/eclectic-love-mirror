import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const path = 'inventory/zoe-oak-dining-chair/Zoe+Bleached+Oak+Dining+Chair.png';
const { error: upErr } = await supa.storage.from('squarespace-mirror').upload(path, readFileSync('/tmp/zoe.png'), { contentType: 'image/png', upsert: true });
if (upErr) { console.error(upErr); process.exit(1); }
const url = supa.storage.from('squarespace-mirror').getPublicUrl(path).data.publicUrl;
console.log('URL:', url);

// Replace Zoe image + set ranks
const ops = [
  { id: '2ed094c1-b5d8-42ef-bd93-6830325bcc44', patch: { owner_site_rank: 10 }, label: 'Brayan' },
  { id: '1654bb36-58d7-44da-992c-8dfa54d4ca0f', patch: { owner_site_rank: 11, images: [url] }, label: 'Zoe' },
  { id: '49010a95-bc12-42be-80bc-e34eab6154ff', patch: { owner_site_rank: 12 }, label: 'Cameron' },
];
for (const { id, patch, label } of ops) {
  const { error } = await supa.from('inventory_items').update(patch).eq('id', id);
  console.log(label, error ? error.message : 'ok');
}
