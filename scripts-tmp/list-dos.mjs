import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const folder of ['dosmasenlamesalittrell','Gahan']) {
  let all = [], offset = 0;
  while (true) {
    const { data } = await sb.storage.from('image-galleries').list(folder, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`\n== ${folder} (${all.length}) ==`);
  all.forEach(d => console.log(d.name));
}
