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

const STOP = new Set(['the','a','an','of','and','with','to','for','in','on','set','pair','sofa','chair','loveseat','table','lamp','rug','pillow','throw','vase','bowl','plate','glass','cup','mug','tray','candle','holder','sconce','chandelier','mirror','stool','bench','ottoman']);
function tokens(s){ return norm(s).split(' ').filter(t=>t.length>=3 && !STOP.has(t)); }

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
    const rt = tokens(r.title);
    if (rt.length === 0) continue;
    const overlap = rt.filter(t=>liveSet.has(t)).length;
    if (overlap < 2) continue;
    // require overlap to be majority of the smaller token set (anti-coincidence)
    const minLen = Math.min(lt.length, rt.length);
    if (overlap / minLen < 0.5) continue;
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
  `Matched to DB row:          ${manifest.totals.matched}`,
  `Ambiguous (>1 DB match):    ${manifest.totals.ambiguous}`,
  `Unmatched (no DB row):      ${manifest.totals.unmatched}`,
  `Unique URLs to mirror:      ${manifest.totals.unique_urls_to_mirror}`,
  '',
  'Per-DB-category (matched rows + URLs):',
  ...Object.entries(byCat).sort((a,b)=>b[1].rows-a[1].rows)
    .map(([c,v])=> `  ${c.padEnd(18)} rows=${String(v.rows).padStart(3)}  urls=${v.urls}`),
  '',
  'Sample matched (first 5):',
  ...matched.slice(0,5).map(m=>`  • ${m.title}  [${m.live_category}→${m.db_category}]  ${m.planned.length} imgs  rms=${m.rms_id}`),
  '',
  'Sample unmatched (first 10):',
  ...unmatched.slice(0,10).map(u=>`  • ${u.title}  [${u.categories.join(',')}]  slug=${u.slug}`),
  '',
  'Outputs:',
  '  scripts-tmp/sqs-mirror-manifest.json',
];
const summary = lines.join('\n');
writeFileSync('scripts-tmp/sqs-mirror-summary.txt', summary);
console.log(summary);
