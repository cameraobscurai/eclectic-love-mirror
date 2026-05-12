#!/usr/bin/env node
/**
 * Promote `*Set*.png` images to position 0 in inventory_items.images for
 * tableware + serveware, so the Collection tile cover stops being a single
 * fork/glass shot.
 *
 * Default mode is DRY-RUN — prints a manifest and writes /tmp/promote-set-heroes-manifest.json.
 * Pass --apply to commit the reorder to the database.
 *
 * After --apply you must re-bake the catalog:
 *   bun scripts/bake-catalog.mjs
 *
 *   bun scripts/promote-set-heroes.mjs            # dry-run, list all swaps
 *   bun scripts/promote-set-heroes.mjs --apply    # commit
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const APPLY = process.argv.includes('--apply');
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('SUPABASE_URL / SERVICE_ROLE_KEY required'); process.exit(1); }

const sb = createClient(SB_URL, SB_KEY);
// Match "Set" as its own token in the filename: " Set", "_Set", "-Set",
// followed by word-end or extension. Avoids matching "asset", "settee", etc.
const SET_RX = /(^|[\s_\-])set([\s_\-.]|$)/i;
const isSet = (url) => SET_RX.test(url.split('/').pop() || '');
const fname = (url) => url.split('/').pop() || url;

const { data: rows, error } = await sb
  .from('inventory_items')
  .select('id, title, slug, category, images')
  .in('category', ['tableware', 'serveware'])
  .neq('status', 'draft')
  .order('title');
if (error) { console.error(error); process.exit(1); }

const swaps = [];
const skipped = { already_set: 0, no_set: 0, single_image: 0 };

for (const row of rows) {
  const imgs = row.images ?? [];
  if (imgs.length === 0) continue;
  if (imgs.length === 1) { skipped.single_image++; continue; }
  if (isSet(imgs[0])) { skipped.already_set++; continue; }
  const setIdx = imgs.findIndex(isSet);
  if (setIdx < 0) { skipped.no_set++; continue; }
  const next = [imgs[setIdx], ...imgs.filter((_, i) => i !== setIdx)];
  swaps.push({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    from_idx: 0,
    to_idx: setIdx,
    from: fname(imgs[0]),
    to: fname(imgs[setIdx]),
    new_images: next,
  });
}

console.log(`\nMode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log(`Scanned: ${rows.length}  Swaps: ${swaps.length}`);
console.log(`Skipped — already_set:${skipped.already_set}  no_set:${skipped.no_set}  single_image:${skipped.single_image}\n`);

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
console.log(pad('TITLE', 46), pad('CURRENT HERO', 36), '→', 'NEW HERO');
console.log('-'.repeat(140));
for (const s of swaps) {
  console.log(pad(s.title, 46), pad(s.from, 36), '→', s.to);
}

fs.writeFileSync('/tmp/promote-set-heroes-manifest.json', JSON.stringify({ swaps, skipped }, null, 2));
console.log(`\nManifest: /tmp/promote-set-heroes-manifest.json`);

if (!APPLY) {
  console.log('\nDry-run complete. Re-run with --apply to commit.\n');
  process.exit(0);
}

console.log('\nApplying…');
let ok = 0, fail = 0;
for (const s of swaps) {
  const { error } = await sb.from('inventory_items')
    .update({ images: s.new_images })
    .eq('id', s.id);
  if (error) { console.error(`  ✗ ${s.title}: ${error.message}`); fail++; }
  else { ok++; }
}
console.log(`\nApplied: ${ok}  Failed: ${fail}`);
console.log('Next: bun scripts/bake-catalog.mjs   (regenerates current_catalog.json)\n');
