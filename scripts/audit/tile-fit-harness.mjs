// Tile fit harness — measures rendered product silhouettes on the collection
// grid and checks them against the two numbers we actually care about:
//
//   width ratio within a row (min/max)  >= 0.80
//   floor-line spread within a row       <= 15px
//
// Tuning the fit solver by screenshot is what produced the last four
// regressions. This is the replacement: one command, same numbers every time.
//
//   node scripts/audit/tile-fit-harness.mjs                       # all groups
//   node scripts/audit/tile-fit-harness.mjs --group=lounge-seating
//   node scripts/audit/tile-fit-harness.mjs --baseline             # rewrite baseline
//   node scripts/audit/tile-fit-harness.mjs --url=http://localhost:8080
//
// Exit code is 1 when any row misses a threshold, so it can gate a build.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const BASE = args.url || 'http://localhost:8080';
const WRITE_BASELINE = !!args.baseline;
const CI_MODE = !!args.ci;
const BASELINE_PATH = path.join(process.cwd(), 'scripts/audit/tile-fit-baseline.json');

// Drift allowances in CI. Silhouette measurement is pixel sampling over CDN
// images, so a couple of pixels of noise is expected; a real fit or anchoring
// change moves well past these.
const MASS_TOLERANCE = 0.03;
const FLOOR_TOLERANCE = 4;


// Chromium resolution: prefer Playwright's own download, fall back to the
// system binary (the sandbox has /bin/chromium but no ms-playwright build).
const EXECUTABLE = fs.existsSync('/bin/chromium') ? '/bin/chromium' : undefined;

/**
 * Acceptance numbers.
 *
 * `massRatio` compares √(silhouette area), not width. Width is the wrong
 * invariant: a 52" loveseat SHOULD render narrower than a 96" sofa, and
 * forcing their widths to match is how the pipeline previously started
 * lying about real size. Visual mass is what the eye actually reads, and
 * the pipeline deliberately compresses the real-size signal, so the floor
 * on mass is where "truthful but not jarring" lives.
 *
 * `floorSpread` is the bottom-edge alignment of the silhouettes in a row —
 * the thing that makes a grid look set on one surface.
 */
export const THRESHOLDS = { massRatio: 0.65, floorSpread: 15 };


// One representative slice per parent. Subcategories are where mixed silhouette
// aspects collide, so the check runs against the slice, not the parent blend.
const SLICES = [
  { group: 'lounge-seating', subcategory: 'sofas-loveseats' },
  { group: 'lounge-seating', subcategory: 'chairs' },
  { group: 'lounge-seating', subcategory: 'benches' },
  { group: 'lounge-tables', subcategory: 'coffee-tables' },
  { group: 'lounge-tables', subcategory: 'side-tables' },
  { group: 'lounge-tables', subcategory: 'consoles' },
  { group: 'cocktail-bar', subcategory: 'bars' },
  { group: 'cocktail-bar', subcategory: 'stools' },
  { group: 'dining', subcategory: 'dining-tables' },
  { group: 'dining', subcategory: 'dining-chairs' },
];

/**
 * Tiles land on the same visual row when their silhouette bottoms are close.
 * Grouping on the bottom edge (not the top) is deliberate: the bottom is the
 * anchored edge, so it is the stable key even when silhouette heights differ.
 */
function groupIntoRows(tiles) {
  const sorted = [...tiles].sort((a, b) => a.bottom - b.bottom);
  const rows = [];
  for (const tile of sorted) {
    const row = rows.find((r) => Math.abs(r.anchor - tile.bottom) < 160);
    if (row) {
      row.tiles.push(tile);
      row.anchor = (row.anchor * (row.tiles.length - 1) + tile.bottom) / row.tiles.length;
    } else {
      rows.push({ anchor: tile.bottom, tiles: [tile] });
    }
  }
  // A single-tile row can't be inconsistent with anything.
  return rows.filter((r) => r.tiles.length > 1);
}

function scoreRow(row) {
  const masses = row.tiles.map((t) => Math.sqrt(t.w * t.h));
  const bottoms = row.tiles.map((t) => t.bottom);
  const massRatio = Math.min(...masses) / Math.max(...masses);
  const floorSpread = Math.max(...bottoms) - Math.min(...bottoms);
  return {
    massRatio: Number(massRatio.toFixed(3)),
    widthRatio: Number((Math.min(...row.tiles.map((t) => t.w)) / Math.max(...row.tiles.map((t) => t.w))).toFixed(3)),
    floorSpread: Math.round(floorSpread),
    pass: massRatio >= THRESHOLDS.massRatio && floorSpread <= THRESHOLDS.floorSpread,
    tiles: row.tiles.map((t) => ({ title: t.title, w: t.w, h: t.h })),
  };
}


async function measureSlice(page, slice) {
  const url = `${BASE}/collection?group=${slice.group}&subcategory=${slice.subcategory}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Lazy tiles only measure correctly once they've been in the viewport.
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);

  // The <img> element box is NOT the product. It is a letterboxed frame with
  // whitespace around the silhouette, so measuring it reports the transform
  // scale rather than how big the sofa actually looks. Measure the silhouette:
  // find the non-background bbox in the natural image, map it through
  // object-contain into the element's content box, then into page space.
  const tiles = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')].filter((img) => {
      const r = img.getBoundingClientRect();
      if (r.width < 60 || r.height < 60) return false;
      const title = (img.alt || '').trim();
      // Product alts are the ALL-CAPS catalog titles; nav/category art is not.
      return !!title && title === title.toUpperCase();
    });

    // The rendered <img> has no crossorigin attribute, so drawing it taints the
    // canvas. Re-fetch each source through an anonymous-CORS Image — the same
    // trick the app's own silhouette probe uses.
    const probeCache = new Map();
    const probe = (src) => {
      if (probeCache.has(src)) return probeCache.get(src);
      const p = new Promise((resolve) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.decoding = 'async';
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = src;
      });
      probeCache.set(src, p);
      return p;
    };

    const silhouette = (im) => {
      const w = im.naturalWidth;
      const h = im.naturalHeight;
      if (!w || !h) return null;
      const side = 160;
      const s = Math.min(1, side / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      try {
        ctx.drawImage(im, 0, 0, cw, ch);
        const px = ctx.getImageData(0, 0, cw, ch).data;
        let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const i = (y * cw + x) * 4;
            if (px[i + 3] < 12) continue;
            if (px[i] > 244 && px[i + 1] > 244 && px[i + 2] > 244) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) return null;
        return { x0: x0 / cw, y0: y0 / ch, x1: (x1 + 1) / cw, y1: (y1 + 1) / ch };
      } catch {
        return null; // tainted canvas
      }
    };

    const out = [];
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      const title = (img.alt || '').trim();
      if (img.naturalWidth === 0) {
        out.push({ title, broken: true });
        continue;
      }
      const im = await probe(img.currentSrc || img.src);
      const box = im ? silhouette(im) : null;
      if (!box) {
        out.push({ title, unmeasurable: true });
        continue;
      }
      // object-contain: the drawn content is centred inside the element box.
      const natAspect = img.naturalWidth / img.naturalHeight;
      const boxAspect = r.width / r.height;
      const contentW = natAspect >= boxAspect ? r.width : r.height * natAspect;
      const contentH = natAspect >= boxAspect ? r.width / natAspect : r.height;
      const left = r.left + (r.width - contentW) / 2;
      const top = r.top + (r.height - contentH) / 2;
      out.push({
        title,
        left: Math.round(left + contentW * box.x0),
        w: Math.round(contentW * (box.x1 - box.x0)),
        h: Math.round(contentH * (box.y1 - box.y0)),
        top: Math.round(top + contentH * box.y0 + window.scrollY),
        bottom: Math.round(top + contentH * box.y1 + window.scrollY),
      });
    }
    return out;
  });



  const measured = tiles.filter((t) => !t.broken && !t.unmeasurable);
  const rows = groupIntoRows(measured).map(scoreRow);
  return {
    slice: `${slice.group}/${slice.subcategory}`,
    tiles: measured.length,
    broken: tiles.filter((t) => t.broken).map((t) => t.title),
    unmeasurable: tiles.filter((t) => t.unmeasurable).map((t) => t.title),
    rows,
    worstMassRatio: rows.length ? Math.min(...rows.map((r) => r.massRatio)) : null,
    worstFloorSpread: rows.length ? Math.max(...rows.map((r) => r.floorSpread)) : null,
    // No measurable rows is a harness failure, not a pass.
    failing: rows.length === 0 ? 1 : rows.filter((r) => !r.pass).length,
  };

}

async function main() {
  const slices = args.group
    ? SLICES.filter((s) => s.group === args.group || `${s.group}/${s.subcategory}` === args.group)
    : SLICES;
  if (!slices.length) {
    console.error(`No slice matches --group=${args.group}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();

  const results = [];
  for (const slice of slices) {
    process.stdout.write(`measuring ${slice.group}/${slice.subcategory} ... `);
    try {
      const r = await measureSlice(page, slice);
      results.push(r);
      console.log(`${r.tiles} tiles, ${r.rows.length} rows, ${r.failing} failing`);
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      results.push({ slice: `${slice.group}/${slice.subcategory}`, error: String(e) });
    }
  }
  await browser.close();

  console.log(`\n=== tile fit — mass>=${THRESHOLDS.massRatio}, floor<=${THRESHOLDS.floorSpread}px ===`);
  let failing = 0;
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.slice.padEnd(34)} ERROR ${r.error}`);
      failing++;
      continue;
    }
    const mark = r.failing === 0 ? 'ok  ' : 'MISS';
    console.log(
      `  ${mark} ${r.slice.padEnd(34)} worst mass ${String(r.worstMassRatio).padEnd(6)} worst floor ${String(r.worstFloorSpread).padEnd(4)}px  (${r.failing}/${r.rows.length} rows)`,
    );
    for (const row of r.rows.filter((x) => !x.pass)) {
      console.log(
        `        mass ${row.massRatio} width ${row.widthRatio} floor ${row.floorSpread}px : ${row.tiles.map((t) => `${t.title.slice(0, 26)} ${t.w}x${t.h}`).join(' | ')}`,
      );
    }
    failing += r.failing;
  }

  const payload = { generatedAt: new Date().toISOString(), thresholds: THRESHOLDS, results };
  if (WRITE_BASELINE) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2));
    console.log(`\nbaseline written: ${BASELINE_PATH}`);
    console.log(`\ntotal failing rows: ${failing}`);
    process.exit(0);
  }

  // CI mode judges against the baseline, not against absolute thresholds, so a
  // category can be intentionally retuned by committing a new baseline while an
  // unintentional drift still fails the build.
  let regressions = [];
  if (fs.existsSync(BASELINE_PATH)) {
    const base = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    console.log('\n--- vs baseline ---');
    for (const r of results) {
      const b = base.results.find((x) => x.slice === r.slice);
      if (!b) {
        console.log(`  ${r.slice.padEnd(34)} (new slice — not in baseline)`);
        continue;
      }
      if (r.error) {
        console.log(`  ${r.slice.padEnd(34)} ERROR`);
        regressions.push(`${r.slice}: harness error ${r.error}`);
        continue;
      }
      if (b.error) continue;
      const d = r.failing - b.failing;
      const massDrop = (b.worstMassRatio ?? 0) - (r.worstMassRatio ?? 0);
      const floorGrow = (r.worstFloorSpread ?? 0) - (b.worstFloorSpread ?? 0);
      const tag = d < 0 ? 'improved' : d > 0 ? 'REGRESSED' : 'same';
      console.log(
        `  ${r.slice.padEnd(34)} ${b.failing} -> ${r.failing} failing rows (${tag})  mass ${b.worstMassRatio} -> ${r.worstMassRatio}  floor ${b.worstFloorSpread} -> ${r.worstFloorSpread}px`,
      );
      if (d > 0) regressions.push(`${r.slice}: failing rows ${b.failing} -> ${r.failing}`);
      if (massDrop > MASS_TOLERANCE)
        regressions.push(`${r.slice}: worst mass ratio ${b.worstMassRatio} -> ${r.worstMassRatio}`);
      if (floorGrow > FLOOR_TOLERANCE)
        regressions.push(`${r.slice}: worst floor spread ${b.worstFloorSpread}px -> ${r.worstFloorSpread}px`);
    }
  } else if (CI_MODE) {
    console.error(`\nno baseline at ${BASELINE_PATH} — run with --baseline and commit it.`);
    process.exit(1);
  }

  console.log(`\ntotal failing rows: ${failing}`);

  if (CI_MODE) {
    if (regressions.length) {
      console.error(`\nFIT REGRESSION (${regressions.length}):`);
      for (const m of regressions) console.error(`  - ${m}`);
      process.exit(1);
    }
    console.log('\nno regression vs baseline.');
    process.exit(0);
  }

  process.exit(failing > 0 ? 1 : 0);
}


main().catch((e) => {
  console.error(e);
  process.exit(1);
});
