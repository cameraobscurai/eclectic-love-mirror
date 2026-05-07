// Apply 37 HIGH+MED rebinds: re-mirror real assetUrl heroes from JSON feed, rewrite images[].
// Source: scripts-tmp/placeholder-rebind.json (HIGH + MED buckets)
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'squarespace-mirror';

const r = JSON.parse(readFileSync('scripts-tmp/placeholder-rebind.json', 'utf8'));
const targets = [...r.proposals.HIGH, ...r.proposals.MED];
console.log(`Rebinding ${targets.length} rows`);

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const sanitize = (s) => String(s).replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
const ctype = (u) => {
  const l = u.toLowerCase();
  if (l.includes('.png')) return 'image/png';
  if (l.includes('.jpg') || l.includes('.jpeg')) return 'image/jpeg';
  if (l.includes('.webp')) return 'image/webp';
  return 'application/octet-stream';
};
const fname = (u, i) => {
  try { const p = new URL(u).pathname.split('/').pop() || `image-${i}`; return decodeURIComponent(p); }
  catch { return `image-${i}`; }
};

const results = [];
for (const t of targets) {
  const c = t.candidates[0];
  // Fetch DB row to get current category for path
  const { data: row, error: rErr } = await sb.from('inventory_items')
    .select('category,images').eq('rms_id', t.rms_id).maybeSingle();
  if (rErr || !row) { results.push({ rms_id: t.rms_id, status: 'fail', error: 'row not found' }); continue; }

  // Squarespace's top-level assetUrl is itself a lazy-load placeholder for these rows.
  // The real photos live in items[].assetUrl (gallery). Prefer gallery; fall back to hero.
  const seq = [...c.gallery, c.hero].filter(Boolean);
  const urls = [...new Set(seq)].slice(0, 8);
  const newPublic = [];
  const skipped = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const f = fname(u, i);
    const path = `${row.category}/${slugify(t.title)}/${String(i + 1).padStart(2, '0')}-${sanitize(f)}`;
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) { skipped.push({ url: u, reason: `placeholder bytes=${buf.length}` }); continue; }
      const { error } = await sb.storage.from(BUCKET).upload(path, buf, { upsert: true, contentType: ctype(u), cacheControl: '31536000' });
      if (error) throw error;
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
      newPublic.push(pub.publicUrl);
    } catch (e) {
      skipped.push({ url: u, reason: String(e.message || e) });
    }
  }
  if (!newPublic.length) {
    results.push({ rms_id: t.rms_id, title: t.title, status: 'no_real_image', skipped });
    continue;
  }

  const { error: updErr } = await sb.from('inventory_items').update({ images: newPublic }).eq('rms_id', t.rms_id);
  if (updErr) results.push({ rms_id: t.rms_id, title: t.title, status: 'update_fail', error: String(updErr.message) });
  else results.push({ rms_id: t.rms_id, title: t.title, status: 'ok', count: newPublic.length, hero: newPublic[0], skipped });
  if (results.length % 10 === 0) console.log(`  progress ${results.length}/${targets.length}`);
}

const ok = results.filter(r => r.status === 'ok').length;
const fail = results.length - ok;
writeFileSync('scripts-tmp/placeholder-apply-result.json', JSON.stringify({ generated_at: new Date().toISOString(), ok, fail, results }, null, 2));
console.log(`Done: ${ok} ok / ${fail} fail. Wrote scripts-tmp/placeholder-apply-result.json`);
