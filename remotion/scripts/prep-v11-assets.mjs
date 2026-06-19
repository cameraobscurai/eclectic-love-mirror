// Curate + mirror every asset the v11 site reel needs into remotion/public/v11/.
// Writes a manifest the scenes import.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PUB = path.resolve(__dirname, "../public/v11");

fs.mkdirSync(path.join(PUB, "products"), { recursive: true });
fs.mkdirSync(path.join(PUB, "gallery"), { recursive: true });
fs.mkdirSync(path.join(PUB, "atelier"), { recursive: true });
fs.mkdirSync(path.join(PUB, "covers"), { recursive: true });
fs.mkdirSync(path.join(PUB, "home"), { recursive: true });

const catalog = JSON.parse(
  fs.readFileSync(path.join(REPO, "src/data/inventory/current_catalog.json"), "utf8")
);

const ext = (u) => {
  const m = u.split("?")[0].match(/\.(png|jpg|jpeg|webp|avif)$/i);
  return m ? m[1].toLowerCase() : "png";
};

async function download(url, dest) {
  if (fs.existsSync(dest)) return true;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) {
      console.warn("skip", r.status, url);
      return false;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return true;
  } catch (e) {
    console.warn("err", url, e.message);
    return false;
  }
}

// ── 1. PRODUCT CURATION ───────────────────────────────────────────────
// Pick ~100 strong tiles: per-category quota, hero image only, prefer supabase
// over squarespace CDN for stability.
const QUOTA = {
  seating: 14, tables: 12, bars: 6, tableware: 8, serveware: 6,
  "pillows-throws": 16, rugs: 6, lighting: 6, candlelight: 4,
  chandeliers: 6, "large-decor": 6, styling: 6, storage: 4, "furs-pelts": 4,
};
const products = [];
for (const cat of Object.keys(QUOTA)) {
  const inCat = catalog.products
    .filter((p) => p.categorySlug === cat && p.images?.[0]?.url)
    .filter((p) => /supabase/.test(p.images[0].url) || /squarespace-cdn/.test(p.images[0].url));
  // Prefer those with colorHex (textiles) so the tonal-sort scene can use them
  inCat.sort((a, b) => Number(!!b.colorHex) - Number(!!a.colorHex));
  for (const p of inCat.slice(0, QUOTA[cat])) products.push(p);
}
console.log("curated", products.length, "products");

// Download in parallel batches of 8
const tiles = [];
const batch = 8;
for (let i = 0; i < products.length; i += batch) {
  const slice = products.slice(i, i + batch);
  const results = await Promise.all(
    slice.map(async (p) => {
      const url = p.images[0].url;
      const filename = `${p.slug}.${ext(url)}`;
      const dest = path.join(PUB, "products", filename);
      const ok = await download(url, dest);
      if (!ok) return null;
      return {
        slug: p.slug,
        title: p.title,
        category: p.categorySlug,
        file: `v11/products/${filename}`,
        colorHex: p.colorHex || null,
        tonalRank: p.tonalRank ?? null,
        colorFamily: p.colorFamily || null,
        colorLightness: p.colorLightness ?? null,
      };
    })
  );
  for (const r of results) if (r) tiles.push(r);
  process.stdout.write(`  ${tiles.length}/${products.length}\r`);
}
console.log("\ndownloaded", tiles.length, "tiles");

// ── 2. CATEGORY COVERS ───────────────────────────────────────────────
const coversSrc = path.join(REPO, "src/assets/category-covers");
const covers = [];
if (fs.existsSync(coversSrc)) {
  for (const f of fs.readdirSync(coversSrc)) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(f)) continue;
    const dest = path.join(PUB, "covers", f);
    fs.copyFileSync(path.join(coversSrc, f), dest);
    covers.push({ name: path.basename(f, path.extname(f)), file: `v11/covers/${f}` });
  }
}
console.log("covers", covers.length);

// ── 3. ATELIER ────────────────────────────────────────────────────────
const atelierFiles = [
  ["src/assets/atelier/atelier-hive-triptych.jpeg", "triptych.jpeg"],
  ["src/assets/atelier/atelier-sketch-drape.png", "sketch-drape.png"],
  ["src/assets/atelier/atelier-collage.jpg", "collage.jpg"],
  ["src/assets/atelier/studio-collage.png", "studio-collage.png"],
  ["src/assets/atelier/imagined-tent-sketch.png", "imagined-tent.png"],
  ["src/assets/atelier/designed-sofa-wireframe.png", "designed-wireframe.png"],
  ["src/assets/atelier/realized-aspen-ceremony.webp", "realized-aspen.webp"],
  ["src/assets/atelier/fabrication-still-life.png", "fab-stilllife.png"],
  ["src/assets/atelier/fabrication-stone-plates.webp", "fab-stones.webp"],
  ["src/assets/atelier/workbench-chair-sketch.png", "workbench-sketch.png"],
  ["src/assets/atelier-replacement.jpg", "hero.jpg"],
];
const atelier = {};
for (const [src, name] of atelierFiles) {
  const abs = path.join(REPO, src);
  if (!fs.existsSync(abs)) { console.warn("missing atelier", src); continue; }
  fs.copyFileSync(abs, path.join(PUB, "atelier", name));
  atelier[name.replace(/\.[^.]+$/, "")] = `v11/atelier/${name}`;
}
console.log("atelier", Object.keys(atelier).length);

// ── 4. GALLERY PLATES ────────────────────────────────────────────────
const galleryUrls = [
  ["amangiri-chinle", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/AMANGIRI/chinledinner__D9D9D665-C36F-4654-9687-7303B1A05765.jpeg"],
  ["amangiri-fireside", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/AMANGIRI/Fireside__Lounge.jpg"],
  ["amangiri-amphitheater", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/AMANGIRI/amphitheaterravensnest__ADD_ON_Bar.jpg"],
  ["amangiri-loungecu", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/AMANGIRI/amphitheaterravensnest__ADD_ON_Close_Up_Lounge.jpg"],
  ["anguilla-bar", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ANGUILLA-MICHELLE-RAGO/Bar_by_the_Sea.jpg"],
  ["anguilla-sofa", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ANGUILLA-MICHELLE-RAGO/Sofa_by_the_sea.jpg"],
  ["anguilla-tent", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ANGUILLA-MICHELLE-RAGO/Tent_Entrance.jpg"],
  ["aspen-tent-night", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent at Night.jpg"],
  ["aspen-tablescape", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up.jpg"],
  ["aspen-stones", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Stone Plates.jpg"],
  ["birch-lounge", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/BIRCH-DESIGN/AAM__Lounge_Favorite.jpg"],
  ["birch-bar", "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/image-galleries/BIRCH-DESIGN/AAM__Bar_+_Bellow_Wall.jpg"],
];
const gallery = {};
for (const [name, url] of galleryUrls) {
  const filename = `${name}.${ext(url)}`;
  const dest = path.join(PUB, "gallery", filename);
  const ok = await download(url, dest);
  if (ok) gallery[name] = `v11/gallery/${filename}`;
}
console.log("gallery", Object.keys(gallery).length);

// ── 5. HOME POSTERS ──────────────────────────────────────────────────
const home = {};
for (const n of ["02","03","04","05"]) {
  const src = path.join(REPO, "public/media/home", `${n}-poster.jpg`);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(PUB, "home", `${n}-poster.jpg`);
  fs.copyFileSync(src, dest);
  home[`poster${n}`] = `v11/home/${n}-poster.jpg`;
}
console.log("home", Object.keys(home).length);

// ── MANIFEST ─────────────────────────────────────────────────────────
const manifest = { tiles, covers, atelier, gallery, home };
fs.writeFileSync(
  path.join(__dirname, "../src/v11-manifest.json"),
  JSON.stringify(manifest, null, 2)
);
console.log("\nmanifest:", path.join("remotion/src/v11-manifest.json"));
console.log("done.");
