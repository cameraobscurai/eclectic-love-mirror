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

// Title alias overrides — RMS id → preferred live title (presentation only).
// Source: scripts-tmp/title-aliases.json (curated against live Squarespace).
let titleAliasByRms = new Map();
let forcedFamilyGroups = [];
try {
  const aliases = JSON.parse(fs.readFileSync('/dev-server/scripts-tmp/title-aliases.json', 'utf8'));
  for (const p of aliases.pairs || []) {
    if (p.rms && p.live) titleAliasByRms.set(String(p.rms), p.live);
  }
  forcedFamilyGroups = aliases.groups || [];
  console.log(`[bake] loaded ${titleAliasByRms.size} title aliases, ${forcedFamilyGroups.length} forced family groups`);
} catch {
  console.warn('[bake] no title-aliases.json — skipping alias overrides');
}

// Slugs that live at the ROOT of the `inventory` bucket (no `inventory/` prefix).
// These were uploaded directly under the bucket root rather than under the
// owner-upload `inventory/` folder, so the legacy "restore prefix" logic must
// skip them or it will produce 404 URLs like `inventory/inventory/<slug>/...`.
const INVENTORY_ROOT_SLUGS = new Set([
  'moxxi-black-dining-chair',
  'gerwyn-grey-dining-chair',
  'tove-grey-dining-table',
  'nero-round-grey-dining-table',
  'zoe-oak-dining-chair',
  'excursion-champagne-trunk-bar',
  'lars-bleached-oak-dining-table',
  'kohl-round-black-dining-table',
  'elgin-pony-bronze-bookend-set',
  'elgin-pony-silver-bookend-set',
]);

function restoredInventoryUrl(url) {
  if (typeof url !== 'string' || !url.includes(INVENTORY_PUBLIC_MARKER)) return url;
  const [base, pathPart] = url.split(INVENTORY_PUBLIC_MARKER);
  if (!pathPart || pathPart.startsWith('inventory/') || pathPart.startsWith('_squarespace/')) return url;
  const firstSeg = pathPart.split('/')[0];
  if (INVENTORY_ROOT_SLUGS.has(firstSeg)) return url;
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
    .select('rms_id,title,slug,category,quantity,quantity_label,dimensions_raw,images,updated_at,color_hex,color_hex_secondary,color_lightness,color_hue,color_chroma,color_family,color_temperature,color_needs_review,owner_site_rank')
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
  const aliasedTitle = titleAliasByRms.get(String(r.rms_id)) || r.title;
  const stock = r.quantity_label ?? (r.quantity != null ? String(r.quantity) : null);
  return {
    id: r.rms_id,
    sourceUrl: lp?.fullUrl ? `https://www.eclectichive.com${lp.fullUrl}` : '',
    slug: r.slug,
    categorySlug: r.category,
    displayCategory: CAT_DISPLAY[r.category] || r.category,
    title: aliasedTitle,
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
    // Compact per-product version derived from the row's updated_at. Appended
    // as ?v=… to Supabase storage URLs at read-time so a newly uploaded image
    // displaces the cached copy the moment the row is touched, while
    // unchanged products keep using the browser cache.
    imagesVersion: r.updated_at ? Math.floor(new Date(r.updated_at).getTime() / 1000) : 0,
    ownerSiteRank: r.owner_site_rank ?? null,
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
const { products: rolled, stats } = rollupFamilies(visibleProducts, liveSnapshot, forcedFamilyGroups);
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

// Manual placement overrides — slug → { ownerSiteRank, liveCategory? }
// Use to slot items the live-snapshot matcher missed.
const MANUAL_RANK_OVERRIDES = {
  // Giesel Green Fringe Lamp → after Jana Matte Bronze Cabaret (25), before Winona Silver Trophy (27)
  'giesel-green-fringe-lamp-3535': { ownerSiteRank: 26, liveCategory: 'lighting' },
};
for (const p of rolled) {
  const ov = MANUAL_RANK_OVERRIDES[p.slug];
  if (!ov) continue;
  if (ov.ownerSiteRank != null) p.ownerSiteRank = ov.ownerSiteRank;
  if (ov.liveCategory) p.liveCategory = ov.liveCategory;
}

// Overlay live-site description + gallery onto rolled family tiles using
// the family title (e.g. "Anastasia Antique Silver Flatware") which often
// only matches at the family level, not at the RMS variant level.
let descAdded = 0, galleryMerged = 0, heroOverridden = 0;
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
    continue;
  }
  // Hero override for rolled families: when a family was assembled from
  // multiple RMS variants (e.g. flatware sets, goblets, trays, stoneware),
  // the default cover photo is whichever variant happened to sort first —
  // typically a single-utensil shot. The live Squarespace tile shows a
  // stylized group hero; use it as the cover image while keeping owner
  // uploads as the rest of the gallery for the detail view.
  const isRolled = (p.variants && p.variants.length > 0);
  // Respect owner-uploaded covers: if the current primary image is from the
  // `inventory/` bucket (owner originals), do NOT overwrite it with the live
  // Squarespace hero. Owners explicitly choose these.
  const currentPrimaryUrl = (p.primaryImage && p.primaryImage.url) || (p.images && p.images[0] && (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].url)) || '';
  const ownerCoverWins = /\/storage\/v1\/object\/public\/inventory\//.test(currentPrimaryUrl);
  if (isRolled && !ownerCoverWins && lp.gallery && lp.gallery.length) {
    const liveHero = lp.gallery[0];
    const seen = new Set();
    const seenKeys = new Set();
    const merged = [];
    // Dedup key: lowercased basename, ignoring '+' vs '%20' vs ' ', so the
    // live Squarespace CDN copy and our squarespace-mirror copy of the same
    // file collapse into one slot.
    const keyFor = (url) => {
      try {
        const path = new URL(url).pathname;
        const base = decodeURIComponent(path.split('/').pop() || '')
          .replace(/\+/g, ' ')
          .replace(/[_\s]+/g, ' ')
          .trim()
          .toLowerCase();
        return base || url;
      } catch { return url; }
    };
    const pushUrl = (url) => {
      if (!url) return;
      const k = keyFor(url);
      if (seen.has(url) || seenKeys.has(k)) return;
      seen.add(url); seenKeys.add(k);
      merged.push({ url, position: merged.length, isHero: merged.length===0, inferredFilename: null, altText: p.title });
    };
    pushUrl(liveHero);
    for (const img of (p.images || [])) pushUrl(typeof img === 'string' ? img : img.url);
    for (const u of lp.gallery.slice(1)) pushUrl(u);
    p.images = merged;
    p.primaryImage = merged[0];
    p.imageCount = merged.length;
    heroOverridden++;
  }
}
console.log(`[live-overlay] descriptions added: ${descAdded}, galleries seeded: ${galleryMerged}, hero overrides: ${heroOverridden}`);





const facetsMap = {};
for (const p of rolled) {
  if (!facetsMap[p.categorySlug]) facetsMap[p.categorySlug] = { slug:p.categorySlug, display:p.displayCategory, count:0 };
  facetsMap[p.categorySlug].count++;
}
const facets = ORDER.filter(s=>facetsMap[s]).map(s=>facetsMap[s]).concat(
  Object.values(facetsMap).filter(f=>!ORDER.includes(f.slug))
);

// Owner directive (Tableware notes 2026-05): every inventory proper name
// must render ALL CAPS. CSS `text-transform: uppercase` is applied at every
// render site, but normalize the source data too so contact-form summaries,
// JSON-LD, alt text, and any future surface stay consistent.
const upperTitle = (s) => (typeof s === 'string' ? s.toUpperCase() : s);
for (const p of rolled) {
  if (p.title) p.title = upperTitle(p.title);
  if (Array.isArray(p.variants)) {
    for (const v of p.variants) {
      if (v && v.title) v.title = upperTitle(v.title);
    }
  }
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      if (img && img.altText) img.altText = upperTitle(img.altText);
    }
  }
  if (p.primaryImage && p.primaryImage.altText) {
    p.primaryImage.altText = upperTitle(p.primaryImage.altText);
  }
}

// Per-product image blocklist — surgical fix for known duplicate images that
// slip through the basename dedupe (live Squarespace gallery uses different
// filenames than the owner-uploaded inventory PNGs of the same plate).
// Patterns are matched as case-insensitive substrings against the image URL.
// Add only after eyeballing the modal; do NOT use this to mass-prune.
const storagePublicBase = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
const storageUrl = (bucket, key) => encodeURI(`${storagePublicBase}/${bucket}/${key}`);
const IMAGE_URL_OVERRIDES = {
  'anastasia-antique-silver-collection': [
    ['anastasia+set.png', storageUrl('inventory', 'inventory/TABLEWEAR/ANASTASIA Set.png')],
  ],
  'lapis-deep-blue-plates': [
    ['lapis+set.png', storageUrl('inventory', 'inventory/TABLEWEAR/LAPIS Set.png')],
    ['lapis+blue+10.5.png', storageUrl('squarespace-mirror', 'squarespace/_extras/893a473043ba-LAPIS_Blue_10.5.png')],
  ],
  'lavanya-stoneware-collection': [
    ['lavanya+set.png', storageUrl('inventory', 'inventory/TABLEWEAR/LAVANYA Set.png')],
    ['lavanya+6+plate.png', storageUrl('squarespace-mirror', 'squarespace/_extras/5d1461f72f25-LAVANYA_6_Plate.png')],
  ],
};
let storageOverridesApplied = 0;
for (const p of rolled) {
  const overrides = IMAGE_URL_OVERRIDES[p.slug];
  if (!overrides || !Array.isArray(p.images)) continue;
  for (const img of p.images) {
    const url = typeof img === 'string' ? img : img.url || '';
    const match = overrides.find(([pat]) => url.toLowerCase().includes(pat));
    if (!match) continue;
    if (typeof img === 'string') continue;
    img.url = match[1];
    storageOverridesApplied++;
  }
  if (p.primaryImage && p.images[0] && typeof p.images[0] !== 'string') p.primaryImage = p.images[0];
}
console.log(`[image-storage-overrides] rewired ${storageOverridesApplied} flagged images to storage bucket URLs`);

const IMAGE_BLOCKLIST = {
  'anastasia-antique-silver-collection': [
    '0c5b546f9f84-anastasia_set.png', // mirror dup of squarespace ANASTASIA+Set.png
  ],
  'lapis-deep-blue-plates': [
    'lapis+blue+11.png',   // dup of inventory LAPIS 11in.png
    'lapis+blue+10.png',   // dup of inventory LAPIS 10in.png
    'lapis+blue+8.25.png', // dup of inventory LAPIS 8.25in.png
  ],
  'lavanya-stoneware-collection': [
    'lavanya+12+charger.png', // dup of inventory LAVANYA 12.png
    'lavanya+10++plate.png',  // dup of inventory LAVANYA 10.png
  ],
};
let blocklistRemoved = 0;
for (const p of rolled) {
  const patterns = IMAGE_BLOCKLIST[p.slug];
  if (!patterns || !Array.isArray(p.images)) continue;
  const before = p.images.length;
  p.images = p.images.filter((img) => {
    const url = (typeof img === 'string' ? img : img.url || '').toLowerCase();
    return !patterns.some((pat) => url.includes(pat));
  });
  // Reindex positions + isHero flag after removals.
  p.images.forEach((img, i) => {
    if (typeof img !== 'string') { img.position = i; img.isHero = i === 0; }
  });
  if (p.images.length > 0) p.primaryImage = typeof p.images[0] === 'string' ? { url: p.images[0] } : p.images[0];
  p.imageCount = p.images.length;
  blocklistRemoved += (before - p.images.length);
}
console.log(`[image-blocklist] removed ${blocklistRemoved} duplicate images across ${Object.keys(IMAGE_BLOCKLIST).length} products`);

// Tableware duplicate pass — keep only one image per normalized filename when
// the same asset exists as both old Squarespace CDN and our storage mirror / owner
// upload. Conservative: exact basename only after stripping mirror hash prefixes;
// does not collapse different product shots.
const imageBaseKey = (url) => {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || '')
      .replace(/\+/g, ' ')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^[0-9a-f]{8,}-/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  } catch { return String(url || '').toLowerCase(); }
};
const storageRank = (url) => {
  if (/\/storage\/v1\/object\/public\/glassware\//.test(url)) return 5;
  if (/\/storage\/v1\/object\/public\/tablewear\//.test(url)) return 4;
  if (/\/storage\/v1\/object\/public\/inventory\//.test(url)) return 3;
  if (/\/storage\/v1\/object\/public\/squarespace-mirror\//.test(url)) return 2;
  if (/\/storage\/v1\/object\/public\//.test(url)) return 1;
  return 0;
};
let tablewareExactDupesRemoved = 0;
for (const p of rolled) {
  if (p.categorySlug !== 'tableware' || !Array.isArray(p.images) || p.images.length < 2) continue;
  const bestByKey = new Map();
  p.images.forEach((img, i) => {
    const url = typeof img === 'string' ? img : img.url || '';
    const key = imageBaseKey(url);
    if (!key) return;
    const current = bestByKey.get(key);
    const candidate = { img, i, rank: storageRank(url) };
    if (!current || candidate.rank > current.rank) bestByKey.set(key, candidate);
  });
  const seenKeys = new Set();
  const deduped = [];
  for (const img of p.images) {
    const url = typeof img === 'string' ? img : img.url || '';
    const key = imageBaseKey(url);
    if (!key) { deduped.push(img); continue; }
    const best = bestByKey.get(key);
    if (best?.img === img && !seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(img);
    }
  }
  if (deduped.length === p.images.length) continue;
  p.images = deduped;
  p.images.forEach((img, i) => {
    if (typeof img !== 'string') { img.position = i; img.isHero = i === 0; }
  });
  if (p.images.length > 0) p.primaryImage = typeof p.images[0] === 'string' ? { url: p.images[0] } : p.images[0];
  p.imageCount = p.images.length;
  tablewareExactDupesRemoved += (seenKeys.size ? 0 : 0) + (bestByKey.size ? 0 : 0) + (deduped.length >= 0 ? 0 : 0);
}
tablewareExactDupesRemoved = rolled.reduce((sum, p) => sum + (p.categorySlug === 'tableware' && Array.isArray(p.images) ? 0 : 0), tablewareExactDupesRemoved);
console.log(`[tableware-exact-image-dedupe] removed duplicate storage/CDN image slots where exact basenames matched`);

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
