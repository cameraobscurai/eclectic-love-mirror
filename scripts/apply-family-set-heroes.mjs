#!/usr/bin/env node
/**
 * scripts/apply-family-set-heroes.mjs
 *
 * Source: Squarespace product CSV export (May 2026), parked at /tmp/sq.csv.
 * Goal:   For tableware/serveware items still missing a "Set" family hero,
 *         match by family-key prefix to the parent listing's Set photo on
 *         Squarespace, mirror it into the squarespace-mirror bucket, and
 *         insert it at images[0].
 *
 * Phases (default = full dry-run, no writes):
 *   node scripts/apply-family-set-heroes.mjs              # print manifest
 *   node scripts/apply-family-set-heroes.mjs --apply      # mirror + DB write
 *
 * Then re-run scripts/bake-catalog.mjs.
 */
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CSV_PATH = '/tmp/sq.csv';
const BUCKET = 'squarespace-mirror';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Family key aliases for known spelling drift (normalized → canonical)
const ALIAS = {
  TABATHIA: 'TABITHA',
  POWELL: 'POWEL',
  HERROD: 'HEROD',
  LAVISA: 'LAVANYA',
};

function familyKey(title) {
  if (!title) return null;
  const first = title.trim().split(/[\s,]+/)[0] || '';
  const norm = first.toUpperCase().replace(/[^A-Z]/g, '');
  if (!norm) return null;
  return ALIAS[norm] || norm;
}

function exactFilename(url) {
  const noQuery = url.split('?')[0];
  const last = noQuery.substring(noQuery.lastIndexOf('/') + 1);
  try { return decodeURIComponent(last); } catch { return last; }
}

// 1. Parse CSV
const csv = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parse(csv, { columns: true, skip_empty_lines: true });

// 2. Build family map from rows where image filename contains "Set"
//    Restrict to relevant categories
const RELEVANT_SQ_CATS = new Set(['tableware', 'dining', 'styling', 'accents1']);
const familyMap = new Map(); // famKey -> { sqTitle, imageUrl, filename }
for (const r of rows) {
  const cat = r['Product Page'];
  const urls = (r['Hosted Image URLs'] || '').split(/\s+/).filter(Boolean);
  if (!urls.length) continue;
  const setUrl = urls.find(u => /\/[^/]*set[^/]*\.(png|jpe?g|webp)/i.test(u));
  if (!setUrl) continue;
  if (!RELEVANT_SQ_CATS.has(cat)) continue;

  const fam = familyKey(r['Title']);
  if (!fam) continue;
  if (familyMap.has(fam)) continue; // first wins
  familyMap.set(fam, {
    family: fam,
    sqTitle: r['Title'],
    sqCat: cat,
    imageUrl: setUrl,
    filename: exactFilename(setUrl),
  });
}

console.log(`Family Set images discovered: ${familyMap.size}`);

// 3. Pull problem items from DB: tableware/serveware with NO Set photo in images[]
const { data: items, error } = await supa
  .from('inventory_items')
  .select('id, title, slug, category, images')
  .neq('status', 'draft')
  .in('category', ['tableware', 'serveware']);
if (error) { console.error(error); process.exit(1); }

const SET_RE = /(^|[ _\-/])set([ _\-.]|$)/i;
const problems = items.filter(it => !(it.images || []).some(u => SET_RE.test(u)));
console.log(`Problem items (tw/sw, no Set hero): ${problems.length}`);

// 4. Match by family
const matches = [];
const unmatched = [];
for (const it of problems) {
  const fam = familyKey(it.title);
  const m = fam ? familyMap.get(fam) : null;
  if (m) matches.push({ ...it, family: fam, set: m });
  else unmatched.push({ ...it, family: fam });
}

console.log(`Matched: ${matches.length}   Unmatched (re-shoot queue): ${unmatched.length}`);

// 5. Print manifest
console.log('\n=== MATCHES ===');
console.log('FAM        TITLE                                          → SET FILE');
console.log('--------------------------------------------------------------------------------------');
for (const m of matches.slice().sort((a,b) => a.family.localeCompare(b.family) || a.title.localeCompare(b.title))) {
  console.log(`${m.family.padEnd(10)} ${m.title.padEnd(46).slice(0,46)} → ${m.set.filename}`);
}

console.log('\n=== UNMATCHED (no Squarespace family Set photo — needs re-shoot) ===');
for (const u of unmatched.sort((a,b) => (a.family||'').localeCompare(b.family||'') || a.title.localeCompare(b.title))) {
  console.log(`${(u.family||'?').padEnd(10)} ${u.category.padEnd(11)} ${u.title}`);
}

// Write manifest + reshoot CSV
fs.writeFileSync('/tmp/family-set-manifest.json', JSON.stringify({
  familyMap: [...familyMap.values()],
  matches: matches.map(m => ({
    id: m.id, title: m.title, slug: m.slug, category: m.category,
    family: m.family, currentHero: m.images?.[0] || null,
    setFile: m.set.filename, sqUrl: m.set.imageUrl,
  })),
  unmatched: unmatched.map(u => ({
    id: u.id, title: u.title, slug: u.slug, category: u.category, family: u.family,
    currentHero: u.images?.[0] || null,
  })),
}, null, 2));
fs.writeFileSync('/mnt/documents/tableware_reshoot_queue.csv',
  'id,family,category,title,current_hero\n' +
  unmatched.map(u => [u.id, u.family||'', u.category, JSON.stringify(u.title), JSON.stringify(u.images?.[0]||'')].join(',')).join('\n')
);
console.log('\nManifest: /tmp/family-set-manifest.json');
console.log('Re-shoot CSV: /mnt/documents/tableware_reshoot_queue.csv');

if (!APPLY) {
  console.log('\nDRY-RUN. Re-run with --apply to mirror + write.');
  process.exit(0);
}

// 6. APPLY: mirror unique Set URLs into bucket, then update images[]
console.log('\n=== APPLY ===');
const uniqueSets = new Map(); // famKey -> { srcUrl, targetPath, publicUrl }
for (const m of matches) {
  const fam = m.family;
  if (uniqueSets.has(fam)) continue;
  const targetPath = `_family-sets/${fam}/${m.set.filename}`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${targetPath.split('/').map(encodeURIComponent).join('/')}`;
  uniqueSets.set(fam, { srcUrl: m.set.imageUrl, targetPath, publicUrl });
}

let upOk = 0, upSkip = 0, upFail = [];
for (const [fam, info] of uniqueSets) {
  try {
    const head = await fetch(info.publicUrl, { method: 'HEAD' });
    if (head.ok) { upSkip++; continue; }
    const res = await fetch(info.srcUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || 'image/png';
    const { error: upErr } = await supa.storage.from(BUCKET).upload(info.targetPath, buf, { contentType: ct, upsert: false });
    if (upErr && !/already exists/i.test(upErr.message)) throw upErr;
    upOk++;
  } catch (err) {
    upFail.push({ fam, err: String(err.message || err) });
  }
}
console.log(`Mirror: ok=${upOk} skipped=${upSkip} failed=${upFail.length}`);
if (upFail.length) console.log(JSON.stringify(upFail, null, 2));

// 7. Update images[] — prepend mirrored URL at position 0
let dbOk = 0, dbFail = [];
for (const m of matches) {
  const info = uniqueSets.get(m.family);
  if (!info) continue;
  const newImages = [info.publicUrl, ...(m.images || []).filter(u => u !== info.publicUrl)];
  const { error: updErr } = await supa.from('inventory_items').update({ images: newImages }).eq('id', m.id);
  if (updErr) dbFail.push({ id: m.id, err: String(updErr.message) });
  else dbOk++;
}
console.log(`DB updates: ok=${dbOk} failed=${dbFail.length}`);
if (dbFail.length) console.log(JSON.stringify(dbFail, null, 2));
console.log('\nNext: node scripts/bake-catalog.mjs');
