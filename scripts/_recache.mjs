// Re-sets Cache-Control on existing storage objects by downloading + re-uploading
// with the desired cacheControl header. Uses service role to bypass CDN and RLS.
// Concurrency-capped, idempotent, safe to re-run.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('missing env'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const BUCKETS = [
  { bucket: 'incoming-photos',    cacheControl: '31536000' },
  { bucket: 'squarespace-mirror', cacheControl: '31536000' },
  { bucket: 'missing-gaps',       cacheControl: '31536000' },
  { bucket: 'inventory',          cacheControl: '86400'    },
];
const CONCURRENCY = 4;
const DRY_RUN = process.argv.includes('--dry');
const BUCKET_FILTER = process.argv.find(a => a.startsWith('--bucket='))?.split('=')[1];

async function listAll(bucket, prefix = '') {
  const out = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, {
      limit: 1000, offset, sortBy: { column: 'name', order: 'asc' }
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || item.metadata === null) {
        // folder — recurse
        const sub = await listAll(bucket, path);
        out.push(...sub);
      } else {
        out.push({ path, size: item.metadata?.size ?? 0, contentType: item.metadata?.mimetype ?? 'application/octet-stream' });
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function processBucket({ bucket, cacheControl }) {
  console.log(`\n=== ${bucket} (target cache-control: max-age=${cacheControl}) ===`);
  const files = await listAll(bucket);
  console.log(`  files: ${files.length}`);
  if (DRY_RUN) { console.log('  [dry] skipping rewrite'); return { bucket, total: files.length, ok: 0, fail: 0 }; }

  let ok = 0, fail = 0, skip = 0;
  const failures = [];
  let i = 0;
  async function worker() {
    while (i < files.length) {
      const idx = i++;
      const f = files[idx];
      try {
        // Skip .keep / zero-byte sentinels
        if (f.size === 0) { skip++; continue; }
        const { data: blob, error: dlErr } = await sb.storage.from(bucket).download(f.path);
        if (dlErr) throw new Error('dl: ' + dlErr.message);
        const buf = Buffer.from(await blob.arrayBuffer());
        const { error: upErr } = await sb.storage.from(bucket).upload(f.path, buf, {
          cacheControl, contentType: f.contentType, upsert: true,
        });
        if (upErr) throw new Error('up: ' + upErr.message);
        ok++;
        if (ok % 50 === 0) console.log(`  ${bucket}: ${ok}/${files.length}`);
      } catch (e) {
        fail++;
        failures.push({ path: f.path, error: String(e.message || e) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`  done: ok=${ok} skipped=${skip} failed=${fail}`);
  if (failures.length) console.log('  first failures:', failures.slice(0, 5));
  return { bucket, total: files.length, ok, skip, fail };
}

const targets = BUCKET_FILTER ? BUCKETS.filter(b => b.bucket === BUCKET_FILTER) : BUCKETS;
const summary = [];
for (const b of targets) summary.push(await processBucket(b));
console.log('\nSUMMARY', summary);
