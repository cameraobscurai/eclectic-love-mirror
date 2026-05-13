import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const buf = fs.readFileSync('/tmp/byron.png');
const path = 'inventory/RUGS/BYRON Black Hide Hero.png';
const { error } = await sb.storage.from('inventory').upload(path, buf, { contentType:'image/png', upsert:true });
if (error) { console.error(error); process.exit(1); }
console.log(sb.storage.from('inventory').getPublicUrl(path).data.publicUrl);
