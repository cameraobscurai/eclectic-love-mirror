import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const path = '_family-sets/LUNA/Luna+Arcing+Dining+Chairs+Set.png';
const file = readFileSync('/tmp/luna.png');
const { error: upErr } = await supa.storage.from('squarespace-mirror').upload(path, file, { contentType: 'image/png', upsert: true });
if (upErr) { console.error(upErr); process.exit(1); }
const { data: { publicUrl } } = supa.storage.from('squarespace-mirror').getPublicUrl(path);
console.log('URL:', publicUrl);
const ids = ['df163a36-7a8a-4f88-af08-b51107e8cb49','1282418c-53a6-47d9-a1d2-e0c55dd462e6'];
for (const id of ids) {
  const { data, error } = await supa.from('inventory_items').select('images').eq('id', id).single();
  if (error) { console.error(error); continue; }
  const next = [publicUrl, ...(data.images || []).filter(u => u !== publicUrl)];
  const { error: uerr } = await supa.from('inventory_items').update({ images: next }).eq('id', id);
  console.log(id, uerr ? uerr.message : 'ok', '->', next.length, 'images');
}
