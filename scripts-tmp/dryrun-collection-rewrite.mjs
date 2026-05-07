// Dry-run: would each catalog image rewrite to a `collection` bucket URL?
// Reports coverage. Writes nothing.
import fs from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('scripts-tmp/collection-manifest.json', 'utf8'));

function exactFilename(url) {
  const noQ = url.split('?')[0];
  const last = noQ.substring(noQ.lastIndexOf('/') + 1);
  try { return decodeURIComponent(last); } catch { return last; }
}

let total = 0, hit = 0, miss = 0;
const missByCat = {};
const missSamples = [];
for (const p of catalog.products) {
  for (const img of (p.images || [])) {
    if (!img.url) continue;
    total++;
    const fn = exactFilename(img.url);
    const path = `${p.categorySlug}/${p.slug}/${fn}`;
    if (manifest[path]) {
      hit++;
    } else {
      miss++;
      missByCat[p.categorySlug] = (missByCat[p.categorySlug] || 0) + 1;
      if (missSamples.length < 15) missSamples.push({ slug: p.slug, expected: path, src: img.url });
    }
  }
}

console.log(`total images: ${total}`);
console.log(`would rewrite to collection: ${hit}`);
console.log(`would keep original (no manifest hit): ${miss}`);
console.log(`miss by category:`, missByCat);
if (missSamples.length) {
  console.log(`miss samples:`);
  for (const s of missSamples) console.log(`  ${s.slug}\n    expected: ${s.expected}\n    src:      ${s.src}`);
}
