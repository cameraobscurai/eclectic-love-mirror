import { readFileSync, writeFileSync } from 'node:fs';
const KEY = process.env.LOVABLE_API_KEY;
const signed = JSON.parse(readFileSync('/tmp/editorial-signed.json','utf8'));
const cls = JSON.parse(readFileSync('/tmp/editorial-classified.json','utf8'));
const urlOf = Object.fromEntries(signed.map(s=>[s.path,s.signedUrl]));
const sketches = Object.entries(cls).filter(([_,c])=>c.bucket==='sketch-concept').map(([p,c])=>({path:p,...c}));
console.log('sketches:', sketches.length);

const SYSTEM = `Sub-classify these illustration/sketch images for an event-rental brand library.
Return JSON array with {subtype, scene} per image, IN ORDER.
- subtype: one of [tablescape-sketch, interior-vignette, single-object-study, mood-collage, floral-arrangement, lighting-study, architectural-detail, figure-portrait, abstract-pattern, other-illustration]
- scene: 4-8 word description (e.g. "low table lounge with candles")
JSON array only.`;

async function batch(items) {
  const content = [{type:'text',text:`Sub-classify these ${items.length} images IN ORDER.`}];
  for (const it of items) content.push({type:'image_url',image_url:{url:urlOf[it.path]}});
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body:JSON.stringify({model:'google/gemini-2.5-flash',messages:[{role:'system',content:SYSTEM},{role:'user',content}]})});
  if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  let t = (await r.json()).choices[0].message.content.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
  return JSON.parse(t);
}

const sub = {};
const B=6;
for (let i=0;i<sketches.length;i+=B) {
  const part=sketches.slice(i,i+B);
  try { const res=await batch(part); part.forEach((p,k)=>sub[p.path]=res[k]||{}); console.log(`  ${i+part.length}/${sketches.length}`); }
  catch(e){ console.log(`  fail ${i}: ${e.message.slice(0,150)}`); }
}
writeFileSync('/tmp/editorial-sub.json', JSON.stringify(sub,null,2));
const counts={};
for (const v of Object.values(sub)) counts[v.subtype||'?']=(counts[v.subtype||'?']||0)+1;
console.log('\nSUB-BUCKETS:\n'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  ${String(v).padStart(3)}  ${k}`).join('\n'));
