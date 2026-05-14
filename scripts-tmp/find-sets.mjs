import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// list all files in incoming-photos bucket recursively
async function walk(prefix='') {
  const out = [];
  const { data, error } = await sb.storage.from('incoming-photos').list(prefix, { limit: 1000 });
  if (error) { console.error(prefix, error.message); return out; }
  for (const e of data || []) {
    const full = prefix ? `${prefix}/${e.name}` : e.name;
    if (!e.id) { // folder
      const sub = await walk(full);
      out.push(...sub);
    } else {
      out.push(full);
    }
  }
  return out;
}
const files = await walk('');
const sets = files.filter(f => /\bset\b/i.test(f));
console.log('Total files:', files.length);
console.log('Set files:', sets.length);
console.log(sets.slice(0,80).join('\n'));
