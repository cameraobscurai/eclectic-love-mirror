import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { rollupFamilies } from './family-rollup.mjs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Live Squarespace snapshot — source of truth for family groupings.
// Refresh with the JSON-feed harvest script when the live site changes.
let liveSnapshot = {};
try {
  liveSnapshot = JSON.parse(fs.readFileSync('/dev-server/scripts/audit/live-inventory-snapshot.json', 'utf8'));
} catch {
  console.warn('[bake] no live-inventory-snapshot.json — skipping family rollup (each variant will be its own tile)');
}

const CAT_DISPLAY = {
  'tableware':'Tableware','pillows-throws':'Pillows & Throws',
  'seating':'Seating','styling':'Styling','tables':'Tables','serveware':'Serveware',
  'bars':'Cocktail & Bar','large-decor':'Large Decor','lighting':'Lighting',
  'rugs':'Rugs','candlelight':'Candlelight','chandeliers':'Chandeliers',
  'storage':'Storage','furs-pelts':'Furs & Pelts',
};
const ORDER = ['seating','tables','bars','tableware','serveware','pillows-throws','rugs','lighting','candlelight','chandeliers','large-decor','styling','storage','furs-pelts'];

const INVENTORY_PUBLIC_MARKER = '/storage/v1/object/public/inventory/';

function restoredInventoryUrl(url) {
  if (typeof url !== 'string' || !url.includes(INVENTORY_PUBLIC_MARKER)) return url;
  const [base, pathPart] = url.split(INVENTORY_PUBLIC_MARKER);
  if (!pathPart || pathPart.startsWith('inventory/') || pathPart.startsWith('_squarespace/')) return url;
  return `${base}${INVENTORY_PUBLIC_MARKER}inventory/${pathPart}`;
}

// Tonal rank: lower = darker / earlier in the gradient. Encoded so a single
// numeric sort produces black → charcoal → brown → tan → cream → white, with
// chromatic items woven in by lightness band and hue (ROYGBIV nudge within band).
const FAMILY_BUCKET = {
  'black': 0, 'charcoal': 1, 'grey': 2, 'gray': 2,
  'brown': 3, 'tan': 4, 'cream': 5, 'white': 6,
  'metallic-warm': 5, 'metallic-cool': 2,
  // Chromatic families slot by their natural lightness; the bucket value is
  // a tiebreaker only — primary sort is on lightness within "all chromatic".
  'red': 7, 'orange': 7, 'yellow': 7, 'green': 8, 'blue': 8, 'purple': 8, 'pink': 7,
  'multi': 9,
};
function computeTonalRank(r) {
  if (r.color_lightness == null) return null;
  const family = (r.color_family || '').toLowerCase();
  const bucket = FAMILY_BUCKET[family] ?? 9;
  const L = Math.max(0, Math.min(100, Number(r.color_lightness)));
  const isNeutral = bucket <= 6;
  if (isNeutral) {
    // Neutrals: bucket dominates (so all blacks come before all charcoals etc.),
    // lightness orders within bucket.
    return bucket * 10000 + Math.round(L * 100);
  }
  // Chromatic: insert into the gradient by lightness, with a small ROYGBIV
  // nudge so similar-lightness chromatic items flow red→orange→yellow→green→blue→purple.
  // Map hue 0..360 → roygbiv index 0..6 (red=0, purple=6).
  const h = r.color_hue != null ? Number(r.color_hue) : 0;
  const roygbiv = Math.floor(((h + 15) % 360) / (360 / 7));
  // Weave chromatic items into the neutral spectrum at their lightness.
  // Base = neutral bucket nearest to L (charcoal..cream range).
  const neutralBase = L < 20 ? 1 : L < 40 ? 3 : L < 60 ? 4 : 5;
  return neutralBase * 10000 + Math.round(L * 100) + roygbiv;
}


const all = [];
let from = 0; const PAGE = 1000;
while (true) {
  const { data, error } = await sb.from('inventory_items')
    .select('rms_id,title,slug,category,quantity,quantity_label,dimensions_raw,images,updated_at,color_hex,color_hex_secondary,color_lightness,color_hue,color_chroma,color_family,color_temperature,color_needs_review')
    .neq('status','draft').range(from, from+PAGE-1).order('title');
  if (error) { console.error(error); process.exit(1); }
  if (!data.length) break;
  all.push(...data); from += data.length;
  if (data.length < PAGE) break;
}
console.log('public rows:', all.length);

// Live per-product harvest (gallery, body) — used as fallback when the
// owner has not yet supplied images, and to overlay live descriptions.
let liveProducts = {};
try {
  liveProducts = JSON.parse(fs.readFileSync('/dev-server/scripts/audit/live-products.json','utf8'));
} catch {
  console.warn('[bake] no live-products.json — run scripts/audit/harvest-live-products.mjs');
}
const liveProductByTitle = new Map();
const norm0 = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
for (const lp of Object.values(liveProducts)) {
  const t = norm0(lp.title);
  if (t && !liveProductByTitle.has(t)) liveProductByTitle.set(t, lp);
  const tStripped = t.split(' ').filter(w => !/^\d/.test(w) && w.length >= 2).join(' ');
  if (tStripped && !liveProductByTitle.has(tStripped)) liveProductByTitle.set(tStripped, lp);
}
function findLiveProduct(slug, title) {
  if (slug && liveProducts[slug]) return liveProducts[slug];
  const t = norm0(title);
  return liveProductByTitle.get(t)
    || liveProductByTitle.get(t.split(' ').filter(w=>!/^\d/.test(w)&&w.length>=2).join(' '));
}

let livesFallback = 0;
const products = all.map((r, i) => {
  let imgs = (r.images||[]).map((u,idx) => ({
    url: restoredInventoryUrl(u), position: idx, isHero: idx===0, inferredFilename: null, altText: r.title,
  }));
  const lp = findLiveProduct(r.slug, r.title);
  if (imgs.length === 0 && lp && lp.gallery && lp.gallery.length) {
    imgs = lp.gallery.map((u, idx) => ({
      url: u, position: idx, isHero: idx===0, inferredFilename: null, altText: r.title,
    }));
    livesFallback++;
  }
  const description = lp && lp.body ? lp.body : null;
  const stock = r.quantity_label ?? (r.quantity != null ? String(r.quantity) : null);
  return {
    id: r.rms_id,
    sourceUrl: lp?.fullUrl ? `https://www.eclectichive.com${lp.fullUrl}` : '',
    slug: r.slug,
    categorySlug: r.category,
    displayCategory: CAT_DISPLAY[r.category] || r.category,
    title: r.title,
    description,
    dimensions: r.dimensions_raw,
    stockedQuantity: stock,
    isCustomOrder: false,
    confidence: 1,
    needsManualReview: false,
    images: imgs,
    primaryImage: imgs[0] || null,
    imageCount: imgs.length,
    publicReady: true,
    scrapedOrder: i,
    subcategory: null,
    ownerSiteRank: null,
    colorHex: r.color_hex ?? null,
    colorHexSecondary: r.color_hex_secondary ?? null,
    colorLightness: r.color_lightness != null ? Number(r.color_lightness) : null,
    colorHue: r.color_hue != null ? Number(r.color_hue) : null,
    colorChroma: r.color_chroma != null ? Number(r.color_chroma) : null,
    colorFamily: r.color_family ?? null,
    colorTemperature: r.color_temperature ?? null,
    colorNeedsReview: !!r.color_needs_review,
    tonalRank: computeTonalRank(r),
  };
});

console.log(`[bake] live-image fallback used for ${livesFallback} products`);
const visibleProducts = products.filter(p => p.imageCount >= 1);
const hiddenForMissingImage = products.length - visibleProducts.length;
console.log('hidden (no image):', hiddenForMissingImage);

// Roll up RMS variant rows into one tile per product family
const { products: rolled, stats } = rollupFamilies(visibleProducts, liveSnapshot);
console.log(`[rollup] ${stats.inputRows} RMS rows -> ${stats.outputFamilies} family tiles (collapsed ${stats.collapsed})`);

// Assign ownerSiteRank + liveCategory/liveSubcategories from live-site map.
// Match by slug first, then by normalized title (RMS titles often differ).
const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
let liveSubcatMap = {};
try {
  const raw = JSON.parse(fs.readFileSync('/dev-server/scripts/audit/live-subcategory-map.json','utf8'));
  liveSubcatMap = raw.byLiveSlug || {};
} catch {}
const liveSlugInfo = new Map(); // slug -> {rank, category, subcategories}
const liveTitleInfo = new Map();
const liveFirstWordsInfo = new Map();
for (const [liveCat, items] of Object.entries(liveSnapshot || {})) {
  items.forEach((it, idx) => {
    const meta = liveSubcatMap[it.urlId] || {};
    const info = { rank: idx, category: meta.category || liveCat, subcategories: meta.subcategories || [] };
    if (it.urlId && !liveSlugInfo.has(it.urlId)) liveSlugInfo.set(it.urlId, info);
    const t = norm(it.title);
    if (t && !liveTitleInfo.has(t)) liveTitleInfo.set(t, info);
    const tStripped = t.split(' ').filter(w => !/^\d/.test(w) && w.length >= 2).join(' ');
    if (tStripped && !liveTitleInfo.has(tStripped)) liveTitleInfo.set(tStripped, info);
    const toks = tStripped.split(' ');
    for (let n = Math.min(toks.length, 5); n >= 1; n--) {
      const k = toks.slice(0, n).join(' ');
      if (k.length >= 4 && !liveFirstWordsInfo.has(k)) liveFirstWordsInfo.set(k, info);
    }
  });
}
// Strip number/dimension tokens that appear in RMS titles but not live titles
// (e.g. RMS "Nantucket 41 Oak Wood Column" vs live "Nantucket Oak Wood Column")
const stripNums = s => s.split(' ').filter(t => !/^\d/.test(t) && t.length >= 2).join(' ');
let ranked = 0;
for (const p of rolled) {
  const nTitle = norm(p.title);
  const nStripped = stripNums(nTitle);
  let info = liveSlugInfo.get(p.slug)
    || liveTitleInfo.get(nTitle)
    || liveTitleInfo.get(nStripped);
  if (!info) {
    const toks = nStripped.split(' ');
    for (let n = Math.min(toks.length, 5); n >= 1 && !info; n--) {
      const k = toks.slice(0, n).join(' ');
      if (k.length >= 4) info = liveFirstWordsInfo.get(k);
    }
  }
  if (info) {
    p.ownerSiteRank = info.rank;
    p.liveCategory = info.category;
    p.liveSubcategories = info.subcategories;
    ranked++;
  }
}
console.log(`[rank] assigned ownerSiteRank+liveCategory to ${ranked}/${rolled.length} tiles`);

// Overlay live-site description + gallery onto rolled family tiles using
// the family title (e.g. "Anastasia Antique Silver Flatware") which often
// only matches at the family level, not at the RMS variant level.
let descAdded = 0, galleryMerged = 0;
for (const p of rolled) {
  const lp = findLiveProduct(p.slug, p.title);
  if (!lp) continue;
  if (!p.description && lp.body) { p.description = lp.body; descAdded++; }
  if (!p.sourceUrl && lp.fullUrl) p.sourceUrl = `https://www.eclectichive.com${lp.fullUrl}`;
  // If DB had no images, seed from live gallery; otherwise leave owner images alone.
  if ((p.imageCount === 0) && lp.gallery && lp.gallery.length) {
    const imgs = lp.gallery.map((u, idx) => ({
      url: u, position: idx, isHero: idx===0, inferredFilename: null, altText: p.title,
    }));
    p.images = imgs;
    p.primaryImage = imgs[0];
    p.imageCount = imgs.length;
    galleryMerged++;
  }
}
console.log(`[live-overlay] descriptions added: ${descAdded}, galleries seeded: ${galleryMerged}`);





const facetsMap = {};
for (const p of rolled) {
  if (!facetsMap[p.categorySlug]) facetsMap[p.categorySlug] = { slug:p.categorySlug, display:p.displayCategory, count:0 };
  facetsMap[p.categorySlug].count++;
}
const facets = ORDER.filter(s=>facetsMap[s]).map(s=>facetsMap[s]).concat(
  Object.values(facetsMap).filter(f=>!ORDER.includes(f.slug))
);

const payload = {
  products: rolled, facets, total: rolled.length,
  meta: {
    generatedAt: new Date().toISOString(),
    totalRecords: rolled.length,
    rmsRowCount: products.length,
    rolledUpCount: stats.collapsed,
    publicReadyCount: rolled.length,
    excludedCount: hiddenForMissingImage,
    excludedReason: 'awaiting-image',
    categoryDisplayOrder: facets.map(f=>f.display),
    familyRollupSources: stats.sourceCounts,
  },
};

const outDir = '/dev-server/src/data/inventory';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'current_catalog.json'), JSON.stringify(payload));
console.log('wrote current_catalog.json:', products.length, 'products,', facets.length, 'facets');
console.log('facets:', facets.map(f=>`${f.slug}(${f.count})`).join(' '));
