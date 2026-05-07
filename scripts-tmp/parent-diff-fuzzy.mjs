// Step 1 — fuzzy diff. Read-only.
// Token-set Jaccard on normalized titles. Buckets:
//   matched (>=0.6) | maybe-rename (0.4-0.6) | real-gap (<0.4 best score)
import fs from 'node:fs';

const FEED_TO_PARENT = {
  'lounge':'lounge-seating', 'lounge-tables':'lounge-tables', 'cocktail-bar':'cocktail-bar',
  'dining':'dining', 'tableware':'tableware', 'light':'lighting',
  'textiles':'textiles', 'rugs':'rugs', 'styling':'styling', 'large-decor':'large-decor',
};

const STOP = new Set(['the','a','an','of','and','with','&','for','to','in','on','plus','+']);
const tokens = s => new Set(
  (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/)
    .filter(t => t.length>=2 && !STOP.has(t))
);
const jaccard = (a,b) => {
  if (!a.size || !b.size) return 0;
  let inter=0; for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

// catalog → ours by parent
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
  (ourByParent[par] ||= []).push({ title: p.title, rms: p.id, tok: tokens(p.title) });
}

// load cached feeds (fetched in previous run)
const report = [];
for (const [slug, parent] of Object.entries(FEED_TO_PARENT)) {
  const items = JSON.parse(fs.readFileSync(`/tmp/feeds/${slug}.json`,'utf8')).items;
  const live = items.map(it => ({ title: it.title, urlId: it.urlId, tok: tokens(it.title) }));
  const ours = ourByParent[parent] || [];

  // build best-pair scores
  const liveMatch = live.map(L => {
    let best = { score: 0, our: null };
    for (const O of ours) {
      const s = jaccard(L.tok, O.tok);
      if (s > best.score) best = { score: s, our: O };
    }
    return { live: L, ...best };
  });
  const ourUsed = new Set(); // greedy dedupe of matched ours
  // sort by score desc so strong matches claim first
  liveMatch.sort((a,b)=>b.score-a.score);
  for (const m of liveMatch) {
    if (m.our && ourUsed.has(m.our.rms)) m.our = null, m.score = 0;
    else if (m.our) ourUsed.add(m.our.rms);
  }
  const matched   = liveMatch.filter(m => m.score >= 0.6);
  const maybe     = liveMatch.filter(m => m.score >= 0.4 && m.score < 0.6);
  const realGap   = liveMatch.filter(m => m.score <  0.4);
  // ours not claimed = items in our catalog with no live counterpart
  const ourOrphans = ours.filter(o => !ourUsed.has(o.rms));

  report.push({ parent, slug,
    live: live.length, ours: ours.length,
    matched: matched.length, maybe: maybe.length,
    realGap_liveOnly: realGap.length, realGap_oursOnly: ourOrphans.length,
    maybePairs:  maybe.map(m => ({ live: m.live.title, our: m.our.title, score: +m.score.toFixed(2) })),
    liveOnly:    realGap.map(m => m.live.title),
    oursOnly:    ourOrphans.map(o => `${o.title} [rms${o.rms}]`),
  });
}

fs.writeFileSync('scripts-tmp/parent-diff-fuzzy.json', JSON.stringify(report, null, 2));

// pretty print
console.log('PARENT'.padEnd(18), 'LIVE OURS  ✅  ❓  🔴live  🔴ours');
for (const r of report) {
  console.log(
    r.parent.padEnd(18),
    String(r.live).padStart(4), String(r.ours).padStart(4),
    String(r.matched).padStart(4), String(r.maybe).padStart(4),
    String(r.realGap_liveOnly).padStart(6), String(r.realGap_oursOnly).padStart(7),
  );
}
console.log('\n→ scripts-tmp/parent-diff-fuzzy.json (full pairs + names)');

console.log('\n— ❓ MAYBE RENAMES (review): pairs by parent —');
for (const r of report) {
  if (!r.maybePairs.length) continue;
  console.log(`\n[${r.parent}] ${r.maybePairs.length}`);
  for (const p of r.maybePairs.slice(0,12))
    console.log(`  ${p.score}  "${p.live}"  ↔  "${p.our}"`);
  if (r.maybePairs.length > 12) console.log(`  …+${r.maybePairs.length-12} more`);
}

console.log('\n— 🔴 REAL GAPS — live only (not in our catalog) —');
for (const r of report) {
  if (!r.liveOnly.length) continue;
  console.log(`\n[${r.parent}] ${r.liveOnly.length}`);
  for (const t of r.liveOnly) console.log(`  - ${t}`);
}

console.log('\n— 🔴 REAL GAPS — ours only (in catalog, not on live) —');
for (const r of report) {
  if (!r.oursOnly.length) continue;
  console.log(`\n[${r.parent}] ${r.oursOnly.length}`);
  for (const t of r.oursOnly) console.log(`  + ${t}`);
}
