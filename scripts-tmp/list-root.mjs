import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.storage.from('image-galleries').list('', { limit: 1000 });
data.forEach(d => console.log(d.name));
