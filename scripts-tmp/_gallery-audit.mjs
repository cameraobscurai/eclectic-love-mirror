import {createClient} from '@supabase/supabase-js';
import fs from 'fs';
const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const GW='https://connector-gateway.lovable.dev/google_drive/drive/v3';
const H={Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'X-Connection-Api-Key':process.env.GOOGLE_DRIVE_API_KEY};

// List everything under image-galleries recursively
async function listBucket(prefix=''){
  let out=[]; let offset=0;
  while(true){
    const {data,error}=await sb.storage.from('image-galleries').list(prefix,{limit:1000,offset});
    if(error){console.error('bucket err',prefix,error.message);break;}
    if(!data||!data.length)break;
    for(const f of data){
      const p=prefix?`${prefix}/${f.name}`:f.name;
      if(!f.id && !f.metadata) out.push(...await listBucket(p));
      else out.push({path:p,size:f.metadata?.size||0});
    }
    if(data.length<1000)break; offset+=1000;
  }
  return out;
}

// List Drive folder recursively (images only)
async function driveList(folderId,prefix=''){
  let out=[]; let pageToken;
  do{
    const u=new URL(`${GW}/files`);
    u.searchParams.set('q',`'${folderId}' in parents and trashed=false`);
    u.searchParams.set('pageSize','1000');
    u.searchParams.set('fields','nextPageToken,files(id,name,mimeType,size)');
    if(pageToken)u.searchParams.set('pageToken',pageToken);
    const r=await fetch(u,{headers:H}); const j=await r.json();
    for(const it of j.files||[]){
      if(it.mimeType==='application/vnd.google-apps.folder'){
        out.push(...await driveList(it.id,`${prefix}${it.name}/`));
      } else if(it.mimeType?.startsWith('image/')){
        out.push({path:prefix+it.name,size:+it.size||0});
      }
    }
    pageToken=j.nextPageToken;
  }while(pageToken);
  return out;
}

// Drive folders we know
const drive={
  'ANGUILLA-MICHELLE-RAGO':'1uf6Jnudsmxbg1ZKIYRlj9hAUaToNdIwI',
  'BRUSH-CREEK-LOVE-THIS-DAY':'1fobgLxiQhmdEl32o3qUpQXdcby4OHs7H',
  'BISHOPS-LODGE-42-NORTH':'1EydZKUwhizn2QsT_iIf9hhkM0UOI2_5v',
  'ENCORE-BOSTON-DIWAN':'1dijqZUe-VQAG6-zfPWZhYzZWL2NFHggn',
  'PRIVATE-RESIDENCE-TX-CINERGY':'1gdM8aLXQw-xg0W2ohOLvh1DIOvrnFxpc',
  'BLACKBERRY-FARMS-EASTON':'1WmGarbbhHZJkmehbO2O5vdH9xRzJL4eF',
  'FOUR-SEASONS-VAIL-CASSIE-LAMERE':'1kPyD50POgwevNACDO9zJjksSLr6JQ6jF',
  'BRUSH-CREEK-DIWAN':'1m6O9PufBFIW9pzRRr2R4niuMX3CeP0tz',
};

const bucket = await listBucket();
const byFolder={};
for(const f of bucket){
  const top=f.path.split('/')[0];
  (byFolder[top]=byFolder[top]||[]).push(f);
}

// Read gallery-orders overrides
const {data:orders} = await sb.from('gallery_orders').select('gallery_slug,order_keys');
const ordersBySlug={};
for(const o of orders||[]) ordersBySlug[o.gallery_slug]=o.order_keys?.length||0;

const report=[];
report.push('# Gallery Audit — Drive vs Bucket\n');
report.push(`Generated: ${new Date().toISOString()}\n`);
report.push(`\nBucket folders: ${Object.keys(byFolder).length}\n`);
report.push(`Gallery order overrides in DB: ${Object.keys(ordersBySlug).length}\n\n`);

report.push('## Per-folder (bucket vs Drive)\n');
report.push('| Folder | Bucket count | Drive count | Diff (Drive-Bucket) | Orders override? |');
report.push('|---|---:|---:|---:|:-:|');
const rows=[];
for(const key of Object.keys(drive)){
  const drv = await driveList(drive[key]);
  const buck = byFolder[key]||[];
  const bucketNames = new Set(buck.map(b=>b.path.split('/').slice(1).join('/').toLowerCase()));
  // Which Drive images look like they are NOT already mirrored
  const missing=[];
  for(const d of drv){
    const flat=d.path.replace(/\//g,'__').replace(/[^A-Za-z0-9._-]/g,'_').toLowerCase().replace(/\.[^.]+$/,'');
    const hit=[...bucketNames].some(bn=>bn.replace(/\.[^.]+$/,'').includes(flat)||flat.includes(bn.replace(/\.[^.]+$/,'')));
    if(!hit) missing.push(d.path);
  }
  rows.push({key,bucket:buck.length,drive:drv.length,diff:drv.length-buck.length,missing,ord:ordersBySlug});
  report.push(`| ${key} | ${buck.length} | ${drv.length} | ${drv.length-buck.length} | ? |`);
}

report.push('\n## Notable Drive extras not currently mirrored (sample up to 10 per folder)\n');
for(const r of rows){
  if(!r.missing.length) continue;
  report.push(`\n### ${r.key} — ${r.missing.length} extras`);
  for(const m of r.missing.slice(0,10)) report.push(`- ${m}`);
  if(r.missing.length>10) report.push(`- …+${r.missing.length-10} more`);
}

report.push('\n## Bucket-only folders (not in Drive-checked set)\n');
for(const k of Object.keys(byFolder)){
  if(!drive[k]) report.push(`- ${k} (${byFolder[k].length} files)`);
}

fs.writeFileSync('/tmp/gallery-audit.md',report.join('\n'));
fs.writeFileSync('/tmp/gallery-audit.json',JSON.stringify({rows,ordersBySlug},null,2));
console.log('wrote /tmp/gallery-audit.md');
