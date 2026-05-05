import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r = JSON.parse(fs.readFileSync('scripts-tmp/site-json-rebind.json','utf8'));

let okBlank=0, okGal=0, fail=[];

for (const x of r.blanks_HIGH) {
  // safety: only update if still blank
  const {data: cur, error: e1} = await sb.from('inventory_items').select('rms_id,images').eq('rms_id', x.rms).single();
  if (e1) { fail.push({rms:x.rms,err:e1.message}); continue; }
  if ((cur.images||[]).length > 0) { fail.push({rms:x.rms,skip:'already has images'}); continue; }
  const {error} = await sb.from('inventory_items').update({images: x.urls, updated_at: new Date().toISOString()}).eq('rms_id', x.rms);
  if (error) fail.push({rms:x.rms,err:error.message}); else okBlank++;
}

for (const x of r.gallery_HIGH) {
  const {data: cur, error: e1} = await sb.from('inventory_items').select('rms_id,images').eq('rms_id', x.rms).single();
  if (e1) { fail.push({rms:x.rms,err:e1.message}); continue; }
  const have = new Set(cur.images||[]);
  const append = x.new_urls.filter(u => !have.has(u));
  if (!append.length) continue;
  const merged = [...(cur.images||[]), ...append];
  const {error} = await sb.from('inventory_items').update({images: merged, updated_at: new Date().toISOString()}).eq('rms_id', x.rms);
  if (error) fail.push({rms:x.rms,err:error.message}); else okGal++;
}

console.log('Blank fills applied:', okBlank, '/', r.blanks_HIGH.length);
console.log('Gallery upgrades applied:', okGal, '/', r.gallery_HIGH.length);
console.log('Failures/skips:', fail.length);
fail.slice(0,20).forEach(f=>console.log(' ',JSON.stringify(f)));
fs.writeFileSync('scripts-tmp/site-json-apply-result.json', JSON.stringify({okBlank,okGal,fail},null,2));
