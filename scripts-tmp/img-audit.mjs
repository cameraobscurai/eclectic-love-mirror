import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

async function listAll(bucket, prefix='') {
  const out = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' }});
    if (error) { console.error(bucket, prefix, error.message); break; }
    if (!data?.length) break;
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...await listAll(bucket, full));
      else if (!e.name.endsWith('.lovkeep')) out.push({ path: full, size: e.metadata?.size ?? 0 });
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

const buckets = ['inventory','squarespace-mirror','collection','category-covers','image-galleries','team-photos','videos','editorial','fonts'];
const summary = [];
let grandCount = 0, grandBytes = 0;
for (const b of buckets) {
  const files = await listAll(b);
  const bytes = files.reduce((a,f) => a + (f.size||0), 0);
  const folders = {};
  for (const f of files) {
    const top = f.path.includes('/') ? f.path.split('/')[0] : '(root)';
    folders[top] = (folders[top]||0) + 1;
  }
  summary.push({ bucket: b, count: files.length, mb: +(bytes/1024/1024).toFixed(1), folders });
  grandCount += files.length;
  grandBytes += bytes;
}

console.log('\n=== STORAGE BUCKET AUDIT ===\n');
for (const s of summary) {
  console.log(`${s.bucket.padEnd(22)} ${String(s.count).padStart(5)} files   ${String(s.mb).padStart(8)} MB`);
  const top = Object.entries(s.folders).sort((a,b)=>b[1]-a[1]).slice(0,8);
  for (const [k,v] of top) console.log(`  └─ ${k.padEnd(40)} ${v}`);
}
console.log('\n' + '─'.repeat(50));
console.log(`TOTAL`.padEnd(22) + String(grandCount).padStart(5) + ` files   ${(grandBytes/1024/1024).toFixed(1)} MB`);

// Now: how many catalog products point to which bucket?
const { data: items } = await sb.from('inventory_items').select('rms_id,images').not('rms_id','is',null);
const byBucket = {};
let totalUrls = 0, withImages = 0;
for (const it of items) {
  if (!it.images?.length) continue;
  withImages++;
  for (const u of it.images) {
    totalUrls++;
    const m = u.match(/\/storage\/v1\/object\/public\/([^/]+)/);
    const b = m ? m[1] : (u.startsWith('http') ? '(external)' : '(other)');
    byBucket[b] = (byBucket[b]||0)+1;
  }
}
console.log('\n=== CATALOG IMAGE URL SOURCES ===');
console.log(`Products with images: ${withImages}/${items.length}`);
console.log(`Total image URLs:     ${totalUrls}`);
for (const [k,v] of Object.entries(byBucket).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k.padEnd(25)} ${v}`);
}
