// Nano Banana 2 cover-image upscaler — one category at a time.
//
// Usage:
//   node scripts/nano-upscale-covers.mjs --category=tables            # dry run
//   node scripts/nano-upscale-covers.mjs --category=tables --apply    # do it
//   node scripts/nano-upscale-covers.mjs --category=tables --apply --limit=5
//   node scripts/nano-upscale-covers.mjs --category=tables --apply --redo   # ignore skip-existing
//
// Cost: ~0.271 credits/image. Prints estimate before running.
// Never touches originals. Writes to squarespace-mirror/upscaled-covers/{category}/{rms_id}.png
// Updates inventory_items.upscaled_cover_url.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const CATEGORY = args.category;
const APPLY = !!args.apply;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const REDO = !!args.redo;
const COST_PER = 0.271;

if (!CATEGORY) {
  console.error('Missing --category=<slug>. E.g. tables, lighting, seating.');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOVABLE_KEY = process.env.LOVABLE_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / LOVABLE_API_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = 'squarespace-mirror';
const PROMPT = 'show me image 1 with upscaled details and textures, natural shadow on white background';
const MODEL = 'google/gemini-3.1-flash-image';

const LOG_DIR = '/tmp/upscale-runs';
fs.mkdirSync(LOG_DIR, { recursive: true });
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_PATH = path.join(LOG_DIR, `${runStamp}-${CATEGORY}.jsonl`);
const log = (obj) => fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n');

function coverUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === 'string') return first;
  return first?.url || null;
}

async function fetchBuf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function upscale(b64) {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        ],
      }],
      modalities: ['image', 'text'],
    }),
  });
  if (!r.ok) throw new Error(`gateway ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const out = data?.data?.[0]?.b64_json;
  if (!out) throw new Error('no b64_json in response');
  return Buffer.from(out, 'base64');
}

async function uploadPng(buf, storagePath) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const { data: rows, error } = await sb
    .from('inventory_items')
    .select('id, rms_id, title, images, upscaled_cover_url, public_ready, category')
    .eq('category', CATEGORY)
    .order('rms_id', { ascending: true });
  if (error) throw error;

  const eligible = rows
    .filter(r => r.public_ready !== false)
    .filter(r => coverUrl(r.images))
    .filter(r => REDO || !r.upscaled_cover_url);

  const targets = LIMIT ? eligible.slice(0, LIMIT) : eligible;

  console.log(`\n=== ${CATEGORY} ===`);
  console.log(`  rows in category:   ${rows.length}`);
  console.log(`  public_ready:       ${rows.filter(r => r.public_ready !== false).length}`);
  console.log(`  has cover:          ${rows.filter(r => coverUrl(r.images)).length}`);
  console.log(`  already upscaled:   ${rows.filter(r => r.upscaled_cover_url).length}`);
  console.log(`  → to process:       ${targets.length}`);
  console.log(`  estimated cost:     ~${(targets.length * COST_PER).toFixed(2)} credits`);
  console.log(`  log:                ${LOG_PATH}`);

  if (!APPLY) {
    console.log('\n(dry run — pass --apply to execute)');
    return;
  }
  if (targets.length === 0) {
    console.log('nothing to do.');
    return;
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    const src = coverUrl(row.images);
    const storagePath = `upscaled-covers/${CATEGORY}/${row.rms_id}.png`;
    const t0 = Date.now();
    process.stdout.write(`[${i + 1}/${targets.length}] ${row.rms_id} ${row.title?.slice(0, 40)}... `);
    try {
      const orig = await fetchBuf(src);
      const b64 = orig.toString('base64');
      const out = await upscale(b64);
      const publicUrl = await uploadPng(out, storagePath);
      const { error: upErr } = await sb
        .from('inventory_items')
        .update({ upscaled_cover_url: publicUrl })
        .eq('id', row.id);
      if (upErr) throw upErr;
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`ok ${dt}s ${(out.length / 1024).toFixed(0)}KB`);
      log({ ok: true, rms_id: row.rms_id, src, publicUrl, ms: Date.now() - t0 });
      ok++;
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      log({ ok: false, rms_id: row.rms_id, src, error: String(e) });
      fail++;
    }
  }

  console.log(`\n=== done: ${ok} ok, ${fail} fail ===`);
  console.log(`log: ${LOG_PATH}`);
  console.log(`next: node scripts/bake-catalog.mjs && commit`);
}

main().catch(e => { console.error(e); process.exit(1); });
