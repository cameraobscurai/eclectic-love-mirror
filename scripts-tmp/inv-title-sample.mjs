import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('inventory_items').select('title,category').neq('status','draft').order('category').order('title');
const byCat = {};
for (const r of data) (byCat[r.category] ??= []).push(r.title);
for (const [c, arr] of Object.entries(byCat)) {
  console.log(`\n[${c}] (${arr.length})`);
  arr.slice(0, 25).forEach(t => console.log(`  ${t}`));
  if (arr.length > 25) console.log(`  ...+${arr.length-25} more`);
}
