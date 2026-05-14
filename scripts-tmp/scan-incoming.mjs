import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'incoming-photos';

async function listAll(prefix='') {
  const out = [];
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) { console.error(prefix, error.message); return out; }
  for (const item of data || []) {
    if (item.id === null || (!item.metadata && item.name && !item.name.includes('.'))) {
      // folder
      const sub = await listAll(prefix ? `${prefix}/${item.name}` : item.name);
      out.push(...sub);
    } else {
      out.push({ folder: prefix, name: item.name, size: item.metadata?.size ?? 0 });
    }
  }
  return out;
}

const all = await listAll('');
const byFolder = {};
for (const f of all) {
  byFolder[f.folder] = (byFolder[f.folder] || 0) + 1;
}
console.log('Folders:');
for (const [k,v] of Object.entries(byFolder).sort()) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`\nTotal files: ${all.length}`);
console.log('\nSample names per folder:');
for (const folder of Object.keys(byFolder).sort()) {
  const samples = all.filter(f=>f.folder===folder).slice(0,8).map(f=>f.name);
  console.log(`\n[${folder}]`);
  samples.forEach(n=>console.log(`  ${n}`));
}

import { writeFileSync } from 'node:fs';
writeFileSync('/tmp/incoming-files.json', JSON.stringify(all, null, 2));
