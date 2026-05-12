import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const base = '_family-sets/LUNA';
const uploads = [
  ['luna-92.png', `${base}/Luna+Pair.png`],
  ['luna-85.png', `${base}/Luna+Taupe+Front.png`],
  ['luna-87.png', `${base}/Luna+Taupe+ThreeQuarter.png`],
  ['luna-89.png', `${base}/Luna+Taupe+Back.png`],
  ['luna-86.png', `${base}/Luna+Harvest+Front.png`],
  ['luna-88.png', `${base}/Luna+Harvest+ThreeQuarter.png`],
  ['luna-90.png', `${base}/Luna+Harvest+Back.png`],
  ['luna-91.png', `${base}/Luna+Brass+Detail.png`],
];
const urls = {};
for (const [file, path] of uploads) {
  const { error } = await supa.storage.from('squarespace-mirror').upload(path, readFileSync(`/tmp/${file}`), { contentType: 'image/png', upsert: true });
  if (error) { console.error(file, error.message); process.exit(1); }
  urls[file] = supa.storage.from('squarespace-mirror').getPublicUrl(path).data.publicUrl;
  console.log('uploaded', path);
}
const taupeImages = [urls['luna-92.png'], urls['luna-85.png'], urls['luna-87.png'], urls['luna-89.png'], urls['luna-91.png']];
const harvestImages = [urls['luna-92.png'], urls['luna-86.png'], urls['luna-88.png'], urls['luna-90.png'], urls['luna-91.png']];
const updates = [
  ['1282418c-53a6-47d9-a1d2-e0c55dd462e6', taupeImages, 'TAUPE'],
  ['df163a36-7a8a-4f88-af08-b51107e8cb49', harvestImages, 'HARVEST'],
];
for (const [id, images, label] of updates) {
  const { error } = await supa.from('inventory_items').update({ images }).eq('id', id);
  console.log(label, error ? error.message : `ok (${images.length} images)`);
}
