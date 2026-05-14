import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const files = JSON.parse(readFileSync('/tmp/incoming-files.json','utf8'))
  .filter(f => f.name && !f.name.startsWith('.') && /\.(png|jpe?g|webp)$/i.test(f.name));

const FOLDER_TO_CATS = {
  'PILLOWS': ['pillows-throws'], 'throws': ['pillows-throws'],
  'bars': ['bars'], 'candlelight': ['candlelight'], 'largedecor': ['large-decor'],
  'lighting/hanging': ['chandeliers','lighting'], 'lighting/lamp': ['lighting'], 'lighting/special': ['lighting'],
  'rugs': ['rugs'],
  'seating/bench': ['seating'], 'seating/chair-dining': ['seating'], 'seating/chair-lounge': ['seating'],
  'seating/loveseat': ['seating'], 'seating/ottoman': ['seating'], 'seating/sofa': ['seating'],
  'seating/specialty': ['seating'], 'seating/stool': ['seating'],
  'serveware': ['serveware'], 'storage': ['storage'], 'styling': ['styling'],
  'tables/cocktailtables': ['tables'], 'tables/coffeetables': ['tables'],
  'tables/columns-pedestals': ['tables','large-decor','styling'],
  'tables/community-tables': ['tables'], 'tables/console-tables': ['tables'],
  'tables/dining-tables': ['tables'], 'tables/side-tables': ['tables'], 'tables/utility': ['tables'],
  'tablewear/dinnerware': ['tableware'], 'tablewear/flatware': ['tableware'], 'tablewear/glassware': ['tableware'],
};

// Skip these brands per owner (resolve manually later)
const SKIP_BRANDS = new Set(['INOLA','EXCURSION','IRAJA']);  // also IRAJA — same problem as INOLA per ambiguous output

// Token equivalences: file token -> set of equivalent title tokens
function tokens(s) {
  return String(s).replace(/\.(png|jpe?g|webp)$/i,'').replace(/\s+\d+$/,'')
    .replace(/(\d+)IN\b/gi,'$1').replace(/(\d+)FT\b/gi,'$1')
    .replace(/[^A-Za-z0-9]+/g,' ').trim().toUpperCase().split(/\s+/).filter(Boolean);
}

const groups = new Map();
for (const f of files) {
  const t = tokens(f.name);
  if (!t.length) continue;
  const key = `${f.folder}::${t.join(' ')}`;
  if (!groups.has(key)) groups.set(key, { folder: f.folder, tokens: t, files: [] });
  groups.get(key).files.push(f.name);
}
for (const g of groups.values()) {
  g.files.sort((a,b)=>{
    const am = a.match(/\s(\d+)\.[^.]+$/); const bm = b.match(/\s(\d+)\.[^.]+$/);
    return (am?+am[1]:-1) - (bm?+bm[1]:-1);
  });
}

const { data: inv } = await sb.from('inventory_items')
  .select('id, title, category, status, images, rms_id').neq('status','draft');
for (const it of inv) it._tokens = tokens(it.title);

// Score: title MUST start with brand (token 0). Score = count of file tokens present anywhere in title tokens.
function scoreTitle(fileTokens, titleTokens) {
  if (titleTokens[0] !== fileTokens[0]) return -1;
  const titleSet = new Set(titleTokens);
  let s = 0;
  for (const t of fileTokens) if (titleSet.has(t)) s++;
  return s;
}

const PUBLIC = `${process.env.SUPABASE_URL}/storage/v1/object/public/incoming-photos`;
const enc = p => p.split('/').map(encodeURIComponent).join('/');

const matched = [], skipped = [], orphans = [], setFiles = [];

for (const g of groups.values()) {
  const brand = g.tokens[0];
  const last = g.tokens[g.tokens.length-1];
  if (SKIP_BRANDS.has(brand)) { skipped.push({ ...g, reason: `skip-brand:${brand}` }); continue; }
  if (last === 'SET' && g.tokens.length >= 2) { setFiles.push(g); continue; }

  const scope = FOLDER_TO_CATS[g.folder] || [];
  const pool = scope.length ? inv.filter(it => scope.includes(it.category)) : inv;

  // Score every candidate; pick highest. Tie-breaker: shortest title (most generic).
  let best = null, bestScore = 0, bestTie = null;
  for (const it of pool) {
    const s = scoreTitle(g.tokens, it._tokens);
    if (s <= 0) continue;
    if (s > bestScore || (s === bestScore && it._tokens.length < (best?._tokens.length ?? 1e9))) {
      // detect ties at top
      if (s === bestScore && best && it._tokens.length === best._tokens.length) bestTie = it;
      else { best = it; bestScore = s; bestTie = null; }
    }
  }
  // Fallback: try global scope (no category) if no in-scope hit
  if (!best && scope.length) {
    for (const it of inv) {
      const s = scoreTitle(g.tokens, it._tokens);
      if (s <= 0) continue;
      if (s > bestScore || (s === bestScore && it._tokens.length < (best?._tokens.length ?? 1e9))) {
        if (s === bestScore && best && it._tokens.length === best._tokens.length) bestTie = it;
        else { best = it; bestScore = s; bestTie = null; }
      }
    }
  }

  if (best && !bestTie) {
    matched.push({
      group: g, score: bestScore,
      product: { id: best.id, title: best.title, category: best.category, rms_id: best.rms_id, currentImages: best.images?.length || 0 },
      newUrls: g.files.map(f => `${PUBLIC}/${enc(g.folder ? `${g.folder}/${f}` : f)}`),
    });
  } else if (best && bestTie) {
    orphans.push({ ...g, reason: `tied: ${best.title} | ${bestTie.title}` });
  } else {
    orphans.push({ ...g, reason: 'no-brand-match' });
  }
}

// Collisions: multiple file groups -> same product. Merge them (concat URLs, dedupe).
const byPid = new Map();
for (const m of matched) {
  if (!byPid.has(m.product.id)) byPid.set(m.product.id, []);
  byPid.get(m.product.id).push(m);
}
const merged = [];
for (const [pid, arr] of byPid) {
  if (arr.length === 1) { merged.push(arr[0]); continue; }
  // Merge: combine newUrls, dedupe, but tag for review
  const all = [];
  const labels = [];
  for (const m of arr) {
    for (const u of m.newUrls) if (!all.includes(u)) all.push(u);
    labels.push(m.group.files[0]);
  }
  merged.push({ ...arr[0], newUrls: all, mergedFrom: labels });
}

console.log(`MATCHED (after merge): ${merged.length}`);
console.log(`  of which merged from collisions: ${merged.filter(m=>m.mergedFrom).length}`);
console.log(`SKIPPED (brand):       ${skipped.length}`);
console.log(`SET FILES:             ${setFiles.length}`);
console.log(`ORPHANS:               ${orphans.length}`);

const folderStats = {};
for (const [bucket, arr] of [['matched',merged.map(m=>m.group)],['skipped',skipped],['set',setFiles],['orphan',orphans]]) {
  for (const g of arr) {
    folderStats[g.folder] ??= { matched:0, skipped:0, set:0, orphan:0 };
    folderStats[g.folder][bucket]++;
  }
}
console.log('\nPER-FOLDER:');
console.log('folder'.padEnd(28), 'match  skip  set  orph');
for (const [f,s] of Object.entries(folderStats).sort()) {
  console.log(f.padEnd(28), String(s.matched).padStart(5), String(s.skipped).padStart(5), String(s.set).padStart(4), String(s.orphan).padStart(5));
}

console.log('\nALL ORPHANS:');
for (const o of orphans) console.log(`  [${o.folder}] ${o.files[0]}  (${o.reason})`);

writeFileSync('/tmp/incoming-match-v3.json', JSON.stringify({ merged, skipped, setFiles, orphans, folderStats }, null, 2));
console.log('\nWrote /tmp/incoming-match-v3.json');
