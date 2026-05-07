// Dry-run: match live products → DB rows by normalized title; build mirror plan.
// No writes. Outputs scripts-tmp/sqs-mirror-manifest.json + summary.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SR, { auth:{persistSession:false}});

const live = JSON.parse(readFileSync('scripts-tmp/sqs-live-truth.json','utf8'));
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/squarespace-mirror`;

function norm(s){
  if(!s) return '';
  let t=String(s); try{t=decodeURIComponent(t)}catch{}
  return t.toLowerCase()
    .replace(/[_\-]+/g,' ').replace(/[()'"&+]/g,' ')
    .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
}
function sanitizeFilename(name){
  return decodeURIComponent(name)
    .replace(/[^A-Za-z0-9._-]+/g,'_')
    .replace(/_+/g,'_')
    .slice(0, 80);
}
function inferExtFromUrl(url){
  const m = url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  return (m ? m[1] : 'jpg').toLowerCase();
}

// Live category slug -> our internal category slug (best-effort, used for path only)
const LIVE_CAT_TO_INTERNAL = {
  'lounge': 'seating',
  'lounge-tables': 'tables',
  'cocktail-bar': 'bars',
  'dining': 'tables',
  'tableware': 'tableware',
  'textiles': 'pillows-throws',
  'rugs': 'rugs',
  'styling': 'styling',
  'large-decor': 'large-decor',
  'light': 'lighting',
};

// Pull DB rows
const { data: dbRows, error } = await sb.from('inventory_items')
  .select('id,rms_id,title,category,images')
  .neq('status','draft');
if (error) throw error;

// Form-factor tokens FLIP the SKU even when family + material match.
// Sofa ≠ Loveseat ≠ Bench ≠ Chair. We require these to match exactly
// (or both sides absent) before we'll fuzzy-bind two titles.
const FORM_FACTORS = new Set([
  'sofa','loveseat','sectional','daybed','chaise','settee',
  'chair','armchair','barrelchair','accentchair','slipperchair','clubchair','wingchair','rockingchair','swivelchair',
  'bench','stool','barstool','counterstool','ottoman','pouf','poof',
  'table','cocktail','coffee','side','console','dining','end','nesting',
  'bar','barcart','cart','bartrunk','trunk',
  'lamp','floorlamp','tablelamp','sconce','pendant','chandelier','lantern',
  'rug','runner','pillow','throw','blanket','cushion','bolster',
  'mirror','shelf','shelves','bookcase','cabinet','dresser','sideboard','credenza','buffet','etagere',
  'bed','headboard',
  'vase','bowl','plate','platter','glass','goblet','flute','coupe','tumbler','rocks','wineglass','mug','cup','tray','candle','candleholder','holder','urn','planter',
]);
// Size tokens that flip the SKU (XL, 36", 48", 12', etc.)
const SIZE_RX = /^(?:\d{1,3}(?:["'']|in|inch|ft|feet|cm)?|x?xs|xs|sm|small|med|medium|lg|large|xl|xxl)$/;
const STOP = new Set(['the','a','an','of','and','with','to','for','in','on','set','pair']);
function rawTokens(s){ return norm(s).split(' ').filter(Boolean); }
function tokens(s){ return rawTokens(s).filter(t=>t.length>=3 && !STOP.has(t) && !FORM_FACTORS.has(t) && !SIZE_RX.test(t)); }
function blockingSet(s){
  const out = new Set();
  for (const t of rawTokens(s)) {
    if (FORM_FACTORS.has(t)) out.add('FF:'+t);
    if (SIZE_RX.test(t)) out.add('SZ:'+t.replace(/["'']/g,''));
  }
  return out;
}
function blockingMatches(a, b){
  const A = blockingSet(a), B = blockingSet(b);
  // Require identical set of form-factor + size tokens on both sides
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

const byTitle = new Map();
for (const r of dbRows) {
  const k = norm(r.title);
  if (!k) continue;
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(r);
}

// Token-overlap fallback: returns DB row if there's a unique row sharing
// >=2 distinctive tokens (after stopwords) AND no other DB row ties.
function fuzzyMatch(liveTitle, liveCat){
  const lt = tokens(liveTitle);
  if (lt.length === 0) return null;
  const liveSet = new Set(lt);
  const internalCat = LIVE_CAT_TO_INTERNAL[liveCat];
  let best = null, bestScore = 0, tied = false;
  for (const r of dbRows) {
    if (internalCat && r.category && r.category !== internalCat) continue;
    // Form-factor + size MUST match exactly (sofa vs loveseat = reject)
    if (!blockingMatches(liveTitle, r.title)) continue;
    const rt = tokens(r.title);
    if (rt.length === 0) continue;
    const overlap = rt.filter(t=>liveSet.has(t)).length;
    if (overlap < 2) continue;
    const minLen = Math.min(lt.length, rt.length);
    if (overlap / minLen < 0.6) continue;
    if (overlap > bestScore) { best = r; bestScore = overlap; tied = false; }
    else if (overlap === bestScore) { tied = true; }
  }
  return tied ? null : best;
}

// Build manifest
const liveSlugs = Object.keys(live);
const matched = [];
const ambiguous = [];
const unmatched = [];
const fuzzyMatched = [];
const allUrls = new Map(); // canonUrl -> { storagePath, storageUrl, category }

for (const slug of liveSlugs) {
  const p = live[slug];
  const k = norm(p.title);
  const hits = byTitle.get(k) || [];
  let row = null;
  let matchKind = 'exact';
  if (hits.length === 1) row = hits[0];
  else if (hits.length > 1) {
    ambiguous.push({ slug, title:p.title, categories:p.categories, candidates: hits.map(h=>({rms_id:h.rms_id, category:h.category, db_title:h.title})) });
    continue;
  } else {
    const fz = fuzzyMatch(p.title, p.categories[0]);
    if (fz) { row = fz; matchKind = 'fuzzy'; }
    else { unmatched.push({ slug, title:p.title, categories:p.categories }); continue; }
  }
  const liveCat = p.categories[0];
  const internalCat = LIVE_CAT_TO_INTERNAL[liveCat] || row.category || 'misc';

  // Plan storage paths
  const planned = p.images.map((url, i) => {
    const fname = sanitizeFilename(url.split('/').pop() || `img-${i}.jpg`);
    const ext = inferExtFromUrl(url);
    const base = fname.replace(/\.[a-z0-9]{2,5}$/i,'');
    const path = `${internalCat}/${slug}/${String(i+1).padStart(2,'0')}-${base}.${ext}`;
    const storageUrl = `${PUBLIC_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`;
    if (!allUrls.has(url)) allUrls.set(url, { path, storageUrl });
    return { source: url, path, storageUrl };
  });

  // Build proposed images[]: live mirror URLs FIRST in live order;
  // append any pre-existing storage images that are NOT squarespace-cdn (preserves owner uploads).
  const ownerKept = (row.images||[]).filter(u => u && !u.includes('squarespace-cdn.com'));
  const liveMirrored = planned.map(p=>p.storageUrl);
  const seen = new Set();
  const proposed = [];
  for (const u of liveMirrored) if (!seen.has(u)) { seen.add(u); proposed.push(u); }
  for (const u of ownerKept) if (!seen.has(u)) { seen.add(u); proposed.push(u); }

  const rec = {
    rms_id: row.rms_id,
    db_category: row.category,
    db_title: row.title,
    live_category: liveCat,
    title: p.title,
    slug_live: slug,
    match_kind: matchKind,
    current_images: row.images || [],
    planned,
    proposed_images: proposed,
  };
  matched.push(rec);
  if (matchKind === 'fuzzy') fuzzyMatched.push({ rms_id: row.rms_id, db_title: row.title, live_title: p.title });
}

const manifest = {
  generated_at: new Date().toISOString(),
  totals: {
    live_products: liveSlugs.length,
    matched: matched.length,
    matched_exact: matched.filter(m=>m.match_kind==='exact').length,
    matched_fuzzy: matched.filter(m=>m.match_kind==='fuzzy').length,
    ambiguous: ambiguous.length,
    unmatched: unmatched.length,
    unique_urls_to_mirror: allUrls.size,
  },
  matched,
  ambiguous,
  unmatched,
  fuzzy_review: fuzzyMatched,
  url_index: Array.from(allUrls.entries()).map(([url, v]) => ({ url, ...v })),
};
writeFileSync('scripts-tmp/sqs-mirror-manifest.json', JSON.stringify(manifest, null, 2));

// Per-category breakdown of matched
const byCat = {};
for (const m of matched) {
  const c = m.db_category || 'unknown';
  byCat[c] = byCat[c] || { rows:0, urls:0 };
  byCat[c].rows += 1;
  byCat[c].urls += m.planned.length;
}

const lines = [
  `MIRROR DRY-RUN — ${manifest.generated_at}`,
  '',
  `Live products harvested:    ${manifest.totals.live_products}`,
  `Matched (exact title):      ${manifest.totals.matched_exact}`,
  `Matched (fuzzy fallback):   ${manifest.totals.matched_fuzzy}`,
  `Ambiguous (>1 DB match):    ${manifest.totals.ambiguous}`,
  `Unmatched (no DB row):      ${manifest.totals.unmatched}`,
  `Unique URLs to mirror:      ${manifest.totals.unique_urls_to_mirror}`,
  '',
  'Per-DB-category (matched rows + URLs):',
  ...Object.entries(byCat).sort((a,b)=>b[1].rows-a[1].rows)
    .map(([c,v])=> `  ${c.padEnd(18)} rows=${String(v.rows).padStart(3)}  urls=${v.urls}`),
  '',
  'Sample fuzzy matches (first 15) — REVIEW THESE:',
  ...fuzzyMatched.slice(0,15).map(f=>`  • live="${f.live_title}"  →  db="${f.db_title}"  rms=${f.rms_id}`),
  '',
  'Sample unmatched (first 15):',
  ...unmatched.slice(0,15).map(u=>`  • ${u.title}  [${u.categories.join(',')}]  slug=${u.slug}`),
  '',
  'Outputs:',
  '  scripts-tmp/sqs-mirror-manifest.json',
];
const summary = lines.join('\n');
writeFileSync('scripts-tmp/sqs-mirror-summary.txt', summary);
console.log(summary);
