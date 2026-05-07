import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const fails = [
  {url:'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/THROWS/PLAID Red + Blue.png', path:'pillows-throws/plaid-red-throw/PLAID Red + Blue.png', ct:'image/png'},
  {url:'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/lounge-tables/relic-limestone-coffee-table/01-RELIC_Limestone_Coffee_Table_0.png', path:'tables/relic-limestone-coffee-table-4099/01-RELIC_Limestone_Coffee_Table_0.png', ct:'image/png'},
];
for (const f of fails) {
  for (let i=1;i<=4;i++) {
    try {
      const r = await fetch(f.url);
      if (!r.ok) throw new Error('http '+r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const {error} = await sb.storage.from('collection').upload(f.path, buf, {contentType:f.ct, upsert:false});
      if (error && !/exists/i.test(error.message)) throw error;
      console.log('OK', f.path, buf.length); break;
    } catch(e) { console.log('try',i,f.path,e.message); await new Promise(r=>setTimeout(r,1500*i)); }
  }
}
