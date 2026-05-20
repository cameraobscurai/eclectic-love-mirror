import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const GW='https://connector-gateway.lovable.dev/google_drive/drive/v3';
const H={Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'X-Connection-Api-Key':process.env.GOOGLE_DRIVE_API_KEY};

async function listAAM(){
  const r=await fetch(`${GW}/files?q=${encodeURIComponent(`'1RiRyTB289dR2I_UPHbNZmJURWRgXGzsx' in parents and trashed=false`)}&fields=files(id,name)&pageSize=200`,{headers:H});
  return (await r.json()).files;
}
async function dl(id){
  const r=await fetch(`${GW}/files/${id}?alt=media`,{headers:H});
  if(!r.ok) throw new Error(`dl ${id}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
const files=await listAAM();
console.log(`mirroring ${files.length}`);
let ok=0,fail=0;
for(const f of files){
  try{
    const raw=await dl(f.id);
    let buf=raw;
    if(raw.length>2*1024*1024){
      buf=await sharp(raw,{failOn:'none'}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:85,mozjpeg:true}).toBuffer();
    }
    const name='AAM__'+f.name.replace(/\s+/g,'_').replace(/[^A-Za-z0-9._+-]/g,'_').replace(/\.[^.]+$/,'')+'.jpg';
    const {error}=await sb.storage.from('image-galleries').upload(`BIRCH-DESIGN/${name}`,buf,{contentType:'image/jpeg',upsert:true});
    if(error) throw error;
    ok++;
    process.stdout.write(`.`);
  }catch(e){fail++;console.log('FAIL',f.name,e.message);}
}
console.log(`\nok=${ok} fail=${fail}`);
