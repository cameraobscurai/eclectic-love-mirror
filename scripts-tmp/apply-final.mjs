// Mirror Squarespace CDN URLs into the inventory bucket, rewrite manifest URLs,
// then write inventory_items.images. Read-once on CDN, idempotent on storage.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SR);

const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/inventory`;
const manifest = JSON.parse(readFileSync('scripts-tmp/final-apply-manifest.json','utf8'));

// 1) Collect unique CDN urls
const cdnUrls = new Set();
for (const r of manifest) {
  for (const u of [r.primary_image, ...(r.gallery_images||[])]) {
    if (u && u.includes('squarespace-cdn.com')) cdnUrls.add(u);
  }
}
console.log(`Mirroring ${cdnUrls.size} unique CDN URLs...`);

// Map cdn url -> bucket public url
const remap = new Map();

function inferExt(url, contentType) {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (m) return m[1].toLowerCase();
  if (contentType?.includes('jpeg')) return 'jpg';
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  return 'jpg';
}

let mirrored=0, skipped=0, failed=0;
for (const url of cdnUrls) {
  // dedupe filename: short hash + last segment
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0,10);
  const seg = decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/[^A-Za-z0-9._-]+/g,'_');
  let res, buf, ct;
  try {
    res = await fetch(url);
    if (!res.ok) { failed++; console.warn('FAIL', res.status, url); continue; }
    ct = res.headers.get('content-type') || '';
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) { failed++; console.warn('ERR', e.message, url); continue; }
  const ext = inferExt(url, ct);
  const path = `_squarespace/${hash}_${seg.replace(/\.[a-z0-9]+$/i,'')}.${ext}`;
  const { error } = await sb.storage.from('inventory').upload(path, buf, {
    contentType: ct || `image/${ext}`,
    upsert: true,
  });
  if (error) { failed++; console.warn('UPLOAD-FAIL', path, error.message); continue; }
  remap.set(url, `${PUBLIC_BASE}/${path}`);
  mirrored++;
  if (mirrored % 10 === 0) console.log(`  ...${mirrored}/${cdnUrls.size}`);
}
console.log(`Mirrored: ${mirrored}, failed: ${failed}`);

// 2) Rewrite manifest URLs
let rewrittenRefs=0;
const rewritten = manifest.map(r => {
  const map = u => {
    if (!u) return u;
    if (u.includes('squarespace-cdn.com')) {
      const n = remap.get(u);
      if (n) { rewrittenRefs++; return n; }
    }
    return u;
  };
  return {
    ...r,
    primary_image: map(r.primary_image),
    gallery_images: (r.gallery_images||[]).map(map),
  };
});
writeFileSync('scripts-tmp/final-apply-manifest.rewritten.json', JSON.stringify(rewritten,null,2));
console.log(`Rewrote ${rewrittenRefs} URL refs in manifest`);

// 3) Write inventory_items.images per row
let updated=0, skippedRows=0, failedRows=0;
for (const r of rewritten) {
  const imgs = [];
  if (r.primary_image) imgs.push(r.primary_image);
  for (const g of (r.gallery_images||[])) if (g && g!==r.primary_image && !imgs.includes(g)) imgs.push(g);
  if (imgs.length === 0) { skippedRows++; continue; }
  const { error, count } = await sb
    .from('inventory_items')
    .update({ images: imgs }, { count:'exact' })
    .eq('rms_id', r.rms_id);
  if (error) { failedRows++; console.warn('DB-FAIL', r.rms_id, error.message); continue; }
  updated++;
  if (updated % 100 === 0) console.log(`  rows updated: ${updated}`);
}
console.log(`DB rows updated: ${updated}, no-image skipped: ${skippedRows}, failed: ${failedRows}`);

writeFileSync('scripts-tmp/apply-result-summary.json', JSON.stringify({
  mirrored, failedMirror: failed, urlsRewritten: rewrittenRefs,
  rowsUpdated: updated, rowsSkipped: skippedRows, rowsFailed: failedRows,
}, null, 2));
