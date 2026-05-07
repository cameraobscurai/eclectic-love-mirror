import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SR, { auth: { persistSession: false } });
const BUCKET = 'collection';

const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));

function exactFilename(url) {
  const noQ = url.split('?')[0];
  const last = noQ.substring(noQ.lastIndexOf('/')+1);
  try { return decodeURIComponent(last); } catch { return last; }
}
function ctFromName(n) {
  const e = n.toLowerCase().split('.').pop();
  return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',gif:'image/gif'})[e] || 'application/octet-stream';
}

// Build target plan with collision suffixing (keep both)
const usedPaths = new Map(); // path -> sourceUrl that owns it
const plan = [];
for (const p of catalog.products) {
  for (const img of (p.images||[])) {
    const url = img.url;
    if (!url) continue;
    const fn = exactFilename(url);
    const dir = `${p.categorySlug}/${p.slug}`;
    let target = `${dir}/${fn}`;
    if (usedPaths.has(target) && usedPaths.get(target) !== url) {
      // collision with different source -> suffix
      const dot = fn.lastIndexOf('.');
      const stem = dot>0 ? fn.slice(0,dot) : fn;
      const ext  = dot>0 ? fn.slice(dot) : '';
      let i = 2;
      while (usedPaths.has(`${dir}/${stem}_${i}${ext}`) && usedPaths.get(`${dir}/${stem}_${i}${ext}`) !== url) i++;
      target = `${dir}/${stem}_${i}${ext}`;
    }
    usedPaths.set(target, url);
    plan.push({ slug:p.slug, cat:p.categorySlug, sourceUrl:url, targetPath:target });
  }
}
console.log(`plan: ${plan.length} images across ${new Set(plan.map(x=>x.slug)).size} products`);

// Concurrency-limited execution
const CONC = 8;
let ok=0, skip=0, fail=0, done=0;
const results = [];
const queue = [...plan];

async function worker() {
  while (queue.length) {
    const job = queue.shift();
    if (!job) return;
    try {
      // HEAD via storage download(0) is overkill; try upsert:false and detect "exists" error
      const res = await fetch(job.sourceUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get('content-type') || ctFromName(job.targetPath);
      const { error } = await sb.storage.from(BUCKET).upload(job.targetPath, buf, { contentType: ct, upsert: false });
      if (error) {
        if (/exists|duplicate/i.test(error.message)) { skip++; results.push({...job, status:'skip-exists'}); }
        else throw error;
      } else {
        ok++; results.push({...job, status:'ok', bytes: buf.length});
      }
    } catch (e) {
      fail++; results.push({...job, status:'fail', error:String(e.message||e)});
    } finally {
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${plan.length}  ok=${ok} skip=${skip} fail=${fail}`);
    }
  }
}
await Promise.all(Array.from({length:CONC}, worker));

const summary = { total: plan.length, ok, skip, fail, byCat: {} };
for (const r of results) summary.byCat[r.cat] = (summary.byCat[r.cat]||0)+1;
fs.writeFileSync('/tmp/collection-snapshot-result.json', JSON.stringify({summary, results}, null, 2));
console.log('\nDONE'); console.log(JSON.stringify(summary,null,2));
console.log('full log: /tmp/collection-snapshot-result.json');
