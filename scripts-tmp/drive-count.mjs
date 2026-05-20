const GW='https://connector-gateway.lovable.dev/google_drive/drive/v3';
const H={Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'X-Connection-Api-Key':process.env.GOOGLE_DRIVE_API_KEY};
async function listAll(folderId){
  let files=[],pageToken;
  do{
    const u=new URL(`${GW}/files`);
    u.searchParams.set('q',`'${folderId}' in parents and trashed=false`);
    u.searchParams.set('pageSize','1000');
    u.searchParams.set('fields','nextPageToken,files(id,name,mimeType,size)');
    if(pageToken)u.searchParams.set('pageToken',pageToken);
    const r=await fetch(u,{headers:H}); const j=await r.json();
    files.push(...(j.files||[])); pageToken=j.nextPageToken;
  }while(pageToken);
  return files;
}
async function walk(folderId,prefix=''){
  const out=[]; const items=await listAll(folderId);
  for(const it of items){
    if(it.mimeType==='application/vnd.google-apps.folder'){
      out.push(...await walk(it.id,`${prefix}${it.name}/`));
    } else if(it.mimeType?.startsWith('image/')) {
      out.push({path:prefix+it.name,id:it.id,size:+it.size||0,mime:it.mimeType});
    }
  }
  return out;
}
const targets={
  'ANGUILLA-MICHELLE-RAGO':'1uf6Jnudsmxbg1ZKIYRlj9hAUaToNdIwI',
  'BRUSH-CREEK-LOVE-THIS-DAY':'1fobgLxiQhmdEl32o3qUpQXdcby4OHs7H',
  'BISHOPS-LODGE-42-NORTH':'1EydZKUwhizn2QsT_iIf9hhkM0UOI2_5v',
  'ENCORE-BOSTON-DIWAN':'1dijqZUe-VQAG6-zfPWZhYzZWL2NFHggn',
  'PRIVATE-RESIDENCE-TX-CINERGY':'1gdM8aLXQw-xg0W2ohOLvh1DIOvrnFxpc',
  'BLACKBERRY-FARMS-EASTON':'1WmGarbbhHZJkmehbO2O5vdH9xRzJL4eF',
  'FOUR-SEASONS-VAIL-CASSIE-LAMERE':'1kPyD50POgwevNACDO9zJjksSLr6JQ6jF',
  'SAPNA-ARI-FAVORITES?':'1m6O9PufBFIW9pzRRr2R4niuMX3CeP0tz',
};
import fs from 'fs';
const all={};
for(const[k,id]of Object.entries(targets)){
  const f=await walk(id);
  all[k]=f;
  const mb=(f.reduce((s,x)=>s+x.size,0)/1e6).toFixed(1);
  console.log(`${k}: ${f.length} images, ${mb} MB`);
}
fs.writeFileSync('scripts-tmp/drive-manifest.json',JSON.stringify(all,null,2));
