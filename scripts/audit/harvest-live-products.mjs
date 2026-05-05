// Harvest per-product detail from the live Squarespace JSON feeds.
// For each category, pulls listing then each product's ?format=json-pretty
// and captures: gallery image URLs, body description text, excerpt, variants.
// Output: scripts/audit/live-products.json
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const CATS = [
  'lounge','lounge-tables','cocktail-bar','dining','tableware',
  'textiles','rugs','styling','large-decor','light',
];
const OUT = 'scripts/audit/live-products.json';
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT,'utf8')) : {};
const out = { ...existing };

const stripHtml = h => String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const sleep = ms => new Promise(r=>setTimeout(r,ms));

for (const cat of CATS) {
  const url = `https://www.eclectichive.com/${cat}?format=json-pretty`;
  const r = await fetch(url, { headers: { 'user-agent':'eh-audit/1.0' }});
  if (!r.ok) { console.error('FAIL list', cat, r.status); continue; }
  const d = await r.json();
  const items = d.items || [];
  console.log(`[${cat}] ${items.length} items`);
  let n = 0;
  for (const it of items) {
    const slug = it.urlId;
    if (!slug) continue;
    if (out[slug]?.gallery?.length) { n++; continue; } // already harvested
    const purl = `https://www.eclectichive.com${it.fullUrl}?format=json-pretty`;
    try {
      const pr = await fetch(purl, { headers:{'user-agent':'eh-audit/1.0'}});
      if (!pr.ok) { console.error(' fail', slug, pr.status); continue; }
      const pd = await pr.json();
      const item = pd.item || {};
      const gallery = (item.items||[]).map(g => g.assetUrl).filter(Boolean);
      // also include item's own assetUrl if not in gallery
      if (item.assetUrl && !gallery.includes(item.assetUrl)) gallery.unshift(item.assetUrl);
      const variants = (item.variants||[]).map(v => ({
        sku: v.sku,
        attributes: v.attributes || {},
        mainImage: v.mainImage?.assetUrl || null,
      }));
      out[slug] = {
        slug,
        title: item.title || it.title,
        category: cat,
        subcategories: item.categories || it.categories || [],
        fullUrl: item.fullUrl || it.fullUrl,
        body: stripHtml(item.body),
        excerpt: stripHtml(item.excerpt),
        gallery,
        variants,
      };
      n++;
    } catch (e) {
      console.error(' err', slug, e.message);
    }
    await sleep(60);
  }
  console.log(`  -> harvested ${n}/${items.length}`);
  // checkpoint after each category
  writeFileSync(OUT, JSON.stringify(out, null, 2));
}
console.log('total slugs:', Object.keys(out).length);
