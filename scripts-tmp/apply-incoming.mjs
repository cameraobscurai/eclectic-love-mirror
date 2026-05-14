import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { merged } = JSON.parse(readFileSync('/tmp/incoming-match-v3.json','utf8'));

// Manual override: Inola — only wire the "Black Bar" file to the generic Inola Single Black Bar
const PUBLIC = `${process.env.SUPABASE_URL}/storage/v1/object/public/incoming-photos`;
const enc = p => p.split('/').map(encodeURIComponent).join('/');

// Find Inola Single Black Bar
const { data: inolaRow } = await sb.from('inventory_items')
  .select('id,title,images').eq('title','Inola Single Black Bar').maybeSingle();
if (inolaRow) {
  merged.push({
    group: { folder: 'bars', files: ['INOLA Black Bar.png'] },
    score: 99, manual: true,
    product: { id: inolaRow.id, title: inolaRow.title, category: 'bars', currentImages: inolaRow.images?.length || 0 },
    newUrls: [`${PUBLIC}/${enc('bars/INOLA Black Bar.png')}`],
  });
  console.log(`+ Manual: Inola Single Black Bar`);
}

console.log(`Applying ${merged.length} updates...`);

let ok = 0, fail = 0;
const errors = [];
const archived_at = new Date().toISOString();

// Pull current state in bulk to build archive entries
const ids = [...new Set(merged.map(m => m.product.id))];
const current = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const slice = ids.slice(i, i + 200);
  const { data, error } = await sb.from('inventory_items')
    .select('id, images, images_archive').in('id', slice);
  if (error) throw error;
  for (const r of data) current.set(r.id, r);
}

// Apply in parallel batches of 8
const batchSize = 8;
for (let i = 0; i < merged.length; i += batchSize) {
  const batch = merged.slice(i, i + batchSize);
  await Promise.all(batch.map(async (m) => {
    const cur = current.get(m.product.id);
    if (!cur) { fail++; errors.push({ title: m.product.title, err: 'not-found' }); return; }
    const oldImages = cur.images || [];
    const archive = Array.isArray(cur.images_archive) ? cur.images_archive : [];
    if (oldImages.length > 0) {
      archive.push({ archived_at, reason: 'designer_drop_2026_05', images: oldImages });
    }
    const newImages = [...new Set(m.newUrls)];
    const { error } = await sb.from('inventory_items').update({
      images: newImages,
      images_archive: archive,
      color_tagged_at: null,
      color_needs_review: false,
    }).eq('id', m.product.id);
    if (error) { fail++; errors.push({ title: m.product.title, err: error.message }); }
    else ok++;
  }));
  if ((i + batchSize) % 80 === 0 || i + batchSize >= merged.length) {
    console.log(`  ${Math.min(i+batchSize, merged.length)}/${merged.length}  ok=${ok} fail=${fail}`);
  }
}

console.log(`\nDONE. ok=${ok} fail=${fail}`);
if (errors.length) {
  console.log('\nERRORS:');
  errors.slice(0,20).forEach(e => console.log(`  ${e.title}: ${e.err}`));
}

writeFileSync('/tmp/apply-result.json', JSON.stringify({ ok, fail, errors, count: merged.length }, null, 2));
