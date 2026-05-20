import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function walk(prefix, out=[]) {
  let offset=0;
  while(true){
    const {data}=await sb.storage.from('image-galleries').list(prefix,{limit:1000,offset});
    if(!data||!data.length)break;
    for(const f of data){
      const p = prefix?`${prefix}/${f.name}`:f.name;
      if(!f.id && !f.metadata) await walk(p,out);
      else out.push(p);
    }
    if(data.length<1000)break; offset+=1000;
  }
  return out;
}
for (const folder of ['BIRCH-DESIGN','BRUSH-CREEK-DIWAN','ENCORE-BOSTON-DIWAN','ANGUILLA-MICHELLE-RAGO','BRUSH-CREEK-LOVE-THIS-DAY','BISHOPS-LODGE-42-NORTH','PRIVATE-RESIDENCE-TX-CINERGY','BLACKBERRY-FARMS-EASTON','FOUR-SEASONS-VAIL-CASSIE-LAMERE']) {
  const files = await walk(folder);
  console.log(`\n== ${folder} (${files.length}) ==`);
  files.forEach(f=>console.log(' ',f));
}
