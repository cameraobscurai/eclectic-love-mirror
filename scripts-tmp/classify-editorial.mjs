import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const KEY = process.env.LOVABLE_API_KEY;
const signed = JSON.parse(readFileSync('/tmp/editorial-signed.json','utf8'));
const out = existsSync('/tmp/editorial-classified.json')
  ? JSON.parse(readFileSync('/tmp/editorial-classified.json','utf8')) : {};

const SYSTEM = `You are an art director helping organize a luxury event-rental brand's editorial image library.
For each image, return JSON: {bucket, slug, caption, palette}.
- bucket: one of [sketch-concept, product-cutout, product-styled, interior-scene, mood-texture, table-scape, floral-botanical, lighting-detail, brand-graphic, person-portrait, other]. Pick the BEST single fit.
- slug: 3-6 word kebab-case descriptive filename (no extension). e.g. "linen-napkin-stack-warm".
- caption: one sentence, <=15 words, neutral.
- palette: 1-3 dominant tones (e.g. "ivory, charcoal, brass").
Respond with ONLY a JSON array, one object per image in order.`;

async function classifyBatch(items) {
  const content = [{ type: 'text', text: `Classify these ${items.length} images IN ORDER. Respond with a JSON array of ${items.length} objects.` }];
  for (const it of items) content.push({ type: 'image_url', image_url: { url: it.signedUrl } });
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content },
      ],
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  let txt = j.choices[0].message.content.trim();
  txt = txt.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
  return JSON.parse(txt);
}

const todo = signed.filter(s => !out[s.path]);
console.log('to classify:', todo.length, '/ already done:', Object.keys(out).length);

const BATCH = 6;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  try {
    const res = await classifyBatch(batch);
    batch.forEach((b, k) => { out[b.path] = res[k] || { error: 'no result' }; });
    writeFileSync('/tmp/editorial-classified.json', JSON.stringify(out, null, 2));
    console.log(`  done ${i + batch.length}/${todo.length}`);
  } catch (e) {
    console.log(`  batch ${i} failed: ${e.message.slice(0,200)}`);
    await new Promise(r => setTimeout(r, 2000));
  }
}
console.log('TOTAL classified:', Object.keys(out).length);
