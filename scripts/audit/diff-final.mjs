// Real diff using src/lib/collection-parents.ts logic (mirrored).
// This is the runtime classifier the actual UI uses.
import { readFileSync, writeFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('scripts/audit/live-subcategory-map.json','utf8'));
const cat  = JSON.parse(readFileSync('src/data/inventory/current_catalog.json','utf8'));
let items=[]; for (const k of Object.keys(cat)) if (Array.isArray(cat[k])) items=items.concat(cat[k]);

const has = (t, kws) => kws.some(k => t.includes(k));

// Mirror productParent + classifySub from collection-parents.ts
function classify(p) {
  const t = (p.title||'').toLowerCase();
  const cat = (p.categorySlug||'').toLowerCase();
  // Determine parent
  let parent = null;
  if (cat==='seating' || cat==='lounge') parent='lounge-seating';
  else if (cat==='tables' || cat==='lounge-tables') {
    if (has(t,['cocktail table','column','plinth'])) parent='cocktail-bar';
    else parent='lounge-tables';
  }
  else if (cat==='bars' || cat==='cocktail-bar' || cat==='storage') parent='cocktail-bar';
  else if (cat==='tableware' || cat==='serveware') parent='tableware';
  else if (cat==='lighting' || cat==='chandeliers' || cat==='candlelight') parent='lighting';
  else if (cat==='pillows-throws' || cat==='textiles') parent='textiles';
  else if (cat==='rugs') parent='rugs';
  else if (cat==='styling' || cat==='furs-pelts') parent='styling';
  else if (cat==='large-decor') parent='large-decor';

  let sub=null;
  switch (parent) {
    case 'lounge-seating':
      if (has(t,['sofa','loveseat','settee','couch'])) sub='sofas-loveseats';
      else if (has(t,['ottoman','pouf','footstool'])) sub='ottomans';
      else if (has(t,['bench','daybed'])) sub='benches';
      else if (has(t,['armchair','lounge chair','chair'])) sub='chairs';
      break;
    case 'lounge-tables':
      if (has(t,['coffee table'])) sub='coffee-tables';
      else if (has(t,['side table','end table','accent table','drink table'])) sub='side-tables';
      else if (has(t,['console','entry table','sofa table'])) sub='consoles';
      break;
    case 'cocktail-bar':
      if (has(t,['cocktail table','column','plinth'])) sub='cocktail-tables';
      else if (has(t,['barstool','stool'])) sub='stools';
      else if (has(t,['community table','long table','counter table'])) sub='community-tables';
      else if (cat==='storage' || has(t,['cabinet','credenza','sideboard','shelf','shelving','etagere'])) sub='storage';
      else if (has(t,['back bar','backbar','bar cart','bar'])) sub='bars';
      break;
    case 'large-decor':
      if (has(t,['arch','arbor','wall','structure','canopy'])) sub='structures';
      else if (has(t,['mirror'])) sub='walls';
      else sub='other';
      break;
    case 'tableware':
      if (has(t,['platter','pitcher','tureen','server','tray'])) sub='serveware';
      else if (cat==='serveware') sub='serveware';
      else if (has(t,['glass','flute','goblet','tumbler','coupe','rocks','wine','champagne'])) sub='glassware';
      else if (has(t,['fork','knife','spoon','flatware','setting'])) sub='flatware';
      else sub='dinnerware';
      break;
    case 'textiles':
      if (has(t,['throw','blanket'])) sub='throws';
      else if (has(t,['pillow','lumbar'])) sub='pillows';
      break;
    case 'rugs': sub='rugs'; break;
  }
  return { parent, sub };
}

// Live → ours equivalence (using actual sub IDs from collection-parents.ts)
const EQUIV = {
  'Sofas & Loveseats':'sofas-loveseats','Benches':'benches','Ottomans':'ottomans',
  'Chairs':'chairs','Dining Chairs':'chairs','Stools':'stools',
  'Coffee Tables':'coffee-tables','Cocktail Tables':'cocktail-tables','Side Tables':'side-tables','Consoles':'consoles',
  'Dining Tables':'dining-tables','Community Tables':'community-tables',
  'Bars':'bars','Storage':'storage',
  'Walls':'walls','Structures':'structures','Other':'other',
  'Pillows':'pillows','Throws':'throws','Rugs':'rugs',
  'Dinnerware':'dinnerware','Flatware':'flatware','Glassware':'glassware','Serveware':'serveware',
  'Chandeliers':null,'Lamps':null,'Candlelight':null,'Specialty':null,
  'Accents':null,'Crates & Baskets':null,
};

const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const TOK = { glassware:'glass', glasses:'glass', pillows:'pillow', throws:'throw' };
const toks = s => norm(s).split(' ').filter(t=>t.length>=3).map(t=>TOK[t]||t);
const catBySlug = new Map(items.map(p=>[p.slug,p]));
const catByTokens = items.map(p=>({p, tokens: new Set(toks(p.title))}));

const mismatches=[]; let missing=0, ok=0;
for (const [liveSlug, info] of Object.entries(live.byLiveSlug)) {
  let our = catBySlug.get(liveSlug);
  if (!our) {
    const lt=new Set(toks(info.title)); let best=null,bs=0;
    for (const c of catByTokens) {
      let inter=0; for (const t of lt) if (c.tokens.has(t)) inter++;
      const s=inter/Math.max(lt.size,1);
      if (s>bs) { bs=s; best=c.p; }
    }
    if (best && bs>=0.6) our=best;
  }
  if (!our) { missing++; continue; }
  const { sub } = classify(our);
  const expected = info.subcategories.map(s => EQUIV[s]).filter(x => x !== undefined);
  if (expected.length===0 || expected.includes(null)) { ok++; continue; }
  if (expected.includes(sub)) { ok++; continue; }
  mismatches.push({ title: info.liveTitle || info.title, live: info.subcategories.join('|'), expected: expected.join('|'), got: sub });
}
console.log(`matched: ${ok+mismatches.length}, missing-from-catalog: ${missing}, TRUE mismatches: ${mismatches.length}`);
for (const m of mismatches) console.log(`  · ${m.title.padEnd(45)} live=${m.live.padEnd(20)} expected=${m.expected.padEnd(18)} got=${m.got||'(none)'}`);
writeFileSync('scripts/audit/live-vs-runtime-final.json', JSON.stringify({mismatches, missingCount: missing}, null, 2));
