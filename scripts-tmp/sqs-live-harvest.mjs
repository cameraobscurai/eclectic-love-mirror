// Pull live product truth from eclectichive.com JSON feeds.
// Output: scripts-tmp/sqs-live-truth.json + summary
import { writeFileSync } from 'node:fs';

const CATS = [
  'lounge','lounge-tables','cocktail-bar','dining','tableware',
  'textiles','rugs','styling','large-decor','light',
];

const stripHtml = h => String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'\"').replace(/&#39;/g,"'").replace(/\\s+/g,' ').trim();
const sleep = ms => new Promise(r=>setTimeout(r,ms));

// Normalize an asset URL to a canonical full-size form for dedupe.
// Squarespace appends ?format=2500w etc. Keep base URL only.
function canonUrl(u){
  if (!u) return u;
  return u.split('?')[0];
}

const out = {};
const perCat = {};

for (const cat of CATS) {
  const url = `https://www.eclectichive.com/${cat}?format=json-pretty`;
  let r;
  try { r = await fetch(url, { headers:{'user-agent':'eh-mirror/1.0'}}); }
  catch (e) { console.error('LIST-ERR', cat, e.message); continue; }
  if (!r.ok) { console.error('LIST-FAIL', cat, r.status); continue; }
  const d = await r.json();
  const items = d.items || [];
  perCat[cat] = items.length;
  console.log(`[${cat}] ${items.length} live items`);

  for (const it of items) {
    const slug = it.urlId;
    if (!slug) continue;
    const purl = `https://www.eclectichive.com${it.fullUrl}?format=json-pretty`;
    try {
      const pr = await fetch(purl, { headers:{'user-agent':'eh-mirror/1.0'}});
      if (!pr.ok) { console.error(' fail', slug, pr.status); continue; }
      const pd = await pr.json();
      const item = pd.item || {};
      const gallery = (item.items||[]).map(g => canonUrl(g.assetUrl)).filter(Boolean);
      const heroAsset = canonUrl(item.assetUrl);
      // hero first; dedupe; preserve order
      const seen = new Set(); const ordered = [];
      if (heroAsset) { seen.add(heroAsset); ordered.push(heroAsset); }
      for (const g of gallery) if (g && !seen.has(g)) { seen.add(g); ordered.push(g); }

      // accumulate per-slug; if same slug appears in multiple cats, merge categories
      const prev = out[slug];
      if (prev) {
        if (!prev.categories.includes(cat)) prev.categories.push(cat);
      } else {
        out[slug] = {
          slug,
          title: item.title || it.title,
          categories: [cat],
          fullUrl: item.fullUrl || it.fullUrl,
          body: stripHtml(item.body),
          excerpt: stripHtml(item.excerpt),
          images: ordered,
        };
      }
    } catch (e) {
      console.error(' err', slug, e.message);
    }
    await sleep(40);
  }
  // checkpoint after each category
  writeFileSync('scripts-tmp/sqs-live-truth.json', JSON.stringify(out, null, 2));
}

const slugs = Object.keys(out);
const allUrls = new Set();
for (const p of Object.values(out)) for (const u of p.images) allUrls.add(u);

const summary = [
  `LIVE HARVEST — ${new Date().toISOString()}`,
  '',
  'Per-category live item counts:',
  ...Object.entries(perCat).map(([c,n]) => `  ${c.padEnd(16)} ${n}`),
  '',
  `Total unique product slugs: ${slugs.length}`,
  `Total unique image URLs:    ${allUrls.size}`,
  '',
  `Output: scripts-tmp/sqs-live-truth.json`,
].join('\n');
writeFileSync('scripts-tmp/sqs-live-truth.summary.txt', summary);
console.log('\n'+summary);
