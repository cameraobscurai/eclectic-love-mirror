// Re-frame covers that are ALREADY upscaled — no model call, no credits.
//
//   node scripts/reframe-covers.mjs --category=seating            # dry run
//   node scripts/reframe-covers.mjs --category=seating --apply
//
// Trims each upscaled_cover_url to its silhouette and re-places it on the
// standard 1536x1536 white canvas at the category anchor. Idempotent.

import { createClient } from '@supabase/supabase-js';
import { normalizeCover, CANVAS } from './lib/cover-canvas.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);
const CATEGORY = args.category;
const APPLY = !!args.apply;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;

if (!CATEGORY) { console.error('Missing --category=<slug>'); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = 'squarespace-mirror';

const { data: rows, error } = await sb
  .from('inventory_items')
  .select('id, rms_id, title, upscaled_cover_url')
  .eq('category', CATEGORY)
  .not('upscaled_cover_url', 'is', null)
  .order('rms_id');
if (error) throw error;

const targets = LIMIT ? rows.slice(0, LIMIT) : rows;
console.log(`\n=== reframe ${CATEGORY} — ${targets.length} covers → ${CANVAS}x${CANVAS} ===`);
if (!APPLY) { console.log('(dry run — pass --apply)'); process.exit(0); }

let ok = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const row = targets[i];
  process.stdout.write(`[${i + 1}/${targets.length}] ${row.rms_id} `);
  try {
    const r = await fetch(row.upscaled_cover_url);
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    const src = Buffer.from(await r.arrayBuffer());
    const { buf, note } = await normalizeCover(src, CATEGORY, { canvas: CANVAS });
    const path = `upscaled-covers/${CATEGORY}/${row.rms_id}.png`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: 'image/png', upsert: true,
    });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    // Cache-bust so the CDN serves the reframed file.
    const busted = `${data.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await sb
      .from('inventory_items').update({ upscaled_cover_url: busted }).eq('id', row.id);
    if (dbErr) throw dbErr;
    console.log(`ok ${note}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    fail++;
  }
}
console.log(`\n=== ${ok} ok, ${fail} fail ===\nnext: node scripts/bake-catalog.mjs`);
