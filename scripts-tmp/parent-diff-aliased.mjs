// Re-runs fuzzy diff WITH alias map applied. Items in alias.pairs/groups
// are pre-matched, so the diff shows only true gaps.
import fs from 'node:fs';

const FEED_TO_PARENT = {
  'lounge':'lounge-seating', 'lounge-tables':'lounge-tables', 'cocktail-bar':'cocktail-bar',
  'dining':'dining', 'tableware':'tableware', 'light':'lighting',
  'textiles':'textiles', 'rugs':'rugs', 'styling':'styling', 'large-decor':'large-decor',
};
const aliases = JSON.parse(fs.readFileSync('scripts-tmp/title-aliases.json','utf8'));

// rms_id → live title
const rmsToLive = new Map();
for (const p of aliases.pairs)  rmsToLive.set(String(p.rms), p.live);
for (const g of aliases.groups) for (const r of g.rms) rmsToLive.set(String(r), g.live);

const STOP = new Set(['the','a','an','of','and','with','&','for','to','in','on','plus','+']);
const tokens = s => new Set(
  (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/)
    .filter(t => t.length>=1 && !STOP.has(t))
);
const jaccard = (a,b) => {
  if (!a.size || !b.size) return 0;
  let inter=0; for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8')).products;
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
const productParent = p =>
  (p.liveCategory && LIVE_CAT_TO_PARENT[p.liveCategory]) ||
  CAT_TO_PARENT[p.categorySlug] || null;

const ourByParent = {};
for (const p of catalog) {
  const par = productParent(p);
  if (!par) continue;
  // if aliased, replace effective title for matching
  const effTitle = rmsToLive.get(String(p.id)) || p.title;
  (ourByParent[par] ||= []).push({ title: p.title, effTitle, rms: p.id, tok: tokens(effTitle), aliased: rmsToLive.has(String(p.id)) });
}

const report = [];
for (const [slug, parent] of Object.entries(FEED_TO_PARENT)) {
  const items = JSON.parse(fs.readFileSync(`/tmp/feeds/${slug}.json`,'utf8')).items;
  const live = items.map(it => ({ title: it.title, urlId: it.urlId, tok: tokens(it.title) }));
  const ours = ourByParent[parent] || [];

  const liveMatch = live.map(L => {
    let best = { score: 0, our: null };
    for (const O of ours) {
      const s = jaccard(L.tok, O.tok);
      if (s > best.score) best = { score: s, our: O };
    }
    return { live: L, ...best };
  });
  // greedy: strong matches claim ours first; FAMILY rollups can claim multiple
  liveMatch.sort((a,b)=>b.score-a.score);
  const ourUsed = new Set();
  for (const m of liveMatch) {
    if (!m.our) continue;
    if (m.our.aliased && rmsToLive.get(String(m.our.rms)) === m.live.title) {
      // family rollup: claim ALL ours rows whose alias === this live title
      for (const O of ours) {
        if (rmsToLive.get(String(O.rms)) === m.live.title) ourUsed.add(O.rms);
      }
      continue;
    }
    if (ourUsed.has(m.our.rms)) { m.our = null; m.score = 0; }
    else ourUsed.add(m.our.rms);
  }
  const matched = liveMatch.filter(m => m.score >= 0.4);
  const liveOnly = liveMatch.filter(m => m.score <  0.4);
  const oursOnly = ours.filter(o => !ourUsed.has(o.rms));

  report.push({ parent, slug,
    live: live.length, ours: ours.length,
    matched: matched.length,
    liveOnly: liveOnly.map(m => m.live.title),
    oursOnly: oursOnly.map(o => `${o.title} [rms${o.rms}]`),
  });
}

fs.writeFileSync('scripts-tmp/parent-diff-aliased.json', JSON.stringify(report, null, 2));

console.log('PARENT'.padEnd(18), 'LIVE OURS  ✅  🔴live  🔴ours');
for (const r of report) {
  console.log(
    r.parent.padEnd(18),
    String(r.live).padStart(4), String(r.ours).padStart(4),
    String(r.matched).padStart(4),
    String(r.liveOnly.length).padStart(6), String(r.oursOnly.length).padStart(7),
  );
}

console.log('\n— 🔴 LIVE-ONLY (truly missing from RMS) —');
for (const r of report) {
  if (!r.liveOnly.length) continue;
  console.log(`\n[${r.parent}] ${r.liveOnly.length}`);
  for (const t of r.liveOnly) console.log(`  - ${t}`);
}

console.log('\n— 🔴 OURS-ONLY (in RMS, not on live site) —');
for (const r of report) {
  if (!r.oursOnly.length) continue;
  console.log(`\n[${r.parent}] ${r.oursOnly.length}`);
  for (const t of r.oursOnly) console.log(`  + ${t}`);
}
