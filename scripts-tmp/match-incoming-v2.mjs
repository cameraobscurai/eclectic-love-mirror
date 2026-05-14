import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const files = JSON.parse(readFileSync('/tmp/incoming-files.json','utf8'))
  .filter(f => f.name && !f.name.startsWith('.') && /\.(png|jpe?g|webp)$/i.test(f.name));

const FOLDER_TO_CATS = {
  'PILLOWS': ['pillows-throws'],
  'throws': ['pillows-throws'],
  'bars': ['bars'],
  'candlelight': ['candlelight'],
  'largedecor': ['large-decor'],
  'lighting/hanging': ['chandeliers','lighting'],
  'lighting/lamp': ['lighting'],
  'lighting/special': ['lighting'],
  'rugs': ['rugs'],
  'seating/bench': ['seating'],
  'seating/chair-dining': ['seating'],
  'seating/chair-lounge': ['seating'],
  'seating/loveseat': ['seating'],
  'seating/ottoman': ['seating'],
  'seating/sofa': ['seating'],
  'seating/specialty': ['seating'],
  'seating/stool': ['seating'],
  'serveware': ['serveware'],
  'storage': ['storage'],
  'styling': ['styling'],
  'tables/cocktailtables': ['tables'],
  'tables/coffeetables': ['tables'],
  'tables/columns-pedestals': ['tables','large-decor','styling'],
  'tables/community-tables': ['tables'],
  'tables/console-tables': ['tables'],
  'tables/dining-tables': ['tables'],
  'tables/side-tables': ['tables'],
  'tables/utility': ['tables'],
  'tablewear/dinnerware': ['tableware'],
  'tablewear/flatware': ['tableware'],
  'tablewear/glassware': ['tableware'],
};

function tokens(s) {
  return String(s)
    .replace(/\.(png|jpe?g|webp)$/i,'')
    .replace(/\s+\d+$/,'')              // strip trailing " 0" / " 1"
    .replace(/[^A-Za-z0-9]+/g,' ')      // dashes, &, punctuation -> space
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
}

// group files by (folder, normalized base) so " 0", " 1", "" share one product
const groups = new Map();
for (const f of files) {
  const t = tokens(f.name);
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
  .select('id, title, category, status, images, rms_id')
  .neq('status','draft');
for (const it of inv) it._tokens = tokens(it.title);

// PREFIX MATCH: candidate titles whose tokens start with given prefix (case-insensitive)
function prefixMatches(prefix, scope) {
  const out = [];
  for (const it of inv) {
    if (scope.length && !scope.includes(it.category)) continue;
    if (prefix.length > it._tokens.length) continue;
    let ok = true;
    for (let i = 0; i < prefix.length; i++) if (it._tokens[i] !== prefix[i]) { ok = false; break; }
    if (ok) out.push(it);
  }
  return out;
}

const PUBLIC = `${process.env.SUPABASE_URL}/storage/v1/object/public/incoming-photos`;
const enc = p => p.split('/').map(encodeURIComponent).join('/');

const matched = [];
const ambiguous = [];
const setFiles = [];
const orphans = [];

for (const g of groups.values()) {
  const last = g.tokens[g.tokens.length-1];
  if (last === 'SET' && g.tokens.length >= 2) { setFiles.push(g); continue; }

  const scope = FOLDER_TO_CATS[g.folder] || [];

  // Try progressively shorter prefixes: full → 2-token → 1-token (brand)
  let pick = null, candidates = [], usedPrefix = null;
  const tries = [];
  if (g.tokens.length >= 1) tries.push(g.tokens.slice(0, Math.min(3, g.tokens.length)));
  if (g.tokens.length >= 2) tries.push(g.tokens.slice(0, 2));
  if (g.tokens.length >= 1) tries.push(g.tokens.slice(0, 1));

  for (const prefix of tries) {
    let cands = prefixMatches(prefix, scope);
    if (!cands.length) cands = prefixMatches(prefix, []); // global fallback
    if (cands.length === 0) continue;
    if (cands.length === 1) { pick = cands[0]; usedPrefix = prefix; break; }
    // multi: pick most-specific (shortest title-tokens) IF unique
    cands.sort((a,b)=>a._tokens.length - b._tokens.length);
    if (cands[0]._tokens.length < cands[1]._tokens.length) {
      pick = cands[0]; usedPrefix = prefix; candidates = cands; break;
    }
    candidates = cands; usedPrefix = prefix;
    break; // truly ambiguous at this prefix level
  }

  if (pick) {
    matched.push({
      group: g,
      prefix: usedPrefix,
      product: { id: pick.id, title: pick.title, category: pick.category, rms_id: pick.rms_id, currentImages: pick.images?.length || 0 },
      newUrls: g.files.map(f => `${PUBLIC}/${enc(g.folder ? `${g.folder}/${f}` : f)}`),
      runnerUps: candidates.length ? candidates.slice(1, 4).map(c=>({title:c.title, category:c.category})) : [],
    });
  } else if (candidates.length > 1) {
    ambiguous.push({ ...g, candidates: candidates.map(c=>({id:c.id, title:c.title, category:c.category})) });
  } else {
    orphans.push(g);
  }
}

// Detect duplicate product matches (same product matched by 2+ file groups)
const byProductId = new Map();
for (const m of matched) {
  const id = m.product.id;
  if (!byProductId.has(id)) byProductId.set(id, []);
  byProductId.get(id).push(m);
}
const collisions = [...byProductId.entries()].filter(([_,arr])=>arr.length>1);

console.log(`MATCHED:    ${matched.length}`);
console.log(`AMBIGUOUS:  ${ambiguous.length}`);
console.log(`SET FILES:  ${setFiles.length}`);
console.log(`ORPHANS:    ${orphans.length}`);
console.log(`COLLISIONS (one product, multi files): ${collisions.length}`);

const folderStats = {};
for (const [bucket, arr] of [['matched',matched.map(m=>m.group)],['ambiguous',ambiguous],['set',setFiles],['orphan',orphans]]) {
  for (const g of arr) {
    folderStats[g.folder] ??= { matched:0, ambiguous:0, set:0, orphan:0 };
    folderStats[g.folder][bucket]++;
  }
}
console.log('\nPER-FOLDER:');
console.log('folder'.padEnd(28), 'match  amb  set  orph');
for (const [f,s] of Object.entries(folderStats).sort()) {
  console.log(f.padEnd(28), String(s.matched).padStart(5), String(s.ambiguous).padStart(4), String(s.set).padStart(4), String(s.orphan).padStart(5));
}

console.log('\nTOP 30 ORPHANS:');
for (const o of orphans.slice(0,30)) console.log(`  [${o.folder}] ${o.files[0]}`);

console.log('\nCOLLISIONS:');
for (const [id, arr] of collisions.slice(0,15)) {
  console.log(`  ${arr[0].product.title}  ←  ${arr.map(a=>a.group.files[0]).join(' | ')}`);
}

console.log('\nAMBIGUOUS (first 15):');
for (const a of ambiguous.slice(0,15)) {
  console.log(`  [${a.folder}] ${a.files[0]} → ${a.candidates.map(c=>c.title).join(' | ')}`);
}

writeFileSync('/tmp/incoming-match-v2.json', JSON.stringify({
  matched, ambiguous, setFiles, orphans, collisions, folderStats,
  totals: { groups: groups.size, files: files.length, matched: matched.length, ambiguous: ambiguous.length, set: setFiles.length, orphan: orphans.length, collisions: collisions.length }
}, null, 2));
console.log('\nWrote /tmp/incoming-match-v2.json');
