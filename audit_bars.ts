import { readFileSync } from "fs";
import { productMatchesSub, productParent } from "./src/lib/collection-parents";
import sharp from "sharp";

async function run() {
  const catalog = JSON.parse(readFileSync("src/data/inventory/current_catalog.json", "utf8"));
  const filtered = catalog.products.filter(p => {
    const parent = productParent(p);
    return parent === "cocktail-bar" && productMatchesSub(p, "cocktail-bar", "bars");
  });

  const getRatio = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      const metadata = await sharp(Buffer.from(buffer)).metadata();
      if (!metadata.width || !metadata.height) return null;
      return metadata.width / metadata.height;
    } catch (e) {
      return null;
    }
  };

  const results = [];
  for (const p of filtered) {
    const ratio = await getRatio(p.primaryImage.url);
    if (ratio !== null) {
      results.push({ slug: p.slug, ratio });
    }
  }

  const buckets = {
    Tall: results.filter(r => r.ratio < 0.9),
    SquareIsh: results.filter(r => r.ratio >= 0.9 && r.ratio < 1.4),
    Wide: results.filter(r => r.ratio >= 1.4 && r.ratio <= 2.5),
    UltraWide: results.filter(r => r.ratio > 2.5),
  };

  console.log(`Total count of products: ${filtered.length}`);
  console.log(`Tall (ratio < 0.9): ${buckets.Tall.length}`);
  console.log(`Square-ish (0.9-1.4): ${buckets.SquareIsh.length}`);
  console.log(`Wide (1.4-2.5): ${buckets.Wide.length}`);
  console.log(`Ultra-wide (> 2.5): ${buckets.UltraWide.length}`);

  const outliersTall = [...buckets.Tall].sort((a, b) => a.ratio - b.ratio).slice(0, 5);
  const outliersWide = [...buckets.UltraWide].sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  
  // If UltraWide is empty, take most wide from Wide
  const extremeWide = outliersWide.length > 0 ? outliersWide : [...buckets.Wide].sort((a, b) => b.ratio - a.ratio).slice(0, 5);

  console.log("\nExtreme Tall Outliers:");
  outliersTall.forEach(o => console.log(`${o.slug}: ${o.ratio.toFixed(2)}`));
  
  console.log("\nExtreme Wide Outliers:");
  extremeWide.forEach(o => console.log(`${o.slug}: ${o.ratio.toFixed(2)}`));
}

run();
