import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Feed → which DB categories to consider
const FEEDS = {
  'textiles':     ['pillows-throws','furs-pelts'],
  'light':        ['lighting','chandeliers','candlelight'],
  'tableware':    ['tableware','serveware'],
  'large-decor':  ['large-decor','storage'],
  'styling':      ['styling'],
  'lounge-tables':['tables'],
  'dining':       ['tables'],
  'cocktail-bar': ['bars'],
  'rugs':         ['rugs'],
};

// Load all feed items, dedupe by urlId
const itemsById = new Map();
for (const [feed, cats] of Object.entries(FEEDS)) {
  const j = JSON.parse(fs.readFileSync(`/tmp/feeds/${feed}.json`,'utf8'));
  for (const it of (j.items||[])) {
    const gallery = (it.items||[]).map(x=>x.assetUrl).filter(Boolean);
    const hero = it.assetUrl;
    const all = [hero, ...gallery].filter(Boolean);
    const uniq = [...new Set(all)];
    const existing = itemsById.get(it.urlId);
    if (existing) {
      // merge, prefer cat list union
      existing.cats = [...new Set([...existing.cats, ...cats])];
      existing.urls = [...new Set([...existing.urls, ...uniq])];
    } else {
      itemsById.set(it.urlId, {
        urlId: it.urlId, title: it.title, hero, urls: uniq,
        feed, cats, siteCategories: it.categories||[],
      });
    }
  }
}
console.log('Unique site items:', itemsById.size);

// Pull all DB rows
const all=[]; let from=0;
while(true){
  const {data,error} = await sb.from('inventory_items')
    .select('rms_id,title,category,images,slug').neq('status','draft').range(from,from+999);
  if(error) throw error;
  if(!data.length) break;
  all.push(...data); from+=data.length; if(data.length<1000) break;
}
console.log('DB rows:', all.length);

const STOP = new Set(['the','a','an','of','and','with','in','on','for','to','set','pillow','pillows','lumbar','oversize','large','small','bar','bars','table','tables','chair','sofa','lamp','light','lights','rug','throw','pendant','hide','sheepskin','fur','glass','bowl','tray','plate','cup','candle','lantern']);
const tok = s => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(t=>t.length>=2 && !STOP.has(t));

// For matching: index items by feed→token sets
const siteItems = [...itemsById.values()].map(it => ({...it, tokens: new Set(tok(it.title))}));

const result = {
  blanks_HIGH: [], blanks_MED: [], blanks_TIE: [], blanks_NONE: [],
  gallery_HIGH: [], gallery_TIE: [],
};

const usedSiteForApply = new Set(); // prevent assigning same site item twice in HIGH

for (const p of all) {
  const blank = !p.images || p.images.length === 0;
  const ptok = new Set(tok(p.title));
  if (ptok.size === 0) continue;

  // Filter site items whose feed maps to this product's category
  const pool = siteItems.filter(s => s.cats.includes(p.category));
  if (!pool.length) continue;

  const scored = pool.map(s => {
    let score = 0; for (const t of ptok) if (s.tokens.has(t)) score++;
    return {s, score};
  }).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);

  if (!scored.length) {
    if (blank) result.blanks_NONE.push({rms:p.rms_id, title:p.title, cat:p.category});
    continue;
  }
  const top = scored[0];
  const ties = scored.filter(x=>x.score===top.score);

  const rec = {
    rms: p.rms_id, our_title: p.title, cat: p.category,
    site_title: top.s.title, urlId: top.s.urlId,
    hero: top.s.hero, gallery_count: top.s.urls.length,
    urls: top.s.urls, score: top.score,
    current_image_count: (p.images||[]).length,
  };

  if (blank) {
    if (ties.length > 1) {
      rec.tied = ties.map(t=>({title:t.s.title, urlId:t.s.urlId}));
      result.blanks_TIE.push(rec);
    } else if (top.score >= 3) {
      result.blanks_HIGH.push(rec);
    } else {
      result.blanks_MED.push(rec);
    }
  } else {
    // Gallery upgrade: only if site has >1 image and we'd add new URLs
    if (top.s.urls.length <= 1) continue;
    const have = new Set(p.images);
    const newUrls = top.s.urls.filter(u => !have.has(u));
    if (!newUrls.length) continue;
    rec.new_urls = newUrls;
    if (ties.length > 1) {
      rec.tied = ties.map(t=>({title:t.s.title, urlId:t.s.urlId}));
      result.gallery_TIE.push(rec);
    } else if (top.score >= 3) {
      result.gallery_HIGH.push(rec);
    }
  }
}

fs.writeFileSync('/dev-server/scripts-tmp/site-json-rebind.json', JSON.stringify(result, null, 2));

const byCat = (arr) => {
  const m = {};
  for (const r of arr) m[r.cat] = (m[r.cat]||0)+1;
  return m;
};
const summary = [
  '# Squarespace JSON-feed dry-run',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## BLANK fills (products currently with 0 images)',
  `HIGH (apply): ${result.blanks_HIGH.length}   ${JSON.stringify(byCat(result.blanks_HIGH))}`,
  `MED:          ${result.blanks_MED.length}    ${JSON.stringify(byCat(result.blanks_MED))}`,
  `TIE:          ${result.blanks_TIE.length}    ${JSON.stringify(byCat(result.blanks_TIE))}`,
  `NONE:         ${result.blanks_NONE.length}   ${JSON.stringify(byCat(result.blanks_NONE))}`,
  '',
  '## GALLERY upgrades (products that already have ≥1 image)',
  `HIGH (apply): ${result.gallery_HIGH.length}  ${JSON.stringify(byCat(result.gallery_HIGH))}`,
  `TIE:          ${result.gallery_TIE.length}   ${JSON.stringify(byCat(result.gallery_TIE))}`,
  `Total new gallery URLs to add: ${result.gallery_HIGH.reduce((s,r)=>s+r.new_urls.length,0)}`,
  '',
  '## Sample blank HIGH fills:',
  ...result.blanks_HIGH.slice(0,15).map(r=>`  [${r.score}] ${r.cat.padEnd(16)} rms${r.rms} "${r.our_title}" ← "${r.site_title}" (${r.gallery_count} imgs)`),
  '',
  '## NONE (no match):',
  ...result.blanks_NONE.map(r=>`  ${r.cat.padEnd(16)} rms${r.rms} "${r.title}"`),
];
fs.writeFileSync('/dev-server/scripts-tmp/site-json-summary.txt', summary.join('\n'));
console.log(summary.join('\n'));
