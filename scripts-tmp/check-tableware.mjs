import fs from 'node:fs';
const cat = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));
const tw = cat.products.filter(p=>p.categorySlug==='tableware');
const urls = [];
for (const p of tw) for (const i of (p.images||[])) if (i.url) urls.push({slug:p.slug, title:p.title, url:i.url, hero:i.isHero});
console.log('tableware products:', tw.length, 'image refs:', urls.length);

let ok=0, bad=[];
const q=[...urls];
async function w(){ while(q.length){ const j=q.shift(); if(!j)return;
  try{ const r=await fetch(j.url,{method:'HEAD'}); if(r.ok)ok++; else bad.push({...j,status:r.status}); }
  catch(e){ bad.push({...j,err:String(e.message)}); } } }
await Promise.all(Array.from({length:12},w));
console.log('ok:',ok,'bad:',bad.length);
// group bad by hero vs not, by host
const hosts = {}; for (const b of bad){ const h=new URL(b.url).host; hosts[h]=(hosts[h]||0)+1; }
console.log('bad by host:', hosts);
console.log('bad heroes:', bad.filter(b=>b.hero).length);
fs.writeFileSync('/tmp/tableware-bad.json', JSON.stringify(bad,null,2));
console.log('first 15 broken:'); for (const b of bad.slice(0,15)) console.log(' -', b.hero?'HERO':'    ', b.status||b.err, b.slug, '<-', b.url);
