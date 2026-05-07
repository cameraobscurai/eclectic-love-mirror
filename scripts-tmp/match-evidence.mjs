// Multi-signal evidence matcher: live Squarespace products → DB inventory rows.
// No DB writes. No uploads. Outputs three review files.
//
// Waves:
//  1. image URL overlap (deterministic)
//  2. exact normalized title
//  3. slug match (live.slug vs slugify(rms.title))
//  4. multi-signal evidence score with mutual-best requirement
//
// Outputs:
//   scripts-tmp/match-bound.json           (high-confidence: waves 1-3)
//   scripts-tmp/match-fuzzy.csv            (wave 4 candidates for human eyeball)
//   scripts-tmp/match-unmatched.csv        (live products with no candidate)
//   scripts-tmp/match-summary.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});

const live = JSON.parse(readFileSync('scripts-tmp/sqs-live-truth.json','utf8'));

// ---------- helpers ----------
const stripHtml = h => String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();

function norm(s){
  if(!s) return '';
  let t=String(s); try{t=decodeURIComponent(t)}catch{}
  return t.toLowerCase()
    .replace(/[_\-]+/g,' ').replace(/[()'"&+]/g,' ')
    .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
}
function slugify(s){ return norm(s).replace(/\s+/g,'-'); }
function canonUrl(u){ return u ? String(u).split('?')[0] : u; }

const FORM_FACTORS = new Set([
  'sofa','loveseat','sectional','daybed','chaise','settee',
  'chair','armchair','barrel','accent','slipper','club','wing','rocker','swivel',
  'bench','stool','barstool','counter','ottoman','pouf','poof',
  'cocktail','coffee','side','console','dining','end','nesting',
  'bar','cart','trunk',
  'lamp','floor','sconce','pendant','chandelier','lantern',
  'rug','runner','pillow','throw','blanket','cushion','bolster',
  'mirror','shelf','shelves','bookcase','cabinet','dresser','sideboard','credenza','buffet','etagere',
  'bed','headboard',
  'vase','bowl','plate','platter','glass','goblet','flute','coupe','tumbler','rocks','mug','cup','tray','candle','holder','urn','planter',
]);
const SIZE_RX = /^(?:\d{1,3}(?:in|inch|ft|feet|cm)?|xxs|xs|sm|small|med|medium|lg|large|xl|xxl)$/;
const STOP = new Set(['the','a','an','of','and','with','to','for','in','on','set','pair']);

function rawTokens(s){ return norm(s).split(' ').filter(Boolean); }
function distinctiveTokens(s){
  return rawTokens(s).filter(t => t.length>=3 && !STOP.has(t) && !FORM_FACTORS.has(t) && !SIZE_RX.test(t));
}
function blockingSet(s){
  const out = new Set();
  for (const t of rawTokens(s)) {
    if (FORM_FACTORS.has(t)) out.add('FF:'+t);
    if (SIZE_RX.test(t))     out.add('SZ:'+t);
  }
  return out;
}
function blockingMatches(a,b){
  const A=blockingSet(a), B=blockingSet(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}
function jaccard(aSet, bSet){
  if (!aSet.size || !bSet.size) return 0;
  let inter=0; for (const x of aSet) if (bSet.has(x)) inter++;
  return inter / (aSet.size + bSet.size - inter);
}
// Extract dimension-ish tokens like 48" / 12' / 24x36
function dimSig(s){
  if (!s) return new Set();
  const out = new Set();
  const t = String(s).toLowerCase();
  for (const m of t.matchAll(/\d{1,3}\s*(?:["'']|in\b|inch\b|ft\b|feet\b|cm\b|w\b|d\b|h\b|l\b)/g)) {
    out.add(m[0].replace(/\s+/g,'').replace(/["'']/g,'"'));
  }
  return out;
}

const LIVE_CAT_TO_INTERNAL = {
  'lounge':'seating','lounge-tables':'tables','cocktail-bar':'bars','dining':'tables',
  'tableware':'tableware','textiles':'pillows-throws','rugs':'rugs','styling':'styling',
  'large-decor':'large-decor','light':'lighting',
};

// ---------- load DB ----------
const { data: dbRows, error } = await sb.from('inventory_items')
  .select('id,rms_id,title,category,images,quantity,dimensions_raw')
  .neq('status','draft');
if (error) throw error;

// Pre-compute per-row signal cache
const dbCache = new Map();
for (const r of dbRows) {
  dbCache.set(r.rms_id, {
    row: r,
    titleNorm: norm(r.title),
    titleSlug: slugify(r.title),
    distinct: new Set(distinctiveTokens(r.title)),
    blocking: blockingSet(r.title),
    canonImages: new Set((r.images||[]).map(canonUrl).filter(Boolean)),
    dims: dimSig(r.dimensions_raw),
  });
}

// Pre-compute per-live cache
const liveCache = new Map();
for (const [slug, p] of Object.entries(live)) {
  liveCache.set(slug, {
    p,
    titleNorm: norm(p.title),
    distinct: new Set(distinctiveTokens(p.title)),
    blocking: blockingSet(p.title),
    canonImages: new Set((p.images||[]).map(canonUrl).filter(Boolean)),
    dims: dimSig(p.body),
    bodyTokens: new Set(distinctiveTokens(stripHtml(p.body||'').slice(0,800))),
  });
}

// ---------- WAVE 1: image URL overlap (deterministic) ----------
const bindings = new Map(); // rms_id -> { live_slug, wave, evidence }
const liveBound = new Set(); // live_slug already bound

// Build canonImage -> rms_id index
const dbImageIdx = new Map();
for (const [rms_id, c] of dbCache) {
  for (const u of c.canonImages) {
    if (!u.includes('squarespace-cdn.com')) continue;
    if (!dbImageIdx.has(u)) dbImageIdx.set(u, new Set());
    dbImageIdx.get(u).add(rms_id);
  }
}
const wave1 = [];
for (const [slug, lc] of liveCache) {
  const hits = new Map(); // rms_id -> shared count
  for (const u of lc.canonImages) {
    const set = dbImageIdx.get(u);
    if (!set) continue;
    for (const rms of set) hits.set(rms, (hits.get(rms)||0) + 1);
  }
  if (!hits.size) continue;
  // pick best
  let bestRms=null, bestN=0, tied=false;
  for (const [rms, n] of hits) {
    if (n > bestN) { bestRms=rms; bestN=n; tied=false; }
    else if (n === bestN) tied=true;
  }
  if (bestRms && !tied && !bindings.has(bestRms)) {
    bindings.set(bestRms, { live_slug: slug, wave: 1, evidence: { shared_images: bestN } });
    liveBound.add(slug);
    wave1.push({ rms_id: bestRms, slug, shared: bestN });
  }
}

// ---------- WAVE 2: exact normalized title ----------
const dbByTitle = new Map();
for (const [rms_id, c] of dbCache) {
  if (bindings.has(rms_id)) continue;
  if (!dbByTitle.has(c.titleNorm)) dbByTitle.set(c.titleNorm, []);
  dbByTitle.get(c.titleNorm).push(rms_id);
}
const wave2 = [];
for (const [slug, lc] of liveCache) {
  if (liveBound.has(slug)) continue;
  const hits = dbByTitle.get(lc.titleNorm);
  if (!hits || hits.length !== 1) continue;
  const rms = hits[0];
  if (bindings.has(rms)) continue;
  bindings.set(rms, { live_slug: slug, wave: 2, evidence: { exact_title: true } });
  liveBound.add(slug);
  wave2.push({ rms_id: rms, slug });
}

// ---------- WAVE 3: slug match (live.slug == slugify(rms.title)) ----------
const dbBySlug = new Map();
for (const [rms_id, c] of dbCache) {
  if (bindings.has(rms_id)) continue;
  if (!dbBySlug.has(c.titleSlug)) dbBySlug.set(c.titleSlug, []);
  dbBySlug.get(c.titleSlug).push(rms_id);
}
const wave3 = [];
for (const [slug, lc] of liveCache) {
  if (liveBound.has(slug)) continue;
  const hits = dbBySlug.get(slug);
  if (!hits || hits.length !== 1) continue;
  const rms = hits[0];
  if (bindings.has(rms)) continue;
  bindings.set(rms, { live_slug: slug, wave: 3, evidence: { slug_match: true } });
  liveBound.add(slug);
  wave3.push({ rms_id: rms, slug });
}

// ---------- WAVE 4: evidence scoring with mutual-best ----------
// For each remaining live, score every remaining DB row in same category
// (after blocking-match filter). Compute scores both directions.

function scorePair(lc, dc, liveCat){
  if (!blockingMatches(lc.p.title, dc.row.title)) return null;
  const internalCat = LIVE_CAT_TO_INTERNAL[liveCat];
  const catMatch = internalCat && dc.row.category === internalCat;
  if (internalCat && dc.row.category && !catMatch) return null;

  let pts = 0;
  const ev = {};

  // distinctive token overlap
  const sharedTok = [...lc.distinct].filter(t => dc.distinct.has(t));
  if (sharedTok.length >= 2) { pts += sharedTok.length; ev.shared_tokens = sharedTok; }
  else return null; // need at least 2 distinctive tokens shared

  // category
  if (catMatch) { pts += 1; ev.category = true; }

  // quantity (live stocked may be in p.body or p.excerpt; skip if missing)
  // RMS quantity
  if (typeof dc.row.quantity === 'number') {
    const qm = (lc.p.body||'').match(/(?:in stock|stocked|qty|quantity)\D{0,8}(\d{1,4})/i);
    if (qm && Number(qm[1]) === dc.row.quantity) { pts += 2; ev.qty_match = dc.row.quantity; }
  }

  // dimensions
  const sharedDims = [...lc.dims].filter(d => dc.dims.has(d));
  if (sharedDims.length >= 2) { pts += 3; ev.shared_dims = sharedDims; }
  else if (sharedDims.length === 1) { pts += 1; ev.shared_dim = sharedDims[0]; }

  // slug substring of title or vice versa
  if (dc.titleSlug.includes(lc.p.slug) || lc.p.slug.includes(dc.titleSlug)) {
    pts += 2; ev.slug_substr = true;
  }

  // body tokens jaccard (cheap)
  const j = jaccard(lc.bodyTokens, dc.distinct);
  if (j >= 0.3) { pts += 1; ev.body_jaccard = j.toFixed(2); }

  return { pts, ev };
}

const remainingLive = [...liveCache.entries()].filter(([s])=>!liveBound.has(s));
const remainingDb   = [...dbCache.entries()].filter(([r])=>!bindings.has(r));

// per-live: top candidates
const liveTop = new Map(); // slug -> [{rms_id, pts, ev}, ...] sorted desc
for (const [slug, lc] of remainingLive) {
  const liveCat = lc.p.categories[0];
  const scored = [];
  for (const [rms_id, dc] of remainingDb) {
    const s = scorePair(lc, dc, liveCat);
    if (s) scored.push({ rms_id, pts: s.pts, ev: s.ev, db_title: dc.row.title });
  }
  scored.sort((a,b)=>b.pts-a.pts);
  liveTop.set(slug, scored);
}
// per-db: top candidates
const dbTop = new Map();
for (const [rms_id, dc] of remainingDb) {
  const dRow = dc.row;
  const scored = [];
  for (const [slug, lc] of remainingLive) {
    const liveCat = lc.p.categories[0];
    const s = scorePair(lc, dc, liveCat);
    if (s) scored.push({ slug, pts: s.pts, ev: s.ev, live_title: lc.p.title });
  }
  scored.sort((a,b)=>b.pts-a.pts);
  dbTop.set(rms_id, scored);
}

// MIN_PTS=4, MARGIN=2, mutual-best required
const MIN_PTS = 4, MARGIN = 2;
const wave4Auto = [];
const wave4Review = [];

for (const [slug, top] of liveTop) {
  if (!top.length) continue;
  const best = top[0];
  const runner = top[1];
  const dRow = dbCache.get(best.rms_id).row;
  const dbBest = dbTop.get(best.rms_id)?.[0];
  const dbRunner = dbTop.get(best.rms_id)?.[1];
  const mutual = dbBest && dbBest.slug === slug;
  const margin = best.pts - (runner?.pts || 0);
  const dbMargin = dbBest && dbRunner ? dbBest.pts - dbRunner.pts : (dbBest ? dbBest.pts : 0);

  const rec = {
    live_slug: slug,
    live_title: liveCache.get(slug).p.title,
    live_cat: liveCache.get(slug).p.categories[0],
    rms_id: best.rms_id,
    db_title: dRow.title,
    db_cat: dRow.category,
    pts: best.pts,
    margin,
    mutual,
    db_margin: dbMargin,
    runner_up: runner ? { rms_id: runner.rms_id, db_title: runner.db_title, pts: runner.pts } : null,
    evidence: best.ev,
  };

  if (mutual && best.pts >= MIN_PTS && margin >= MARGIN && dbMargin >= MARGIN) {
    if (!bindings.has(best.rms_id)) {
      bindings.set(best.rms_id, { live_slug: slug, wave: 4, evidence: best.ev, pts: best.pts });
      liveBound.add(slug);
      wave4Auto.push(rec);
    }
  } else {
    wave4Review.push(rec);
  }
}

// ---------- output ----------
const matchBound = [];
for (const [rms_id, b] of bindings) {
  const lc = liveCache.get(b.live_slug);
  const dc = dbCache.get(rms_id);
  matchBound.push({
    rms_id, db_title: dc.row.title, db_category: dc.row.category,
    live_slug: b.live_slug, live_title: lc.p.title, live_category: lc.p.categories[0],
    wave: b.wave, evidence: b.evidence, pts: b.pts,
    live_images: lc.p.images,
  });
}

writeFileSync('scripts-tmp/match-bound.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  total: matchBound.length,
  by_wave: matchBound.reduce((a,m)=>{a[m.wave]=(a[m.wave]||0)+1;return a;},{}),
  bindings: matchBound,
}, null, 2));

// CSV: fuzzy review
const csvHead = 'live_slug|live_title|live_cat|rms_id|db_title|db_cat|pts|margin|mutual|db_margin|runner_rms|runner_title|runner_pts|evidence';
const csvRows = wave4Review
  .sort((a,b)=>b.pts-a.pts)
  .map(r => [
    r.live_slug, r.live_title, r.live_cat, r.rms_id, r.db_title, r.db_cat,
    r.pts, r.margin, r.mutual, r.db_margin,
    r.runner_up?.rms_id || '', r.runner_up?.db_title || '', r.runner_up?.pts || '',
    JSON.stringify(r.evidence)
  ].join('|'));
writeFileSync('scripts-tmp/match-fuzzy.csv', [csvHead, ...csvRows].join('\n'));

// CSV: unmatched (live with no candidate at all)
const unmatched = [];
for (const [slug, lc] of liveCache) {
  if (liveBound.has(slug)) continue;
  if ((liveTop.get(slug)||[]).length) continue; // shows up in fuzzy review
  unmatched.push({ slug, title: lc.p.title, cat: lc.p.categories[0], n_images: lc.canonImages.size });
}
writeFileSync('scripts-tmp/match-unmatched.csv',
  ['slug|title|cat|n_images', ...unmatched.map(u=>`${u.slug}|${u.title}|${u.cat}|${u.n_images}`)].join('\n'));

// summary
const byWave = matchBound.reduce((a,m)=>{a[m.wave]=(a[m.wave]||0)+1;return a;},{});
const summary = [
  `EVIDENCE MATCH — ${new Date().toISOString()}`,
  '',
  `Live products:                  ${liveCache.size}`,
  `DB rows (public):               ${dbCache.size}`,
  '',
  `Bound (high confidence):        ${matchBound.length}`,
  `  Wave 1 image URL overlap:     ${byWave[1]||0}`,
  `  Wave 2 exact title:           ${byWave[2]||0}`,
  `  Wave 3 slug match:            ${byWave[3]||0}`,
  `  Wave 4 evidence (auto):       ${byWave[4]||0}`,
  '',
  `Wave 4 needs review:            ${wave4Review.length}  → scripts-tmp/match-fuzzy.csv`,
  `Live with no candidate at all:  ${unmatched.length}    → scripts-tmp/match-unmatched.csv`,
  '',
  'Top 10 review-needed (sorted by pts):',
  ...wave4Review.slice(0,10).map(r =>
    `  pts=${r.pts} margin=${r.margin} mutual=${r.mutual}  "${r.live_title}"  →  "${r.db_title}"  [${JSON.stringify(r.evidence)}]`),
  '',
  'Outputs:',
  '  scripts-tmp/match-bound.json',
  '  scripts-tmp/match-fuzzy.csv',
  '  scripts-tmp/match-unmatched.csv',
].join('\n');
writeFileSync('scripts-tmp/match-summary.txt', summary);
console.log(summary);
