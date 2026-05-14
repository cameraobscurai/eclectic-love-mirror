import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const b of ['adonisglassware','donavertortoiseflatware','sageglassware']) {
  const { data } = await sb.storage.from(b).list('', { limit: 100 });
  console.log('\n=='+b+'==');
  data.forEach(d => console.log(d.name));
}
