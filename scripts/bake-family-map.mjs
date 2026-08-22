#!/usr/bin/env node
/**
 * Bake src/data/inventory/family-map.json from the current catalog.
 *
 * Tableware/serveware variant rows (EDEN 13" Charger, EDEN 10.5" Plate, …)
 * are rolled up into ONE public tile at bake time by scripts/family-rollup.mjs.
 * The admin edits individual RMS rows and has no way to see that grouping —
 * this map gives the product drawer a read-only "part of a collection" panel
 * so staff know which row drives the collection cover.
 *
 *   bun scripts/bake-family-map.mjs
 */
import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("src/data/inventory/current_catalog.json", "utf8"));

const key = (url) => {
  try {
    return (
      decodeURIComponent(new URL(url).pathname.split("/").pop() || "")
        .replace(/\+/g, " ")
        .trim()
        .toLowerCase() || url
    );
  } catch {
    return url;
  }
};

const map = {};
let families = 0;

for (const p of catalog.products) {
  const variants = p.variants ?? [];
  if (variants.length < 2) continue;
  families++;
  const variantKeys = new Set(
    variants.map((v) => (v.imageUrl ? key(v.imageUrl) : "")).filter(Boolean),
  );
  // A group / "Set" shot is a family image no variant row owns.
  const groupShot = (p.images ?? []).find((img) => !variantKeys.has(key(img.url)));
  const entry = {
    slug: p.slug,
    title: p.title,
    category: p.categorySlug,
    leadId: p.id,
    coverSource: groupShot ? "group-shot" : "lead-row",
    members: variants.map((v) => ({ id: v.id, title: v.title })),
  };
  for (const v of variants) map[v.id] = entry;
  map[p.id] = entry;
}

fs.mkdirSync("src/data/inventory", { recursive: true });
fs.writeFileSync(
  "src/data/inventory/family-map.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), families: map }, null, 0),
);
console.log(`families: ${families}  indexed rms rows: ${Object.keys(map).length}`);
