// Diff live Squarespace feeds vs our runtime parent classification.
// For each parent: list (a) titles on live but missing from our parent,
// (b) titles in our parent but not on live, (c) totals.
//
// Re-harvests feeds with pagination so counts match the live site.
import fs from 'node:fs';

const FEED_TO_PARENT = {
  'lounge':         'lounge-seating',
  'lounge-tables':  'lounge-tables',
  'cocktail-bar':   'cocktail-bar',
  'dining':         'dining',
  'tableware':      'tableware',
  'light':          'lighting',
  'textiles':       'textiles',
  'rugs':           'rugs',
  'styling':        'styling',
  'large-decor':    'large-decor',
};

const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

async function fetchFeed(slug) {
  const items = [];
  let offset = null;
  for (let i = 0; i < 20; i++) {
    const url = `https://www.eclectichive.com/${slug}?format=json-pretty${offset?`&offset=${offset}`:''}`;
    const r = await fetch(url, { headers: { 'user-agent':'eh-diff/1.0' }});
    if (!r.ok) { console.error(' fail', slug, r.status); break; }
    const d = await r.json();
    const batch = d.items || [];
    items.push(...batch);
    if (!d.pagination || !d.pagination.nextPageOffset) break;
    offset = d.pagination.nextPageOffset;
  }
  return items;
}

// ── load runtime catalog & classifier ─────────────────────────────────
const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));
// classify each catalog row using the same logic as the site
const { productParent } = await import('../src/lib/collection-parents.ts').catch(async () => {
  // fall back: re-implement minimal parent routing using liveCategory
  const LIVE_CAT_TO_PARENT = {
    'lounge':'lounge-seating','lounge-tables':'lounge-tables','cocktail-bar':'cocktail-bar',
    'dining':'dining','tableware':'tableware','textiles':'textiles','rugs':'rugs',
    'styling':'styling','large-decor':'large-decor','light':'lighting',
  };
  const CAT_TO_PARENT = {
    seating:'lounge-seating', tables:'lounge-tables', bars:'cocktail-bar',
    tableware:'tableware', serveware:'tableware',
    'pillows-throws':'textiles', 'furs-pelts':'furs-pelts',
    rugs:'rugs', lighting:'lighting', chandeliers:'lighting', candlelight:'lighting',
    'large-decor':'large-decor', styling:'styling', storage:'cocktail-bar',
  };
  return { productParent: (p) => p.liveCategory && LIVE_CAT_TO_PARENT[p.liveCategory] || CAT_TO_PARENT[p.category] || null };
});

const ourByParent = {};
for (const p of catalog) {
  const par = productParent(p);
  if (!par) continue;
  (ourByParent[par] ||= []).push({ title: p.title, rms: p.rmsId, key: norm(p.title) });
}

// ── pull live feeds & diff ────────────────────────────────────────────
const report = [];
for (const [slug, parent] of Object.entries(FEED_TO_PARENT)) {
  const items = await fetchFeed(slug);
  const live = items.map(it => ({ title: it.title, urlId: it.urlId, key: norm(it.title) }));
  fs.writeFileSync(`/tmp/feeds/${slug}.json`, JSON.stringify({ items }, null, 2));
  const ours = ourByParent[parent] || [];
  const liveKeys = new Set(live.map(x=>x.key));
  const ourKeys  = new Set(ours.map(x=>x.key));
  const missingFromOurs = live.filter(x => !ourKeys.has(x.key));
  const extraInOurs     = ours.filter(x => !liveKeys.has(x.key));
  report.push({ parent, slug, live: live.length, ours: ours.length,
    missingFromOurs: missingFromOurs.map(x=>`${x.title} [${x.urlId}]`),
    extraInOurs: extraInOurs.map(x=>`${x.title} [rms${x.rms}]`),
  });
  console.log(`\n## ${parent.toUpperCase()}  live=${live.length}  ours=${ours.length}  diff=${live.length - ours.length}`);
  if (missingFromOurs.length) {
    console.log(`  MISSING FROM OURS (${missingFromOurs.length}):`);
    for (const x of missingFromOurs) console.log(`    - ${x.title}  [urlId:${x.urlId}]`);
  }
  if (extraInOurs.length) {
    console.log(`  EXTRA IN OURS (${extraInOurs.length}):`);
    for (const x of extraInOurs) console.log(`    + ${x.title}  [rms${x.rms}]`);
  }
}

fs.writeFileSync('scripts-tmp/parent-diff-all.json', JSON.stringify(report, null, 2));
console.log('\n→ scripts-tmp/parent-diff-all.json');
