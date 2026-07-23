const GW='https://connector-gateway.lovable.dev/google_drive/drive/v3';
const H={Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'X-Connection-Api-Key':process.env.GOOGLE_DRIVE_API_KEY};

async function q(params){
  const u=new URL(`${GW}/files`);
  for(const[k,v]of Object.entries(params)) u.searchParams.set(k,v);
  const r=await fetch(u,{headers:H});
  if(!r.ok){console.error(r.status,await r.text());return{files:[]};}
  return r.json();
}

// 1) All folders shared with me
console.log('=== Shared with me (folders) ===');
let pt;
do{
  const j=await q({
    q:"mimeType='application/vnd.google-apps.folder' and sharedWithMe and trashed=false",
    pageSize:'1000',
    fields:'nextPageToken,files(id,name,owners(emailAddress),modifiedTime)',
    ...(pt?{pageToken:pt}:{})
  });
  for(const f of j.files||[]) console.log(`${f.id}\t${f.modifiedTime?.slice(0,10)}\t${f.owners?.[0]?.emailAddress||''}\t${f.name}`);
  pt=j.nextPageToken;
}while(pt);

console.log('\n=== My Drive root folders ===');
pt=undefined;
do{
  const j=await q({
    q:"mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
    pageSize:'1000',
    fields:'nextPageToken,files(id,name,modifiedTime)',
    ...(pt?{pageToken:pt}:{})
  });
  for(const f of j.files||[]) console.log(`${f.id}\t${f.modifiedTime?.slice(0,10)}\t${f.name}`);
  pt=j.nextPageToken;
}while(pt);
