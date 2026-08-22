// Off-angle cover audit.
//
// The Ingram sofa was never a scale bug. Its cover was the only 3/4 angled
// shot in a shelf of straight-on elevations, so its silhouette was 1.9:1 in a
// row of 2.5:1 silhouettes — same real width, ~40% more visual mass. No fit
// constant can fix that, because the solver is being told the truth about a
// photo that disagrees with its neighbours.
//
// This finds the rest of them: for every product in a shelf, measure the
// cover silhouette aspect, compare it to the shelf median, and report any
// alternate image whose aspect sits closer to the median.
//
//   node scripts/audit/off-angle-covers.mjs                 # whole catalog
//   node scripts/audit/off-angle-covers.mjs --shelf=sofas-loveseats
//   node scripts/audit/off-angle-covers.mjs --deviation=0.3 # sensitivity
//
// Read-only. It prints swap candidates; a human promotes the photo in
// /admin/photos and clicks Publish.

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const SHELF_FILTER = typeof args.shelf === "string" ? args.shelf : null;
// Relative deviation from the shelf median aspect that counts as off-angle.
const DEVIATION = Number(args.deviation ?? 0.28);
const OUT = path.join(process.cwd(), "scripts/audit/off-angle-covers.json");

const catalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/data/inventory/current_catalog.json"), "utf8"),
);

/** Silhouette aspect (w/h) of the subject, alpha first, light-bg fallback. */
async function silhouetteAspect(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  let png;
  try {
    png = PNG.sync.read(buf);
  } catch {
    return null; // non-PNG (jpeg covers) — out of scope for this pass
  }
  const { width: w, height: h, data } = png;
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  let opaque = true;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 12) {
        opaque = false;
        continue;
      }
      if (a < 250) opaque = false;
      if (opaque) {
        // Light-background fallback for fully opaque sheets.
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (r > 243 && g > 243 && b > 243) continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  return bh > 0 ? bw / bh : null;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const shelves = new Map();
for (const p of catalog.products) {
  const shelf = p.declaredCategory ?? p.categorySlug;
  if (!shelf) continue;
  if (SHELF_FILTER && shelf !== SHELF_FILTER) continue;
  if (!p.primaryImage?.url) continue;
  if (!shelves.has(shelf)) shelves.set(shelf, []);
  shelves.get(shelf).push(p);
}

const findings = [];

for (const [shelf, products] of shelves) {
  const measured = [];
  for (const p of products) {
    const aspect = await silhouetteAspect(p.primaryImage.url);
    if (aspect) measured.push({ p, aspect });
  }
  if (measured.length < 4) continue;
  const med = median(measured.map((m) => m.aspect));

  for (const { p, aspect } of measured) {
    const off = Math.abs(aspect - med) / med;
    if (off < DEVIATION) continue;

    // Is one of its own alternates a better-matched shot?
    let best = null;
    for (const img of (p.images ?? []).slice(1)) {
      const alt = await silhouetteAspect(img.url);
      if (!alt) continue;
      const altOff = Math.abs(alt - med) / med;
      if (altOff < off && (!best || altOff < best.off)) {
        best = { url: img.url, aspect: alt, off: altOff, position: img.position };
      }
    }

    findings.push({
      shelf,
      title: p.title,
      slug: p.slug,
      shelfMedianAspect: +med.toFixed(2),
      coverAspect: +aspect.toFixed(2),
      deviation: +off.toFixed(2),
      swapTo: best
        ? {
            position: best.position,
            aspect: +best.aspect.toFixed(2),
            deviation: +best.off.toFixed(2),
            url: best.url,
          }
        : null,
    });
  }
  console.log(`${shelf}: ${measured.length} measured, median aspect ${med.toFixed(2)}`);
}

findings.sort((a, b) => b.deviation - a.deviation);
fs.writeFileSync(
  OUT,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), deviation: DEVIATION, findings },
    null,
    2,
  ),
);

console.log(`\n=== off-angle covers (>${(DEVIATION * 100).toFixed(0)}% off shelf median) ===`);
for (const f of findings) {
  const fix = f.swapTo
    ? `→ promote image ${f.swapTo.position} (${f.swapTo.aspect})`
    : "→ no better alternate; needs a reshoot";
  console.log(
    `  ${f.shelf.padEnd(20)} ${f.title.slice(0, 42).padEnd(44)} ${f.coverAspect} vs ${f.shelfMedianAspect}  ${fix}`,
  );
}
console.log(`\n${findings.length} flagged · written to ${path.relative(process.cwd(), OUT)}`);
