import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

const all = [];
let from = 0; const PAGE = 1000;
while (true) {
  const { data, error } = await sb.from('inventory_items')
    .select('rms_id,title,slug,category,quantity,quantity_label,dimensions_raw,images,updated_at')
    .neq('status','draft').range(from, from+PAGE-1).order('title');
  if (error) { console.error(error); process.exit(1); }
  if (!data.length) break;
  all.push(...data); from += data.length;
  if (data.length < PAGE) break;
}
console.log('public rows:', all.length);

const visible = all.filter(r => Array.isArray(r.images) && r.images.length >= 1);
const hiddenForMissingImage = all.length - visible.length;
console.log('hidden (no image):', hiddenForMissingImage);
const products = visible.map((r, i) => {
  const imgs = (r.images||[]).map((u,idx) => ({
    url: restoredInventoryUrl(u), position: idx, isHero: idx===0, inferredFilename: null, altText: r.title,
  }));
  const stock = r.quantity_label ?? (r.quantity != null ? String(r.quantity) : null);
  return {
    id: r.rms_id,
    sourceUrl: '',
    slug: r.slug,
    categorySlug: r.category,
    displayCategory: CAT_DISPLAY[r.category] || r.category,
    title: r.title,
    description: null,
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
  };
});

const facetsMap = {};
for (const p of products) {
  if (!facetsMap[p.categorySlug]) facetsMap[p.categorySlug] = { slug:p.categorySlug, display:p.displayCategory, count:0 };
  facetsMap[p.categorySlug].count++;
}
const facets = ORDER.filter(s=>facetsMap[s]).map(s=>facetsMap[s]).concat(
  Object.values(facetsMap).filter(f=>!ORDER.includes(f.slug))
);

const payload = {
  products, facets, total: products.length,
  meta: {
    generatedAt: new Date().toISOString(),
    totalRecords: products.length,
    publicReadyCount: products.length,
    excludedCount: hiddenForMissingImage,
    excludedReason: 'awaiting-image',
    categoryDisplayOrder: facets.map(f=>f.display),
  },
};

const outDir = '/dev-server/src/data/inventory';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'current_catalog.json'), JSON.stringify(payload));
console.log('wrote current_catalog.json:', products.length, 'products,', facets.length, 'facets');
console.log('facets:', facets.map(f=>`${f.slug}(${f.count})`).join(' '));
