import pg from 'pg';
const { Client } = pg;
const c = new Client();
await c.connect();

const BUCKET = 'tablewear';
const PUBLIC_BASE = `https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/${BUCKET}`;

const files = (await c.query(`select name from storage.objects where bucket_id='${BUCKET}' order by name`)).rows.map(r => r.name);

const items = (await c.query(`select rms_id, title, images from inventory_items where category='tableware'`)).rows;

// family aliases — first storage token → set of allowed RMS title prefix tokens
const FAMILY_ALIAS = {};

const stripExt = s => s.replace(/\.png$/i, '');

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// detect family token + variant descriptor from filename
function parse(file) {
  const base = stripExt(file);
  // special two-token families
  let family, rest;
  if (/^MIDAS VIDAL\b/i.test(base)) { family = 'MIDAS VIDAL'; rest = base.slice(11).trim(); }
  else { const i = base.indexOf(' '); family = i < 0 ? base : base.slice(0, i); rest = i < 0 ? '' : base.slice(i + 1).trim(); }
  return { family, rest };
}

const variantNorm = s => norm(s)
  .replace(/\bteaspoon\b/g, 'tea spoon')
  .replace(/\bdessert tea\b/g, 'tea dessert') // canonical
  .replace(/\btea dessert\b/g, 'tea dessert');

function isSetFile(rest, family) {
  const r = rest.toLowerCase();
  if (r === '' ) return true; // ESTELLA.png
  if (/^set( again)?$/i.test(r)) return true;
  return false;
}

// For each item, compute family key (first or two tokens of title, uppercased without slash)
function itemFamily(title) {
  const t = title.toUpperCase();
  if (/^MIDAS\/VIDAL\b/.test(t)) return 'MIDAS VIDAL';
  if (/^NISHA\/VIDAL\b/.test(t)) return 'NISHA VIDAL';
  if (/^ARIAN\/VIDAL\b/.test(t)) return 'ARIAN VIDAL';
  return t.split(/\s+/)[0];
}

// variant tokens of an item title minus its family/material descriptor
// We just match by checking that key variant nouns from rest appear in title
function variantMatch(rest, title) {
  const restToks = variantNorm(rest).split(' ').filter(Boolean);
  const titleN = variantNorm(title);
  if (!restToks.length) return false;
  // require ALL rest tokens (excluding ignored) to appear in title
  const IGNORE = new Set(['needs', 'straightening']);
  const toks = restToks.filter(t => !IGNORE.has(t));
  return toks.every(t => new RegExp(`\\b${t}`).test(titleN));
}

const plan = []; // { file, url, action: 'set'|'variant'|'orphan', targets: [rms_id] }
const itemUpdates = new Map(); // rms_id -> { add: Set<url>, remove: Set<url> }

function addOp(rmsId, url, op = 'add') {
  if (!itemUpdates.has(rmsId)) itemUpdates.set(rmsId, { add: new Set(), remove: new Set() });
  itemUpdates.get(rmsId)[op].add(url);
}

const orphans = [];
const familySetUrl = {}; // family -> set image url chosen

// pass 1: identify primary set image per family (prefer "Set.png" over "Set Again" / "<FAMILY>.png")
for (const f of files) {
  const { family, rest } = parse(f);
  if (/^Set$/i.test(rest)) familySetUrl[family] = `${PUBLIC_BASE}/${encodeURIComponent(f)}`;
}
// fallback set images for families without "Set.png" exact
for (const f of files) {
  const { family, rest } = parse(f);
  if (familySetUrl[family]) continue;
  if (isSetFile(rest, family)) familySetUrl[family] = `${PUBLIC_BASE}/${encodeURIComponent(f)}`;
}

// pass 2: assign each file
for (const f of files) {
  const url = `${PUBLIC_BASE}/${encodeURIComponent(f)}`;
  const { family, rest } = parse(f);
  const familyItems = items.filter(it => itemFamily(it.title) === family);

  if (!familyItems.length) {
    orphans.push({ file: f, family, reason: 'no inventory items for family' });
    continue;
  }

  if (isSetFile(rest, family)) {
    // attach to ALL family variants as set hero (position 0)
    for (const it of familyItems) {
      addOp(it.rms_id, url, 'add');
    }
    plan.push({ file: f, action: 'set', family, count: familyItems.length, targets: familyItems.map(i => i.rms_id) });
    continue;
  }

  // variant file
  const matches = familyItems.filter(it => variantMatch(rest, it.title));
  if (matches.length === 0) {
    orphans.push({ file: f, family, rest, reason: 'no variant matches' });
    continue;
  }
  for (const m of matches) addOp(m.rms_id, url, 'add');
  plan.push({ file: f, action: 'variant', family, rest, count: matches.length, targets: matches.map(m => `${m.rms_id}|${m.title}`) });
}

// Compute current image cleanup: for each affected item, remove old inventory/TABLEWEAR/* and squarespace-mirror set images that are being replaced by NEW tablewear bucket urls.
// Strategy: if we're attaching a new tablewear/<basename>.png, drop any existing url whose basename matches OR is the squarespace-mirror set image for this family.
function basenameKey(url) {
  try { const p = new URL(url).pathname; return decodeURIComponent(p.split('/').pop() || '').toLowerCase().replace(/\+/g, ' ').replace(/\.png$/, '').replace(/[_-]+/g,' ').trim(); }
  catch { return ''; }
}
const newKeysByItem = new Map();
for (const [rms_id, ops] of itemUpdates) {
  const keys = new Set([...ops.add].map(basenameKey));
  newKeysByItem.set(rms_id, keys);
}
for (const it of items) {
  if (!itemUpdates.has(it.rms_id)) continue;
  const newKeys = newKeysByItem.get(it.rms_id);
  for (const u of (it.images || [])) {
    const k = basenameKey(u);
    // dedupe: same basename → drop old version (favoring new tablewear bucket)
    if (newKeys.has(k) && !u.startsWith(PUBLIC_BASE)) {
      addOp(it.rms_id, u, 'remove');
    }
    // also drop squarespace-mirror "_family-sets/<FAMILY>/<FAMILY>+Set.png" if we have a new Set image for that family
    const fam = itemFamily(it.title);
    if (familySetUrl[fam] && /squarespace-mirror\/.*set/i.test(u)) {
      addOp(it.rms_id, u, 'remove');
    }
  }
}

// SUMMARY
console.log(`\n=== FILES (${files.length}) ===`);
console.log(`set images: ${plan.filter(p=>p.action==='set').length}`);
console.log(`variant images: ${plan.filter(p=>p.action==='variant').length}`);
console.log(`orphans: ${orphans.length}`);

console.log(`\n=== ORPHANS ===`);
for (const o of orphans) console.log(' ', o.file, '←', o.reason);

const multiVariant = plan.filter(p => p.action === 'variant' && p.count !== 1);
console.log(`\n=== VARIANT FILES MATCHING ≠ 1 ITEM (${multiVariant.length}) ===`);
for (const p of multiVariant) console.log(' ', p.file, '→', p.count, p.targets);

const items_affected = itemUpdates.size;
let total_adds = 0, total_removes = 0;
for (const [, ops] of itemUpdates) { total_adds += ops.add.size; total_removes += ops.remove.size; }
console.log(`\n=== DB CHANGES ===`);
console.log(`items affected: ${items_affected}`);
console.log(`urls to add: ${total_adds}`);
console.log(`urls to remove: ${total_removes}`);

// Sample
console.log(`\n=== SAMPLE (first 5 items) ===`);
let n = 0;
for (const [rms_id, ops] of itemUpdates) {
  if (n++ >= 5) break;
  const it = items.find(i => i.rms_id === rms_id);
  console.log(`\n[${rms_id}] ${it.title}`);
  console.log(`  current: ${(it.images||[]).map(u=>u.split('/').pop()).join(', ')}`);
  console.log(`  add:     ${[...ops.add].map(u=>u.split('/').pop()).join(', ')}`);
  console.log(`  remove:  ${[...ops.remove].map(u=>u.split('/').pop()).join(', ') || '(none)'}`);
}

// Persist plan
import fs from 'fs';
fs.writeFileSync('/tmp/tablewear-plan.json', JSON.stringify({
  plan, orphans,
  itemUpdates: [...itemUpdates].map(([rms_id, ops]) => ({ rms_id, add: [...ops.add], remove: [...ops.remove] })),
  familySetUrl,
}, null, 2));
console.log(`\nwrote /tmp/tablewear-plan.json`);

await c.end();
