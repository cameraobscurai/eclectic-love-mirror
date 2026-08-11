import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const url = 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/incoming-photos/seating/sofa/BROOKLYN%20Sofa%201.png';
const { error } = await sb.from('inventory_items').update({ cover_framed_url: url }).eq('rms_id','1770');
console.log('update', error?.message ?? 'ok');
