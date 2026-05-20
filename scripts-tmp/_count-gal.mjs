import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const folders = ['AMANGIRI','ANGUILLA-MICHELLE-RAGO','ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH','BIRCH-DESIGN','BISHOPS-LODGE-42-NORTH','BLACKBERRY-FARMS-EASTON','BRUSH-CREEK-DIWAN','BRUSH-CREEK-LOVE-THIS-DAY','dosmasenlamesalittrell','EASTON-DUNTON-DOS-MAS','EASTON-EVENTS-MONTANA','ENCORE-BOSTON-DIWAN','FOUR-SEASONS-VAIL-CASSIE-LAMERE','JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS','LYNDEN-LANE','PRIVATE-RESIDENCE-TX-CINERGY'];
async function walk(prefix) {
  let n=0, sub=[];
  let offset=0;
  while(true){
    const {data,error}=await sb.storage.from('image-galleries').list(prefix,{limit:1000,offset});
    if(error){console.error(prefix,error);break;}
    if(!data||!data.length)break;
    for(const f of data){
      if(!f.id && !f.metadata){ sub.push(prefix+'/'+f.name); }
      else n++;
    }
    if(data.length<1000)break; offset+=1000;
  }
  for(const s of sub){ n += await walk(s); }
  return n;
}
for(const f of folders){
  const n = await walk(f);
  console.log(`${n}\t${f}`);
}
