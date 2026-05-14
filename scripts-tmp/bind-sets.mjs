import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PUBLIC = `${process.env.SUPABASE_URL}/storage/v1/object/public/incoming-photos`;
const enc = p => p.split('/').map(encodeURIComponent).join('/');

const FOLDER_TO_CAT = {
  'candlelight': 'candlelight',
  'lighting/hanging': 'chandeliers',
  'serveware': 'serveware',
  'styling': 'styling',
  'tables/columns-pedestals': 'tables',
  'tablewear/dinnerware': 'tableware',
  'tablewear/flatware': 'tableware',
  'tablewear/glassware': 'tableware',
};
const SKIP = new Set(['INOLA','IRAJA','EXCURSION']);

async function walk(prefix='') {
  const out = [];
  const { data } = await sb.storage.from('incoming-photos').list(prefix, { limit: 1000 });
  for (const e of data || []) {
    const full = prefix ? `${prefix}/${e.name}` : e.name;
    if (!e.id) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const files = (await walk('')).filter(f => /\bset\b/i.test(f));

// Group by family within folder. Family = first ALL-CAPS token.
const groups = new Map();
for (const f of files) {
  const slash = f.lastIndexOf('/');
  const folder = f.slice(0, slash);
  const name = f.slice(slash+1);
  const family = name.split(/[\s_]+/)[0].toUpperCase();
  if (SKIP.has(family)) continue;
  const cat = FOLDER_TO_CAT[folder];
  if (!cat) { console.log('!! no category for folder', folder); continue; }
  const key = `${folder}::${family}`;
  if (!groups.has(key)) groups.set(key, { folder, family, cat, files: [] });
  groups.get(key).files.push(name);
}

// Pick canonical Set file per family: prefer no number suffix, then "Exact", then lowest number
for (const g of groups.values()) {
  g.files.sort((a,b) => {
    const an = /\s(\d+)\.[^.]+$/.test(a) ? parseInt(a.match(/\s(\d+)\.[^.]+$/)[1]) : -1;
    const bn = /\s(\d+)\.[^.]+$/.test(b) ? parseInt(b.match(/\s(\d+)\.[^.]+$/)[1]) : -1;
    const ae = /exact/i.test(a) ? 0 : 1;
    const be = /exact/i.test(b) ? 0 : 1;
    if (an !== bn) return an - bn;        // -1 (no suffix) wins
    return ae - be;
  });
  g.coverFile = g.files[0];
  g.coverUrl = `${PUBLIC}/${enc(`${g.folder}/${g.coverFile}`)}`;
}

// Load inventory
const { data: inv } = await sb.from('inventory_items')
  .select('id,title,category,images')
  .neq('status','draft');

const norm = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();

const manifest = [];
const empties = [];
for (const g of groups.values()) {
  const matches = inv.filter(it => {
    if (it.category !== g.cat) return false;
    const t = norm(it.title).split(' ');
    return t[0] === g.family;
  }).map(it => ({
    id: it.id, title: it.title,
    alreadyCover: (it.images?.[0] === g.coverUrl),
    hasInList: (it.images || []).includes(g.coverUrl),
  }));
  if (!matches.length) empties.push(`${g.folder} ${g.family}`);
  manifest.push({ ...g, matches });
}

writeFileSync('/tmp/set-cover-manifest.json', JSON.stringify(manifest, null, 2));

console.log('\n=== SET COVER MANIFEST ===');
for (const m of manifest) {
  console.log(`${m.cat.padEnd(11)} ${m.family.padEnd(12)} → ${m.matches.length} variants  [${m.coverFile}]`);
  if (m.matches.length && m.matches.length <= 8) {
    for (const x of m.matches) console.log(`     - ${x.title}${x.alreadyCover?' ✓cover':''}`);
  }
}
console.log(`\nFamilies: ${manifest.length}  | matched-zero: ${empties.length}`);
if (empties.length) console.log('Zero-match:', empties.join(', '));
const total = manifest.reduce((a,m)=>a+m.matches.length,0);
const needWrite = manifest.reduce((a,m)=>a+m.matches.filter(x=>!x.alreadyCover).length,0);
console.log(`Total variant rows: ${total}  | need write: ${needWrite}`);
