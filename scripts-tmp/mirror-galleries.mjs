import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';

const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const GW='https://connector-gateway.lovable.dev/google_drive/drive/v3';
const H={Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'X-Connection-Api-Key':process.env.GOOGLE_DRIVE_API_KEY};
const m=JSON.parse(fs.readFileSync('scripts-tmp/drive-manifest.json'));

// Filter rules per folder
const plans={
  'ANGUILLA-MICHELLE-RAGO': f => true,
  'BRUSH-CREEK-LOVE-THIS-DAY': f => f.path.startsWith('Favorites/') || f.path.startsWith('Favorites'),
  'BISHOPS-LODGE-42-NORTH': null, // custom below
  'ENCORE-BOSTON-DIWAN': f => f.path.startsWith('2500px (web size)/'),
  'PRIVATE-RESIDENCE-TX-CINERGY': f => true,
  'BLACKBERRY-FARMS-EASTON': f => !f.path.startsWith('large files/'),
  'FOUR-SEASONS-VAIL-CASSIE-LAMERE': f => true,
  'SAPNA-ARI-FAVORITES?': f => true,
};
// Bishops custom: cocktail+ceremony all, tent 10, friday 5, skip DON'T USE
function bishops(files){
  const cocktail=files.filter(f=>f.path.startsWith('Cocktail_Hour/'));
  const cer=files.filter(f=>f.path.startsWith('Details_-_Ceremony/'));
  const tent=files.filter(f=>f.path.startsWith('Details_-_Tent/')).sort((a,b)=>a.path.localeCompare(b.path)).slice(0,10);
  const fri=files.filter(f=>f.path.startsWith('Friday_-_Details/')).sort((a,b)=>a.path.localeCompare(b.path)).slice(0,5);
  return [...cocktail,...cer,...tent,...fri];
}
// Target bucket key map (rename SAPNA-ARI-FAVORITES? → BRUSH-CREEK-DIWAN)
const bucketKey={'SAPNA-ARI-FAVORITES?':'BRUSH-CREEK-DIWAN'};

const flatten = p => p.replace(/\//g,'__').replace(/[^A-Za-z0-9._-]/g,'_');

async function download(id){
  const r=await fetch(`${GW}/files/${id}?alt=media`,{headers:H});
  if(!r.ok) throw new Error(`download ${id}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function processBuf(buf,doResize){
  if(!doResize && buf.length<=8*1024*1024) return {buf,ext:'jpg',ct:'image/jpeg'};
  // Always re-encode jpeg, resize if needed
  const img=sharp(buf,{failOn:'none'}).rotate();
  const meta=await img.metadata();
  const max=2400;
  let pipe=img;
  if((meta.width||0)>max||(meta.height||0)>max) pipe=pipe.resize({width:max,height:max,fit:'inside',withoutEnlargement:true});
  const out=await pipe.jpeg({quality:85,mozjpeg:true}).toBuffer();
  return {buf:out,ext:'jpg',ct:'image/jpeg'};
}

const SUMMARY={};
for(const[srcKey,filterFn]of Object.entries(plans)){
  const all=m[srcKey];
  const picked= srcKey==='BISHOPS-LODGE-42-NORTH'?bishops(all):all.filter(filterFn);
  const dstKey=bucketKey[srcKey]||srcKey;
  const doResize = srcKey==='FOUR-SEASONS-VAIL-CASSIE-LAMERE';
  console.log(`\n[${dstKey}] ${picked.length} files (resize=${doResize})`);
  let ok=0,fail=0; const errs=[];
  // 4 concurrent
  const queue=[...picked];
  async function worker(){
    while(queue.length){
      const f=queue.shift();
      try{
        const raw=await download(f.id);
        const {buf,ext,ct}=await processBuf(raw,doResize);
        const name=flatten(f.path).replace(/\.[^.]+$/,'')+'.'+ext;
        const {error}=await sb.storage.from('image-galleries').upload(`${dstKey}/${name}`,buf,{contentType:ct,upsert:true});
        if(error) throw error;
        ok++;
        if(ok%10===0) console.log(`  ${ok}/${picked.length}`);
      }catch(e){fail++;errs.push(f.path+': '+e.message);}
    }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
  console.log(`  done: ${ok} ok, ${fail} fail`);
  if(errs.length)console.log('  errors:',errs.slice(0,5));
  SUMMARY[dstKey]={requested:picked.length,ok,fail};
}
fs.writeFileSync('scripts-tmp/mirror-summary.json',JSON.stringify(SUMMARY,null,2));
console.log('\nDONE',SUMMARY);
