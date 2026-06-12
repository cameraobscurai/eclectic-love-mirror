import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// file number → product id + slug. file 10 → product 1 (Excursion), etc.
const MAP = [
  { file: 10, id: '78918a9c-7ae0-41b6-be3d-0de904ac0936', slug: 'excursion-champagne-trunk-bar' },
  { file: 9,  id: 'b1d21252-7da1-4c70-8b00-9b9c1bc4ad53', slug: 'voyage-black-trunk-bar' },
  { file: 8,  id: 'bfc6a8fa-d674-4d8e-8c8f-84303aa700c2', slug: 'malvina-oval-bar' },
  { file: 7,  id: 'e2012633-6bd4-4842-bdb0-7518bc9904bc', slug: 'sidecar-dark-wood-bar' },
  { file: 6,  id: '366d16af-1384-49e2-b3a6-763cb468badc', slug: 'amisa-midnight-bar' },
  { file: 5,  id: '5f8a975a-e791-4051-96dd-4b32b19296e8', slug: 'arcus-calvin-12-smooth-bar' },
  { file: 4,  id: 'dc183a56-9e47-4a37-93e8-4ba6aa4b2f71', slug: 'arcus-ryann-12-white-tambour-bar' },
  { file: 3,  id: '7268b08d-7423-47f5-ab5c-d24763ddb649', slug: 'arcus-tavion-12-natural-tambour-bar' },
  { file: 2,  id: '5c2318a6-8a82-4153-b6dd-ff25aa19e3fe', slug: 'arcus-bevin-12-slatted-bar' },
  { file: 1,  id: 'ddc63016-b430-49e5-891a-9e4d08330ed8', slug: 'arcus-levar-12-black-tambour-bar' },
];

const BUCKET = 'inventory';
const STAMP = '2026-06-12';

for (const m of MAP) {
  const src = `/mnt/user-uploads/ChatGPT_Image_Jun_12_2026_03_08_${m.file >= 10 ? '31' : (m.file >= 5 ? '30' : '29')}_AM_${m.file === 10 ? '10' : m.file}.png`;
  // file 5-9 use 03_08_30; file 1-4 use 03_08_29; file 10 uses 03_08_31
  let timePart = '30';
  if (m.file <= 4) timePart = '29';
  if (m.file === 10) timePart = '31';
  const srcPath = `/mnt/user-uploads/ChatGPT_Image_Jun_12_2026_03_08_${timePart}_AM_${m.file === 10 ? '10' : m.file}.png`;
  if (!fs.existsSync(srcPath)) { console.error('MISSING', srcPath); process.exit(1); }
  const buf = fs.readFileSync(srcPath);
  const key = `inventory/${m.slug}/${STAMP}-hero.png`;
  const up = await sb.storage.from(BUCKET).upload(key, buf, { contentType: 'image/png', upsert: true });
  if (up.error) { console.error('UPLOAD FAIL', m.slug, up.error); process.exit(1); }
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(key);
  const newUrl = pub.publicUrl;

  // fetch current images, prepend new url (dedupe)
  const { data: row, error: ge } = await sb.from('inventory_items').select('images').eq('id', m.id).single();
  if (ge) { console.error('GET FAIL', m.slug, ge); process.exit(1); }
  const existing = (row.images || []).filter(u => u !== newUrl);
  const next = [newUrl, ...existing];
  const { error: ue } = await sb.from('inventory_items').update({ images: next }).eq('id', m.id);
  if (ue) { console.error('UPDATE FAIL', m.slug, ue); process.exit(1); }
  console.log('OK', m.slug, '→', newUrl);
}
console.log('DONE');
