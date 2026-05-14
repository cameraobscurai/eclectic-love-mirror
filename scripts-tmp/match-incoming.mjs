import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const files = JSON.parse(readFileSync('/tmp/incoming-files.json','utf8'))
  .filter(f => f.name && !f.name.startsWith('.') && /\.(png|jpe?g|webp)$/i.test(f.name));

// folder → site category(s) it could belong to
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
  'tables/columns-pedestals': ['tables','large-decor'],
  'tables/community-tables': ['tables'],
  'tables/console-tables': ['tables'],
  'tables/dining-tables': ['tables'],
  'tables/side-tables': ['tables'],
  'tables/utility': ['tables'],
  'tablewear/dinnerware': ['tableware'],
  'tablewear/flatware': ['tableware'],
  'tablewear/glassware': ['tableware'],
};

// Normalizer: strip ext, strip trailing " N", collapse spaces, uppercase, drop punctuation
function norm(s) {
  return String(s)
    .replace(/\.(png|jpe?g|webp)$/i,'')
    .replace(/\s+\d+$/,'')          // trailing " 0", " 1"
    .replace(/[^A-Za-z0-9 ]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

// Group files by their normalized base name (so " 0" and " 1" group together)
const groups = new Map();  // key: `${folder}::${normName}` → { folder, baseName, files: [...] }
for (const f of files) {
  const base = norm(f.name);
  const key = `${f.folder}::${base}`;
  if (!groups.has(key)) groups.set(key, { folder: f.folder, base, files: [] });
  groups.get(key).files.push(f.name);
}
// sort each group's files: name without trailing digit first, then by digit
for (const g of groups.values()) {
  g.files.sort((a,b)=>{
    const ai = a.match(/\s(\d+)\.[^.]+$/); const bi = b.match(/\s(\d+)\.[^.]+$/);
    const an = ai ? parseInt(ai[1]) : -1;  const bn = bi ? parseInt(bi[1]) : -1;
    return an - bn;
  });
}

console.log(`Incoming groups (= candidate products): ${groups.size}`);
console.log(`Total image files:                       ${files.length}`);

// Pull all inventory items
const { data: inv } = await sb.from('inventory_items')
  .select('id, title, category, status, images, rms_id')
  .neq('status','draft');

// Build title index
const byNormTitle = new Map();
for (const it of inv) {
  const k = norm(it.title);
  if (!byNormTitle.has(k)) byNormTitle.set(k, []);
  byNormTitle.get(k).push(it);
}

// Match each group
const PUBLIC = `${process.env.SUPABASE_URL}/storage/v1/object/public/incoming-photos`;
const enc = p => p.split('/').map(encodeURIComponent).join('/');

const matched = [];      // exactly one product
const ambiguous = [];    // multiple candidates
const setFiles = [];     // BRAND Set.png — flagged separately
const orphans = [];      // no match

for (const g of groups.values()) {
  // Skip "BRAND Set" tokens — needs human decision per earlier discussion
  if (/\bSET$/.test(g.base)) {
    setFiles.push(g);
    continue;
  }

  const candidates = byNormTitle.get(g.base) || [];
  const cats = FOLDER_TO_CATS[g.folder] || [];
  const inCat = candidates.filter(c => cats.length === 0 || cats.includes(c.category));

  let pick = null;
  if (inCat.length === 1) pick = inCat[0];
  else if (inCat.length > 1) { ambiguous.push({ ...g, candidates: inCat }); continue; }
  else if (candidates.length === 1) pick = candidates[0];   // category mismatch but unique title
  else if (candidates.length > 1) { ambiguous.push({ ...g, candidates }); continue; }

  if (pick) {
    matched.push({
      group: g,
      product: { id: pick.id, title: pick.title, category: pick.category, rms_id: pick.rms_id, currentImages: pick.images?.length || 0 },
      newUrls: g.files.map(f => `${PUBLIC}/${enc(g.folder ? `${g.folder}/${f}` : f)}`),
    });
  } else {
    orphans.push(g);
  }
}

console.log(`\nMATCHED (1 product):     ${matched.length}`);
console.log(`AMBIGUOUS (>1 product):  ${ambiguous.length}`);
console.log(`SET FILES (deferred):    ${setFiles.length}`);
console.log(`ORPHANS (no match):      ${orphans.length}`);

// Per-folder breakdown
const folderStats = {};
const allBuckets = [['matched',matched.map(m=>m.group)],['ambiguous',ambiguous],['set',setFiles],['orphan',orphans]];
for (const [bucket, arr] of allBuckets) {
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

console.log('\nSAMPLE ORPHANS (first 30):');
for (const o of orphans.slice(0,30)) console.log(`  [${o.folder}] ${o.files[0]}  (norm: ${o.base})`);

console.log('\nSAMPLE AMBIGUOUS (first 15):');
for (const a of ambiguous.slice(0,15)) {
  console.log(`  [${a.folder}] ${a.files[0]} → ${a.candidates.map(c=>`${c.title} (${c.category})`).join(' | ')}`);
}

console.log('\nSAMPLE SET FILES (first 15):');
for (const s of setFiles.slice(0,15)) console.log(`  [${s.folder}] ${s.files[0]}`);

writeFileSync('/tmp/incoming-match-report.json', JSON.stringify({
  matched, ambiguous, setFiles, orphans, folderStats,
  totals: { groups: groups.size, files: files.length, matched: matched.length, ambiguous: ambiguous.length, set: setFiles.length, orphan: orphans.length }
}, null, 2));
console.log('\nWrote /tmp/incoming-match-report.json');
