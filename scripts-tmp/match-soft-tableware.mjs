// Read-only scoped matcher for TABLEWEAR, THROWS, PILLOWS.
// Counts how many RMS rows the new rules resolve. No DB writes. No catalog writes.
import fs from 'node:fs';

const cat = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8')).products;
const manifest = JSON.parse(fs.readFileSync('scripts-tmp/storage-filetree-manifest.json','utf8'));

const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9 .]+/g,' ').replace(/\s+/g,' ').trim();
const tokens = s => norm(s).split(' ').filter(t => t && !['the','a','of','and','set','plate','bowl','fork','knife','spoon','glass','pillow','throw','lumbar','oversize','mini','low','tea','dinner','salad','steak','butter','charger','flute','goblet','wine','red','white'].includes(t) || /^\d/.test(t));

// ---------- TABLEWEAR ----------
const twFiles = manifest.filter(f => f.parent_folder === 'TABLEWEAR');
const twRows = cat.filter(r => r.categorySlug === 'tableware');

// Group files by stem (first ALL-CAPS word, e.g. WINSLOW)
const stemOf = fn => {
  const base = fn.replace(/\.[^.]+$/,'').trim();
  // Stem = leading run of UPPERCASE/digits before first lowercase word
  const m = base.match(/^([A-Z0-9][A-Z0-9 ]*?)(?=\s+[A-Z][a-z]|\s+\d|\s+Set|\s+Charger|$)/);
  return (m ? m[1] : base.split(' ')[0]).trim().toLowerCase();
};
const pieceOf = fn => {
  const base = fn.replace(/\.[^.]+$/,'').trim();
  return base.replace(new RegExp('^'+stemOf(fn).toUpperCase()+'\\s*','i'),'').trim().toLowerCase();
};

const twByStem = {};
for (const f of twFiles) {
  const s = stemOf(f.raw_filename);
  (twByStem[s] ??= []).push(f);
}

let twResolved = 0; // rows that get at least a hero (Set or piece-specific or single)
const twResolvedRows = [];
const twUnresolvedRows = [];
for (const r of twRows) {
  const titleNorm = norm(r.title);
  const stem = titleNorm.split(' ')[0]; // first word of title
  const files = twByStem[stem] || [];
  if (files.length === 0) { twUnresolvedRows.push(r); continue; }
  // Try piece-specific match: title minus stem must overlap with one of these files' piece
  const titleRest = titleNorm.replace(new RegExp('^'+stem+'\\s*'),'').trim();
  // strip dimensions like 11" → "11", 9.5" → "9.5"
  const titleNumeric = titleRest.match(/\d+(\.\d+)?/)?.[0];
  let hero = null;
  for (const f of files) {
    const piece = pieceOf(f.raw_filename);
    // numeric size match (plates)
    if (titleNumeric && piece.startsWith(titleNumeric)) { hero = f; break; }
    // piece keyword match (fork/knife/spoon etc.)
    const titleTokens = titleRest.split(' ');
    const pieceTokens = piece.split(' ');
    const overlap = titleTokens.filter(t => t && pieceTokens.includes(t));
    if (overlap.length >= 2) { hero = f; break; }
  }
  // fallback: Set as hero
  if (!hero) hero = files.find(f => /set/i.test(f.raw_filename));
  // fallback: if only one file, take it
  if (!hero && files.length === 1) hero = files[0];
  if (hero) { twResolved++; twResolvedRows.push({ id:r.id, title:r.title, file:hero.raw_filename }); }
  else twUnresolvedRows.push(r);
}

// ---------- THROWS ----------
const thFiles = manifest.filter(f => f.parent_folder === 'THROWS');
const thRows = cat.filter(r => r.categorySlug === 'pillows-throws' && /throw/i.test(r.title));

const fileTokens = f => norm(f.raw_filename.replace(/\.[^.]+$/,'')).split(' ').filter(t => t && !['set','throws'].includes(t));

let thResolved = 0;
const thHits = [];
const thMisses = [];
for (const r of thRows) {
  const rt = norm(r.title).split(' ').filter(t => t && t !== 'throw');
  let best = null, bestScore = 0;
  for (const f of thFiles) {
    const ft = fileTokens(f);
    const overlap = rt.filter(t => ft.includes(t)).length;
    const score = overlap / Math.max(rt.length, 1);
    if (overlap >= 2 && score > bestScore) { best = f; bestScore = score; }
  }
  if (best) { thResolved++; thHits.push({id:r.id,title:r.title,file:best.raw_filename,score:bestScore.toFixed(2)}); }
  else thMisses.push(r);
}

// ---------- PILLOWS ----------
const pFiles = manifest.filter(f => f.parent_folder === 'PILLOWS');
const pRows = cat.filter(r => r.categorySlug === 'pillows-throws' && /pillow/i.test(r.title));

let pResolved = 0;
const pHits = [];
const pMisses = [];
for (const r of pRows) {
  const rt = norm(r.title).split(' ').filter(t => t && t !== 'pillow' && t !== 'lumbar' && t !== 'oversize' && t !== 'mini');
  let best = null, bestScore = 0;
  for (const f of pFiles) {
    const ft = fileTokens(f).filter(t => t !== 'pillow' && t !== 'pillows' && t !== 'lumbar' && t !== 'oversize');
    const overlap = rt.filter(t => ft.includes(t)).length;
    const score = overlap / Math.max(rt.length, 1);
    // pillows allowed lower threshold per owner: 2 token overlap OR (1 token + score>=0.5)
    if ((overlap >= 2 || (overlap >= 1 && score >= 0.5)) && score > bestScore) { best = f; bestScore = score; }
  }
  if (best) { pResolved++; pHits.push({id:r.id,title:r.title,file:best.raw_filename,score:bestScore.toFixed(2)}); }
  else pMisses.push(r);
}

console.log('=== TABLEWEAR ===');
console.log(`  RMS rows: ${twRows.length}`);
console.log(`  Storage files: ${twFiles.length}`);
console.log(`  RESOLVED: ${twResolved} / ${twRows.length}`);
console.log(`  UNRESOLVED: ${twUnresolvedRows.length}`);
console.log(`  Sample misses:`, twUnresolvedRows.slice(0,8).map(r=>r.title).join(' | '));

console.log('\n=== THROWS ===');
console.log(`  RMS rows: ${thRows.length}`);
console.log(`  Storage files: ${thFiles.length}`);
console.log(`  RESOLVED: ${thResolved} / ${thRows.length}`);
console.log(`  Sample misses:`, thMisses.slice(0,8).map(r=>r.title).join(' | '));

console.log('\n=== PILLOWS ===');
console.log(`  RMS rows: ${pRows.length}`);
console.log(`  Storage files: ${pFiles.length}`);
console.log(`  RESOLVED: ${pResolved} / ${pRows.length}`);
console.log(`  Sample misses:`, pMisses.slice(0,8).map(r=>r.title).join(' | '));

const totalNewlyResolved = twResolved + thResolved + pResolved;
const totalRowsInScope = twRows.length + thRows.length + pRows.length;
console.log(`\n=== COMBINED ===`);
console.log(`  Rows in scope: ${totalRowsInScope}`);
console.log(`  Rows resolved by new rules: ${totalNewlyResolved}`);
console.log(`  Rows still imageless in scope: ${totalRowsInScope - totalNewlyResolved}`);

fs.writeFileSync('scripts-tmp/soft-tableware-hits.json', JSON.stringify({tableware:twResolvedRows,throws:thHits,pillows:pHits},null,2));
fs.writeFileSync('scripts-tmp/soft-tableware-misses.json', JSON.stringify({tableware:twUnresolvedRows.map(r=>({id:r.id,title:r.title})),throws:thMisses.map(r=>({id:r.id,title:r.title})),pillows:pMisses.map(r=>({id:r.id,title:r.title}))},null,2));
