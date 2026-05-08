import { readFileSync, writeFileSync } from 'node:fs';
const KEY = process.env.LOVABLE_API_KEY;
const signed = JSON.parse(readFileSync('/tmp/editorial-signed.json','utf8'));
const cls = JSON.parse(readFileSync('/tmp/editorial-classified.json','utf8'));
const urlOf = Object.fromEntries(signed.map(s=>[s.path,s.signedUrl]));
// re-categorize ALL 128 by furniture/object category to align with the site's collection taxonomy
const all = signed.map(s=>s.path);

const SYSTEM = `You are tagging concept sketches and product renders for a luxury event-rental brand.
For each image, return JSON {category, object, palette, mood} IN ORDER.
- category: ONE of [seating, tables, bars, lighting, chandeliers, candlelight, pillows-throws, rugs, tableware, serveware, styling, large-decor, storage, furs-pelts, interior-scene, brand-graphic, other]
  Map: chair/sofa/bench/stool -> seating. side/coffee/dining table -> tables. bar/bar cart -> bars.
  pendant/floor/table lamp -> lighting. chandelier -> chandeliers. candle/lantern -> candlelight.
  pillow/cushion/throw blanket -> pillows-throws. rug -> rugs. plate/cup/flatware -> tableware.
  platter/tray/serving piece -> serveware. vase/vessel/decor object -> styling. sculpture/large art -> large-decor.
  cabinet/shelf/console with storage -> storage. fur/pelt/hide -> furs-pelts. room scene -> interior-scene.
- object: 2-4 word object name (e.g. "tufted chesterfield sofa")
- palette: comma-separated 1-3 dominant tones
- mood: one word (e.g. "warm", "cool", "neutral", "moody", "bright")
JSON array only.`;

async function batch(paths) {
  const content = [{type:'text',text:`Tag these ${paths.length} images IN ORDER.`}];
  for (const p of paths) content.push({type:'image_url',image_url:{url:urlOf[p]}});
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body:JSON.stringify({model:'google/gemini-2.5-flash',messages:[{role:'system',content:SYSTEM},{role:'user',content}]})});
  if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  let t = (await r.json()).choices[0].message.content.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
  return JSON.parse(t);
}

const out = {};
const B=6;
for (let i=0;i<all.length;i+=B) {
  const part=all.slice(i,i+B);
  try { const res=await batch(part); part.forEach((p,k)=>out[p]=res[k]||{}); console.log(`  ${i+part.length}/${all.length}`); }
  catch(e){ console.log(`  fail ${i}: ${e.message.slice(0,150)}`); part.forEach(p=>out[p]={category:'other'}); }
}

writeFileSync('/tmp/editorial-final.json', JSON.stringify(out,null,2));
const counts={};
for (const v of Object.values(out)) counts[v.category||'?']=(counts[v.category||'?']||0)+1;
console.log('\nCATEGORY COUNTS:');
for (const [k,v] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

// Build CSV + rename plan
const rows=[['original','category','object','palette','mood','proposed_path']];
const used=new Map();
for (const [path,t] of Object.entries(out)) {
  const cat = t.category || 'other';
  const slug = String(t.object||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'item';
  let target = `${cat}/${slug}.png`;
  const n = (used.get(target)||0)+1; used.set(target,n);
  if (n>1) target = `${cat}/${slug}-${n}.png`;
  rows.push([path, cat, t.object||'', t.palette||'', t.mood||'', target]);
}
const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
writeFileSync('/mnt/documents/editorial-classification.csv', csv);
console.log('\nWrote /mnt/documents/editorial-classification.csv');
