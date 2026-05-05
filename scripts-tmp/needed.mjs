import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const all = [];
let from=0;
while(true){
  const {data,error} = await sb.from('inventory_items')
    .select('rms_id,title,slug,category,quantity,quantity_label,dimensions_raw,images')
    .neq('status','draft').range(from,from+999).order('category').order('title');
  if(error)throw error;
  if(!data.length)break;
  all.push(...data); from+=data.length;
  if(data.length<1000)break;
}
const missing = all.filter(r=>!Array.isArray(r.images)||r.images.length===0);
const byCat = {};
for(const r of missing){
  (byCat[r.category]=byCat[r.category]||[]).push(r);
}
let md = `# IMAGES NEEDED — ACTION REPORT\n\nGenerated ${new Date().toISOString()}\n\n`;
md += `**${missing.length} products** across **${Object.keys(byCat).length} categories** are hidden from the live collection until owner-supplied photos arrive.\n\n`;
md += `## Summary\n\n| Category | Missing | Total | Live |\n|---|---:|---:|---:|\n`;
const totals = {};
for(const r of all)(totals[r.category]=totals[r.category]||{t:0,m:0}).t++;
for(const r of missing)totals[r.category].m++;
for(const c of Object.keys(totals).sort()){
  const {t,m}=totals[c]; md += `| ${c} | ${m} | ${t} | ${t-m} |\n`;
}
md += `\n---\n\n## By Category\n`;
const csvRows = [['rms_id','title','category','quantity','dimensions','suggested_filename']];
for(const c of Object.keys(byCat).sort()){
  md += `\n### ${c} — ${byCat[c].length} needed\n\n| RMS | Title | Qty | Dimensions |\n|---|---|---|---|\n`;
  for(const r of byCat[c].sort((a,b)=>a.title.localeCompare(b.title))){
    const stock = r.quantity_label ?? (r.quantity!=null?String(r.quantity):'');
    md += `| ${r.rms_id} | ${r.title} | ${stock} | ${r.dimensions_raw||''} |\n`;
    const safeName = r.title.replace(/[\\/:*?"<>|]/g,'').trim();
    csvRows.push([r.rms_id,r.title,c,stock,r.dimensions_raw||'',`${c.toUpperCase()}/${safeName}.jpg`]);
  }
}
fs.writeFileSync('/mnt/documents/images-needed.md', md);
fs.writeFileSync('/mnt/documents/images-needed.csv', csvRows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'));
console.log('wrote', missing.length, 'rows');
