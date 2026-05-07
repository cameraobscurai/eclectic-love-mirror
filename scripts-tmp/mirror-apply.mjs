// One-shot mirror + rebind: waves 1-3 only (382 deterministic bindings).
// - Fetches every unique CDN URL from bound live products
// - Uploads to squarespace-mirror/<live_category>/<live_slug>/<NN>-<filename>
// - Rewrites inventory_items.images[] for each bound row (live hero first, then gallery)
// - Idempotent (upsert), per-row try/catch, full before/after log
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = 'squarespace-mirror';
const CONCURRENCY = 4;
const SAFE_WAVES = new Set([1, 2, 3]);

const all = JSON.parse(readFileSync('scripts-tmp/match-bound.json', 'utf8'));
const bindings = all.bindings.filter(b => SAFE_WAVES.has(b.wave));
console.log(`Bindings to apply: ${bindings.length} (waves 1-3 only)`);

// --- helpers ---
function sanitize(s) {
  return String(s).replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
}
function targetPath(liveCategory, liveSlug, idx, url) {
  const u = new URL(url);
  const base = decodeURIComponent(u.pathname.split('/').pop() || `image-${idx}`);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  const nn = String(idx + 1).padStart(2, '0');
  return `${liveCategory}/${liveSlug}/${nn}-${sanitize(stem)}${ext.toLowerCase()}`;
}
function pickContentType(url, fallback) {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.avif')) return 'image/avif';
  if (lower.includes('.gif')) return 'image/gif';
  return fallback || 'application/octet-stream';
}

// --- 1. Build unique URL → target path map ---
const urlMap = new Map(); // cdnUrl -> { path, liveSlug }
for (const b of bindings) {
  (b.live_images || []).forEach((url, i) => {
    if (!url || urlMap.has(url)) return;
    urlMap.set(url, { path: targetPath(b.live_category, b.live_slug, i, url) });
  });
}
console.log(`Unique URLs to mirror: ${urlMap.size}`);

// --- 2. Mirror with concurrency cap ---
const remap = new Map(); // cdnUrl -> publicUrl
const uploadResults = [];
let done = 0;

async function mirrorOne(url, { path }) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = pickContentType(url, res.headers.get('content-type'));
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      upsert: true, contentType: ct, cacheControl: '31536000',
    });
    if (error) throw error;
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    remap.set(url, pub.publicUrl);
    uploadResults.push({ url, path, status: 'ok', bytes: buf.length });
  } catch (e) {
    uploadResults.push({ url, path, status: 'fail', error: String(e.message || e) });
  } finally {
    done++;
    if (done % 25 === 0 || done === urlMap.size) console.log(`  uploaded ${done}/${urlMap.size}`);
  }
}

const queue = [...urlMap.entries()];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const next = queue.shift();
    if (!next) return;
    await mirrorOne(next[0], next[1]);
  }
});
await Promise.all(workers);

const okCount = uploadResults.filter(r => r.status === 'ok').length;
const failCount = uploadResults.filter(r => r.status === 'fail').length;
console.log(`Uploads: ${okCount} ok, ${failCount} failed`);

// --- 3. Rewrite images[] per bound row ---
const rmsIds = bindings.map(b => b.rms_id);
const { data: existingRows, error: fetchErr } = await sb
  .from('inventory_items')
  .select('rms_id, images')
  .in('rms_id', rmsIds);
if (fetchErr) throw fetchErr;
const existingMap = new Map(existingRows.map(r => [r.rms_id, r.images || []]));

const rowResults = [];
for (const b of bindings) {
  const before = existingMap.get(b.rms_id) || [];
  const newImages = (b.live_images || []).map(u => remap.get(u)).filter(Boolean);
  if (!newImages.length) {
    rowResults.push({ rms_id: b.rms_id, status: 'skip-no-mirror', before, after: before });
    continue;
  }
  const { error } = await sb.from('inventory_items')
    .update({ images: newImages })
    .eq('rms_id', b.rms_id);
  if (error) {
    rowResults.push({ rms_id: b.rms_id, status: 'fail', error: String(error.message), before, after: before });
  } else {
    rowResults.push({ rms_id: b.rms_id, wave: b.wave, status: 'ok', before, after: newImages });
  }
}

const rowOk = rowResults.filter(r => r.status === 'ok').length;
const rowFail = rowResults.filter(r => r.status === 'fail').length;
const rowSkip = rowResults.filter(r => r.status === 'skip-no-mirror').length;

writeFileSync('scripts-tmp/mirror-result.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  totals: { bindings: bindings.length, urls: urlMap.size, uploads_ok: okCount, uploads_fail: failCount, rows_ok: rowOk, rows_fail: rowFail, rows_skip: rowSkip },
  uploads: uploadResults,
  rows: rowResults,
}, null, 2));

console.log(`\nROWS: ${rowOk} ok, ${rowFail} fail, ${rowSkip} skip`);
console.log('Wrote scripts-tmp/mirror-result.json');
