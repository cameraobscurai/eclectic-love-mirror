// Find rows whose mirrored hero is a 2KB Squarespace lazy-load placeholder PNG,
// then re-harvest each Squarespace collection JSON feed (?format=json-pretty) and
// propose a real assetUrl per affected row. DRY-RUN ONLY — writes a manifest.
//
// Output: scripts-tmp/placeholder-rebind.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const PLACEHOLDER_BYTES = 2102; // empirically determined — Squarespace lazy-load PNG
const CONCURRENCY = 8;

const FEEDS = {
  textiles:        ['pillows-throws','furs-pelts'],
  light:           ['lighting','chandeliers','candlelight'],
  tableware:       ['tableware','serveware'],
  'large-decor':   ['large-decor','storage'],
  styling:         ['styling'],
  'lounge-tables': ['tables'],
  dining:          ['tables'],
  'cocktail-bar':  ['bars'],
  rugs:            ['rugs'],
  // NOTE: lounge-seating has no JSON feed
};

// 1. Load mirror-result and probe every mirrored URL (HEAD is enough — content-length is honest)
const mirror = JSON.parse(readFileSync('scripts-tmp/mirror-result.json', 'utf8'));
const okUploads = mirror.uploads.filter(u => u.status === 'ok');
console.log(`Probing ${okUploads.length} mirrored files for placeholder size…`);

async function pmap(items, fn, concurrency) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }));
  return out;
}

// publicUrl prefix
const PUB = `${SUPABASE_URL}/storage/v1/object/public/squarespace-mirror/`;

const probed = await pmap(okUploads, async (u) => {
  const url = PUB + u.path.split('/').map(encodeURIComponent).join('/');
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const len = Number(r.headers.get('content-length') || 0);
    return { ...u, public_url: url, bytes: len };
  } catch (e) {
    return { ...u, public_url: url, bytes: -1, err: String(e.message || e) };
  }
}, CONCURRENCY);

const placeholders = probed.filter(p => p.bytes === PLACEHOLDER_BYTES);
console.log(`Placeholders found: ${placeholders.length}`);

// Map publicUrl -> placeholder entry
const badPublicSet = new Set(placeholders.map(p => p.public_url));

// 2. Find affected DB rows: any row whose images[] contains a bad public URL
const affectedRows = [];
for (const row of mirror.rows) {
  if (row.status !== 'ok') continue;
  const bad = (row.after || []).filter(u => badPublicSet.has(u));
  if (bad.length) affectedRows.push({ rms_id: row.rms_id, before: row.before, after: row.after, bad });
}
console.log(`Rows with at least one placeholder image: ${affectedRows.length}`);

// 3. Pull row details from DB
const rmsIds = affectedRows.map(r => r.rms_id);
const { data: dbRows, error } = await sb.from('inventory_items')
  .select('rms_id,title,slug,category,images').in('rms_id', rmsIds);
if (error) throw error;
const dbByRms = new Map(dbRows.map(r => [r.rms_id, r]));

// 4. Harvest JSON feeds (cache to /tmp/feeds)
const FEED_CACHE = '/tmp/feeds';
if (!existsSync(FEED_CACHE)) mkdirSync(FEED_CACHE, { recursive: true });

const feedItems = []; // {feed, cats, urlId, title, hero, gallery, categories, tags}
for (const [feed, cats] of Object.entries(FEEDS)) {
  const cachePath = `${FEED_CACHE}/${feed}.json`;
  let json;
  if (existsSync(cachePath)) {
    json = JSON.parse(readFileSync(cachePath, 'utf8'));
  } else {
    const url = `https://www.eclectichive.com/${feed}?format=json-pretty`;
    console.log(`  fetching ${url}`);
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) { console.warn(`    HTTP ${r.status} for ${feed}`); continue; }
    json = await r.json();
    writeFileSync(cachePath, JSON.stringify(json));
  }
  for (const it of (json.items || [])) {
    const gallery = (it.items || []).map(x => x.assetUrl).filter(Boolean);
    feedItems.push({
      feed, cats,
      urlId: it.urlId,
      title: it.title,
      hero: it.assetUrl || gallery[0] || null,
      gallery,
      categories: it.categories || [],
      tags: it.tags || [],
    });
  }
}
console.log(`Feed items loaded: ${feedItems.length}`);

// 5. Token-match each affected row against feed items in same category
const STOP = new Set(['the','a','an','of','and','with','in','on','for','to','set','pillow','pillows','lumbar','oversize','large','small','bar','bars','table','tables','chair','sofa','lamp','light','lights','rug','throw','pendant','hide','sheepskin','fur','glass','bowl','tray','plate','cup','candle','lantern']);
const tok = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(t => t.length >= 2 && !STOP.has(t));

const indexed = feedItems.map(f => ({ ...f, tokens: new Set(tok(f.title)) }));

const proposals = { HIGH: [], MED: [], TIE: [], NONE: [], NO_FEED: [] };
for (const row of affectedRows) {
  const db = dbByRms.get(row.rms_id);
  if (!db) continue;
  const ptok = new Set(tok(db.title));

  // No feed for seating
  if (db.category === 'seating') {
    proposals.NO_FEED.push({ rms_id: db.rms_id, title: db.title, category: db.category, current_bad: row.bad });
    continue;
  }

  const pool = indexed.filter(f => f.cats.includes(db.category));
  if (!pool.length) {
    proposals.NO_FEED.push({ rms_id: db.rms_id, title: db.title, category: db.category, current_bad: row.bad });
    continue;
  }

  const scored = pool.map(f => {
    let s = 0; for (const t of ptok) if (f.tokens.has(t)) s++;
    return { f, s };
  }).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);

  if (!scored.length) { proposals.NONE.push({ rms_id: db.rms_id, title: db.title, category: db.category }); continue; }

  const top = scored[0];
  const tied = scored.filter(x => x.s === top.s);
  const bucket = tied.length === 1 ? (top.s >= 3 ? 'HIGH' : 'MED') : 'TIE';
  const candidates = tied.slice(0, 4).map(x => ({
    urlId: x.f.urlId, title: x.f.title, score: x.s, hero: x.f.hero, gallery: x.f.gallery,
  }));
  proposals[bucket].push({
    rms_id: db.rms_id, title: db.title, category: db.category,
    current_images: db.images, current_bad: row.bad,
    candidates,
  });
}

const summary = Object.fromEntries(Object.entries(proposals).map(([k, v]) => [k, v.length]));
console.log('\nProposal buckets:', summary);

writeFileSync('scripts-tmp/placeholder-rebind.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  placeholder_count: placeholders.length,
  affected_rows: affectedRows.length,
  summary,
  proposals,
}, null, 2));
console.log('Wrote scripts-tmp/placeholder-rebind.json');
