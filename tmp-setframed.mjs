import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('inventory_items').select('rms_id,title,slug,images,cover_framed_url').ilike('title','%BROOKLYN%').limit(5);
console.log(JSON.stringify(data,null,1).slice(0,1200));
