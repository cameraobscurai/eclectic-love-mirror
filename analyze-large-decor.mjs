import fs from 'fs';
import { productParent } from './src/lib/collection-parents.ts';

const catalog = JSON.parse(fs.readFileSync('./src/data/inventory/current_catalog.json', 'utf8'));

// We need to mock some stuff because we are running in node
// Actually, it's easier to just do it manually since I know the logic now.
// productParent(p) logic:
// 1. p.categorySlug === "storage" -> cocktail-bar
// 2. title includes "console" -> lounge-tables
// 3. liveCategory mapping
// 4. getProductBrowseGroup(p) -> GROUP_TO_PARENT mapping

const LIVE_CAT_TO_PARENT = {
  "lounge": "lounge-seating",
  "lounge-tables": "lounge-tables",
  "cocktail-bar": "cocktail-bar",
  "dining": "dining",
  "tableware": "tableware",
  "textiles": "textiles",
  "rugs": "rugs",
  "styling": "styling",
  "large-decor": "large-decor",
  "light": "lighting",
  "lighting": "lighting",
};

function getLargeDecorProducts() {
  return catalog.products.filter(p => {
    if (p.categorySlug === "storage") return false;
    if ((p.title || "").toLowerCase().includes("console")) return false;
    if (p.liveCategory && LIVE_CAT_TO_PARENT[p.liveCategory]) {
       return LIVE_CAT_TO_PARENT[p.liveCategory] === "large-decor";
    }
    // Fallback logic for getProductBrowseGroup is complex, but "large-decor" is one of them.
    // In current_catalog.json, some products might have "large-decor" as categorySlug or similar.
    return p.categorySlug === "large-decor" || p.liveCategory === "large-decor";
  });
}

const largeDecor = getLargeDecorProducts();

console.log(`Total Large Decor products: ${largeDecor.length}`);

const analysis = {
  titles: {
    upper: 0,
    title: 0,
    mixed: 0,
    total: largeDecor.length
  },
  images: {
    missing: 0,
    single: 0,
    multiple: 0,
  },
  dimensions: {
    missing: 0,
    present: 0
  },
  subcategories: {}
};

largeDecor.forEach(p => {
  // Title casing
  if (p.title === p.title.toUpperCase()) analysis.titles.upper++;
  else if (p.title === p.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())) analysis.titles.title++;
  else analysis.titles.mixed++;

  // Images
  if (!p.images || p.images.length === 0) analysis.images.missing++;
  else if (p.images.length === 1) analysis.images.single++;
  else analysis.images.multiple++;

  // Dimensions
  if (!p.dimensions) analysis.dimensions.missing++;
  else analysis.dimensions.present++;

  // Subcategories (liveSubcategories)
  const subs = p.liveSubcategories || ['none'];
  subs.forEach(s => {
    analysis.subcategories[s] = (analysis.subcategories[s] || 0) + 1;
  });
});

console.log(JSON.stringify(analysis, null, 2));

// Look for outliers in title length
const sortedByTitle = [...largeDecor].sort((a, b) => b.title.length - a.title.length);
console.log("\nLongest titles:");
sortedByTitle.slice(0, 5).forEach(p => console.log(`- ${p.title} (${p.title.length})`));

// Look for items with many images
const sortedByImages = [...largeDecor].sort((a, b) => b.images.length - a.images.length);
console.log("\nMost images:");
sortedByImages.slice(0, 5).forEach(p => console.log(`- ${p.title}: ${p.images.length}`));

