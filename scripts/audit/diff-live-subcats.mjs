// Diff: for each live tile, find our catalog item(s) and compare subcategory placement.
import { readFileSync, writeFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('scripts/audit/live-subcategory-map.json','utf8'));
const cat  = JSON.parse(readFileSync('src/data/inventory/current_catalog.json','utf8'));
let items=[]; for (const k of Object.keys(cat)) if (Array.isArray(cat[k])) items=items.concat(cat[k]);

const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const TOK_CANON = { glassware:'glass', glasses:'glass', pillows:'pillow', throws:'throw' };
const toks = s => norm(s).split(' ').filter(t=>t.length>=3).map(t=>TOK_CANON[t]||t);

// Build catalog index by slug AND by token-set (for fuzzy fallback)
const catBySlug = new Map(items.map(p=>[p.slug,p]));
const catByTokens = items.map(p=>({p, tokens: new Set(toks(p.title))}));

// Map our categorySlug+subcategory -> live (category, subcategory) rough expectation
// Just report whatever we have; humans will judge mismatches.
const rows = [];
let exact=0, fuzzy=0, missing=0;
for (const [liveSlug, info] of Object.entries(live.byLiveSlug)) {
  let our = catBySlug.get(liveSlug);
  let how = 'slug';
  if (!our) {
    const lt = new Set(toks(info.title));
    // best fuzzy: max token overlap, all live tokens contained
    let best=null, bestScore=0;
    for (const c of catByTokens) {
      let inter=0; for (const t of lt) if (c.tokens.has(t)) inter++;
      const score = inter / Math.max(lt.size,1);
      if (score > bestScore) { bestScore=score; best=c.p; }
    }
    if (best && bestScore >= 0.6) { our = best; how='fuzzy'; }
  }
  if (!our) { missing++; rows.push({liveSlug, liveTitle:info.title, liveCat:info.category, liveSubs:info.subcategories, our:null, how:'missing'}); continue; }
  if (how==='slug') exact++; else fuzzy++;
  rows.push({
    liveSlug, liveTitle: info.title, liveCat: info.category, liveSubs: info.subcategories,
    ourSlug: our.slug, ourTitle: our.title, ourCat: our.categorySlug, ourSub: our.subcategory,
    how,
  });
}

// Find mismatches: where our subcategory doesn't reasonably correspond to any live subcategory
const SUB_ALIAS = {
  // our subcategory -> set of live subcategory strings that should be considered equivalent
  'sofas-loveseats': ['Sofas & Loveseats'],
  'benches': ['Benches'],
  'chairs': ['Chairs','Dining Chairs'],
  'ottomans': ['Ottomans'],
  'coffee-tables': ['Coffee Tables','Cocktail Tables'],
  'side-tables': ['Side Tables'],
  'consoles': ['Consoles'],
  'bars': ['Bars'],
  'stools': ['Stools'],
  'storage': ['Storage','Crates & Baskets'],
  'dining-tables': ['Dining Tables','Community Tables'],
  'dinnerware': ['Dinnerware'],
  'flatware': ['Flatware'],
  'glassware': ['Glassware'],
  'serveware': ['Serveware'],
  'pillows': ['Pillows'],
  'throws': ['Throws'],
  'rugs': ['Rugs'],
  'accents': ['Accents'],
  'walls': ['Walls'],
  'structures': ['Structures'],
  'other': ['Other'],
  'chandeliers': ['Chandeliers'],
  'lamps': ['Lamps'],
  'candlelight': ['Candlelight'],
  'specialty': ['Specialty'],
};

const mismatches = [];
for (const r of rows) {
  if (!r.ourSlug) continue;
  const allowed = SUB_ALIAS[r.ourSub] || [];
  const ok = r.liveSubs.some(s => allowed.includes(s));
  if (!ok) mismatches.push({
    title: r.liveTitle,
    liveCat: r.liveCat,
    liveSubs: r.liveSubs,
    ourCat: r.ourCat,
    ourSub: r.ourSub,
    how: r.how,
    liveSlug: r.liveSlug,
    ourSlug: r.ourSlug,
  });
}

const summary = {
  totalLive: rows.length,
  matchedExactSlug: exact,
  matchedFuzzy: fuzzy,
  missingFromCatalog: missing,
  subcategoryMismatches: mismatches.length,
};
console.log(summary);
writeFileSync('scripts/audit/live-vs-catalog-subcat-diff.json', JSON.stringify({summary, mismatches, missing: rows.filter(r=>!r.ourSlug)}, null, 2));
console.log('wrote scripts/audit/live-vs-catalog-subcat-diff.json');

// Top 25 mismatches preview
console.log('\\nFirst 25 mismatches:');
for (const m of mismatches.slice(0,25)) {
  console.log(`  · ${m.title.padEnd(45)} live=${m.liveCat}/${m.liveSubs.join('|')}  ours=${m.ourCat}/${m.ourSub||'(none)'}`);
}
