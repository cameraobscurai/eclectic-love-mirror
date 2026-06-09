import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json', 'utf8'));

// Filter for tables
// Using the same logic as the app:
// 1. group=tables -> ParentId=lounge-tables
// 2. productParent(p) === "lounge-tables"

const loungeTables = catalog.products.filter(p => {
  if (p.categorySlug === "storage") return false;
  if ((p.title || "").toLowerCase().includes("console")) return true;
  if (p.liveCategory === "lounge-tables") return true;
  // Fallback to browse group logic (simulated)
  // We'll just look for categorySlug "tables" or liveCategory "lounge-tables"
  return p.categorySlug === "tables" || p.liveCategory === "lounge-tables";
});

console.log(`Found ${loungeTables.length} tables.`);

loungeTables.forEach(p => {
  const primary = p.primaryImage || (p.images && p.images[0]);
  console.log(`Product: ${p.title}`);
  console.log(`  Image: ${primary ? primary.url : 'NONE'}`);
});
