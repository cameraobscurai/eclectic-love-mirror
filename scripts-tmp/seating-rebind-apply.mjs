// Rebind the 27 seating placeholders using sqs-live-truth.json (already harvested CDN URLs).
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'squarespace-mirror';

const r = JSON.parse(readFileSync('scripts-tmp/placeholder-rebind.json', 'utf8'));
const truth = JSON.parse(readFileSync('scripts-tmp/sqs-live-truth.json', 'utf8'));

const titleIdx = new Map();
for (const k of Object.keys(truth)) titleIdx.set(truth[k].title.toLowerCase().trim(), truth[k]);

const targets = r.proposals.NO_FEED.filter(x => x.category === 'seating');
console.log(`Rebinding ${targets.length} seating rows`);

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const sanitize = (s) => String(s).replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
const ctype = (u) => {
  const l = u.toLowerCase();
  if (l.includes('.png')) return 'image/png';
  if (l.includes('.jpg') || l.includes('.jpeg')) return 'image/jpeg';
  if (l.includes('.webp')) return 'image/webp';
  return 'application/octet-stream';
};
const fname = (u, i) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop() || `image-${i}`); } catch { return `image-${i}`; } };

const results = [];
for (const t of targets) {
  const m = titleIdx.get(t.title.toLowerCase().trim());
  if (!m) { results.push({ rms_id: t.rms_id, title: t.title, status: 'no_truth' }); continue; }
  // Prefer cdn.com URLs (real photos); skip static1 (lazy-load placeholders)
  const urls = (m.images || []).filter(u => u.includes('squarespace-cdn.com')).slice(0, 8);
  if (!urls.length) { results.push({ rms_id: t.rms_id, title: t.title, status: 'no_cdn' }); continue; }

  const newPublic = [];
  const skipped = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const path = `seating/${slugify(t.title)}/${String(i + 1).padStart(2, '0')}-${sanitize(fname(u, i))}`;
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) { skipped.push({ url: u, reason: `placeholder bytes=${buf.length}` }); continue; }
      const { error } = await sb.storage.from(BUCKET).upload(path, buf, { upsert: true, contentType: ctype(u), cacheControl: '31536000' });
      if (error) throw error;
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
      newPublic.push(pub.publicUrl);
    } catch (e) { skipped.push({ url: u, reason: String(e.message || e) }); }
  }
  if (!newPublic.length) { results.push({ rms_id: t.rms_id, title: t.title, status: 'no_real_image', skipped }); continue; }

  const { error: updErr } = await sb.from('inventory_items').update({ images: newPublic }).eq('rms_id', t.rms_id);
  if (updErr) results.push({ rms_id: t.rms_id, title: t.title, status: 'update_fail', error: String(updErr.message) });
  else results.push({ rms_id: t.rms_id, title: t.title, status: 'ok', count: newPublic.length, hero: newPublic[0] });
  if (results.length % 10 === 0) console.log(`  progress ${results.length}/${targets.length}`);
}

const ok = results.filter(x => x.status === 'ok').length;
writeFileSync('scripts-tmp/seating-rebind-result.json', JSON.stringify({ generated_at: new Date().toISOString(), ok, fail: results.length - ok, results }, null, 2));
console.log(`Done: ${ok}/${results.length} ok. Wrote scripts-tmp/seating-rebind-result.json`);
