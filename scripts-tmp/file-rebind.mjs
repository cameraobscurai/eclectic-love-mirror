import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Map storage folder -> category slug
const FOLDER = {
  BARS:'bars', PILLOWS:'pillows-throws', THROWS:'pillows-throws',
  TABLES:'tables', SEATING:'seating', LIGHTING:'lighting',
  CHANDELIERS:'chandeliers', CANDLELIGHT:'candlelight',
  TABLEWARE:'tableware', SERVEWARE:'serveware', RUGS:'rugs',
  STYLING:'styling', STORAGE:'storage', 'LARGE-DECOR':'large-decor',
  'FURS-PELTS':'furs-pelts',
};

// list all files in inventory/<FOLDER>/...
const files = [];
let off=0;
while(true){
  const { data, error } = await sb.storage.from('inventory').list('inventory', { limit: 1000, offset: off });
  if(error) throw error;
  if(!data.length) break;
  for(const f of data){
    if(f.id) continue; // skip files at root
    // it's a folder
    let foff=0;
    while(true){
      const r = await sb.storage.from('inventory').list(`inventory/${f.name}`, { limit: 1000, offset: foff });
      if(r.error) throw r.error;
      if(!r.data.length) break;
      for(const x of r.data){
        if(!x.name.match(/\.(png|jpg|jpeg|webp|avif)$/i)) continue;
        files.push({ folder: f.name, file: x.name, path: `inventory/${f.name}/${x.name}` });
      }
      foff += r.data.length; if(r.data.length<1000) break;
    }
  }
  off += data.length; if(data.length<1000) break;
}
console.log('storage files:', files.length);

// fetch all products
const all=[]; let from=0;
while(true){
  const {data,error}=await sb.from('inventory_items')
    .select('rms_id,title,category,images').neq('status','draft').range(from,from+999);
  if(error) throw error;
  if(!data.length) break; all.push(...data); from+=data.length; if(data.length<1000) break;
}

const STOP = new Set(['the','a','an','of','and','with','pillow','lumbar','oversize','large','small','set','bar','bars','table','chair','sofa','lamp','light']);
const tokens = s => s.toLowerCase().replace(/\.[a-z]+$/,'').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(t=>t&&!STOP.has(t));

const URL_BASE = 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/';

// Index existing usage of each path
const pathUsage = new Map();
for(const p of all){
  for(const u of (p.images||[])){
    const m = u.split('/storage/v1/object/public/inventory/')[1];
    if(m) (pathUsage.get(m)||pathUsage.set(m,[]).get(m)).push(p);
  }
}

const proposals = [];
for(const f of files){
  const cat = FOLDER[f.folder]; if(!cat) continue;
  const fileTokens = new Set(tokens(f.file));
  const candidates = all.filter(p=>p.category===cat);
  // score
  const scored = candidates.map(p=>{
    const t = new Set(tokens(p.title));
    let s=0; for(const x of fileTokens) if(t.has(x)) s++;
    return { p, score: s, titleTokens: t };
  }).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
  if(!scored.length) continue;
  const best = scored[0];
  // require best is meaningfully better than 2nd
  if(scored.length>1 && scored[1].score===best.score){
    // tie — require best title length similar to file
    const tieTitles = scored.filter(x=>x.score===best.score).map(x=>x.p.title);
    proposals.push({ file:f.path, cat, status:'TIE', best_score:best.score, ties:tieTitles });
    continue;
  }
  const currentHero = (best.p.images?.[0]||'').split('/storage/v1/object/public/inventory/')[1];
  if(currentHero === f.path){
    continue; // already correct
  }
  // Is the file used by any other product?
  const usedBy = pathUsage.get(f.path) || [];
  const usedByOther = usedBy.filter(x=>x.rms_id !== best.p.rms_id);
  proposals.push({
    file: f.path, cat, score: best.score,
    suggest_rms: best.p.rms_id, suggest_title: best.p.title,
    current_hero_path: currentHero || null,
    file_already_used_by_other_products: usedByOther.map(x=>({rms:x.rms_id,title:x.title})),
  });
}

const fixes = proposals.filter(x=>x.status!=='TIE');
const ties = proposals.filter(x=>x.status==='TIE');
fs.writeFileSync('/dev-server/scripts-tmp/file-rebind-proposals.json', JSON.stringify({fixes, ties}, null, 2));
console.log('proposals:', fixes.length, 'ties:', ties.length);
console.log('Sample fixes:');
for(const f of fixes.slice(0,15)) console.log(' ', f.file, '→', f.suggest_rms, f.suggest_title, '(score', f.score+')');
