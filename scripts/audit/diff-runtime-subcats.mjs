// Real diff: compare LIVE subcategory tag vs our runtime keyword-derived subcategory.
import { readFileSync, writeFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('scripts/audit/live-subcategory-map.json','utf8'));
const cat  = JSON.parse(readFileSync('src/data/inventory/current_catalog.json','utf8'));
let items=[]; for (const k of Object.keys(cat)) if (Array.isArray(cat[k])) items=items.concat(cat[k]);

// Mirror src/lib/collection-subcategories.ts SUBCATEGORY_RULES
const RULES = {
  "lounge-seating": [
    { id: "sofas", kws: ["sofa","loveseat","settee","couch","banquette"] },
    { id: "benches", kws: ["bench","daybed"] },
    { id: "ottomans", kws: ["ottoman","pouf","footstool"] },
    { id: "stools", kws: ["barstool","stool"] },
    { id: "chairs", kws: ["armchair","lounge chair","chair"] },
  ],
  tables: [
    { id: "dining-tables", kws: ["dining table","farm table","community table","counter table"] },
    { id: "highboys", kws: ["highboy"] },
    { id: "consoles", kws: ["console","entry table","sofa table"] },
    { id: "coffee-tables", kws: ["coffee table","cocktail table","column","plinth"] },
    { id: "side-tables", kws: ["side table","end table","accent table","drink table"] },
  ],
  "cocktail-bar": [
    { id: "back-bars", kws: ["back bar","backbar","bar shelving","shelving","shelf","cabinet","credenza","sideboard","etagere"] },
    { id: "bars", kws: ["bar"] },
  ],
  "large-decor": [
    { id: "screens", kws: ["screen","divider","partition"] },
    { id: "fireplaces", kws: ["fireplace","firepit","chiminea"] },
    { id: "planters", kws: ["planter","pot","urn"] },
    { id: "mirrors", kws: ["mirror"] },
    { id: "structures", kws: ["arch","arbor","wall","structure","canopy"] },
  ],
  lighting: [
    { id: "floor-lamps", kws: ["floor lamp","standing lamp"] },
    { id: "table-lamps", kws: ["table lamp","desk lamp"] },
    { id: "sconces", kws: ["sconce","wall lamp"] },
  ],
};
function deriveSub(p) {
  // Map our top-level categorySlug to the rule key
  const groupMap = { seating: 'lounge-seating', tables: 'tables', bars: 'cocktail-bar', 'large-decor': 'large-decor', lighting: 'lighting' };
  const k = groupMap[p.categorySlug] || p.categorySlug;
  const rules = RULES[k]; if (!rules) return null;
  const t = (p.title||'').toLowerCase();
  for (const r of rules) if (r.kws.some(kw => t.includes(kw))) return r.id;
  return null;
}

// Live-sub → our-sub equivalence
const EQUIV = {
  'Sofas & Loveseats': 'sofas',
  'Benches': 'benches',
  'Ottomans': 'ottomans',
  'Chairs': 'chairs',
  'Dining Chairs': 'chairs',          // we lump
  'Stools': 'stools',
  'Coffee Tables': 'coffee-tables',
  'Cocktail Tables': 'coffee-tables',
  'Side Tables': 'side-tables',
  'Consoles': 'consoles',
  'Dining Tables': 'dining-tables',
  'Community Tables': 'dining-tables',
  'Bars': 'bars',
  'Storage': 'bars',                  // bars-category storage; UI has no separate sub
  'Walls': 'structures',
  'Structures': 'structures',
  'Other': null,                      // no equiv
  'Chandeliers': null,
  'Lamps': null,
  'Candlelight': null,
  'Specialty': null,
  'Accents': null,
  'Crates & Baskets': null,
  'Pillows': null, 'Throws': null, 'Rugs': null,
  'Dinnerware': null, 'Flatware': null, 'Glassware': null, 'Serveware': null,
};

const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const TOK_CANON = { glassware:'glass', glasses:'glass', pillows:'pillow', throws:'throw' };
const toks = s => norm(s).split(' ').filter(t=>t.length>=3).map(t=>TOK_CANON[t]||t);

const catBySlug = new Map(items.map(p=>[p.slug,p]));
const catByTokens = items.map(p=>({p, tokens: new Set(toks(p.title))}));

const rows = [];
for (const [liveSlug, info] of Object.entries(live.byLiveSlug)) {
  let our = catBySlug.get(liveSlug); let how='slug';
  if (!our) {
    const lt = new Set(toks(info.title));
    let best=null, bestScore=0;
    for (const c of catByTokens) {
      let inter=0; for (const t of lt) if (c.tokens.has(t)) inter++;
      const s = inter/Math.max(lt.size,1);
      if (s>bestScore) { bestScore=s; best=c.p; }
    }
    if (best && bestScore>=0.6) { our=best; how='fuzzy'; }
  }
  rows.push({ liveSlug, liveTitle: info.title, liveSubs: info.subcategories, ourSlug: our?.slug, ourTitle: our?.title, ourCat: our?.categorySlug, derivedSub: our?deriveSub(our):null, how });
}

const trueMismatches = [];
for (const r of rows) {
  if (!r.ourSlug) continue;
  // Determine the equivalent expected sub from any live sub
  const expectedSubs = r.liveSubs.map(s => EQUIV[s]).filter(x => x !== undefined);
  if (expectedSubs.length === 0) continue;             // no rule applies
  if (expectedSubs.includes(null)) continue;           // live sub has no analog in our taxonomy
  if (expectedSubs.includes(r.derivedSub)) continue;   // match
  trueMismatches.push({
    title: r.liveTitle, live: r.liveSubs.join('|'), expected: expectedSubs.join('|'), got: r.derivedSub, ourCat: r.ourCat,
  });
}
const missing = rows.filter(r => !r.ourSlug);

console.log('total live tiles:', rows.length, '| matched:', rows.length-missing.length, '| missing:', missing.length);
console.log('TRUE subcategory mismatches:', trueMismatches.length);
console.log('\\nFirst 40 mismatches:');
for (const m of trueMismatches.slice(0,40)) {
  console.log(`  · ${m.title.padEnd(45)} live=${m.live.padEnd(20)} expected=${(m.expected||'-').padEnd(15)} got=${m.got||'(none)'}`);
}

writeFileSync('scripts/audit/live-vs-runtime-subcat-diff.json', JSON.stringify({
  summary: { totalLive: rows.length, missing: missing.length, trueMismatches: trueMismatches.length },
  trueMismatches, missing
}, null, 2));
console.log('\\nwrote scripts/audit/live-vs-runtime-subcat-diff.json');
