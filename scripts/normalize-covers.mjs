/**
 * Source normalization for product covers.
 *
 * The problem this removes: our source photos are cropped inconsistently. Some
 * are tight PNG cutouts with zero margin, some are 4:3 photos with 30% empty
 * background baked in. Any CSS fit rule applied to that mix has to guess, and
 * guessing is what every round of "sizing math" has been.
 *
 * What this does, deterministically (no AI, no generation):
 *   1. Find the subject's real bounding box (alpha channel when the file has
 *      one, near-background colour keying when it does not).
 *   2. Crop to that box.
 *   3. Place it on a fixed 1536x1536 canvas with the SAME padding ratio for
 *      every product, subject centred.
 *
 * After this pass, every cover has identical geometry: subject fills the inner
 * box on its long axis, centred, on a transparent canvas. The render layer no
 * longer has to measure or compensate — the only remaining variable is
 * real-world size, which is a deliberate design choice rather than an artifact
 * of how a photographer cropped.
 *
 * Originals are never modified. Derivatives are written to a separate
 * `normalized/` prefix in the mirror bucket and referenced through one flag.
 *
 * Usage:
 *   node scripts/normalize-covers.mjs --dry --limit 12       # sample to /tmp
 *   node scripts/normalize-covers.mjs --dry --all            # full local pass
 *   node scripts/normalize-covers.mjs --apply                # upload + manifest
 *   node scripts/normalize-covers.mjs --apply --slug foo-123
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, 'src/data/inventory/current_catalog.json');
const MANIFEST = path.join(ROOT, 'src/data/inventory/normalized-covers.json');
const OUT_DIR = '/tmp/normalized-covers';
const BUCKET = 'squarespace-mirror';
const PREFIX = 'normalized';

/** Fixed master canvas. Square: collection tiles are square, and any
 *  non-square master forces a centre crop somewhere. */
export const CANVAS = 1536;
/** Uniform padding as a fraction of the canvas edge, applied to every product. */
export const PAD = 0.06;
/** Fraction of the canvas the subject's long axis occupies. Derived, not tuned. */
export const SUBJECT_FRACTION = 1 - PAD * 2;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DRY = has('--dry') || !has('--apply');
const LIMIT = Number(val('--limit', has('--all') ? 0 : 12)) || 0;
const ONLY_SLUG = val('--slug', null);
const CONCURRENCY = Number(val('--concurrency', 6));

// ── bounding box ────────────────────────────────────────────────────────────

/**
 * Subject bounding box, in full-resolution pixel coordinates.
 *
 * Two detectors, chosen by what the file actually is:
 *  - alpha: the file is a cutout. The alpha channel IS the answer; trust it.
 *  - colour key: the file is a photo on a light sweep. Sample the four corners,
 *    take the median as background, and treat anything within tolerance of it
 *    as empty. Tolerance widens for dirtier (greyer) backdrops.
 *
 * Returns null when nothing separates from the background — those items are
 * skipped rather than guessed at.
 */
async function subjectBox(buf) {
  const meta = await sharp(buf).metadata();
  const fullW = meta.width;
  const fullH = meta.height;
  if (!fullW || !fullH) return null;

  const maxSide = 700;
  const s = Math.min(1, maxSide / Math.max(fullW, fullH));
  const w = Math.max(1, Math.round(fullW * s));
  const h = Math.max(1, Math.round(fullH * s));

  const { data } = await sharp(buf)
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  // Does this file carry a real cutout mask? Check the border ring, not the
  // whole image — a drop shadow can make interior alpha noisy.
  let borderPx = 0;
  let borderTransparent = 0;
  const ring = 2;
  for (let x = 0; x < w; x++) {
    for (const y of [ring, h - 1 - ring]) {
      borderPx++;
      if (at(x, y)[3] < 16) borderTransparent++;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [ring, w - 1 - ring]) {
      borderPx++;
      if (at(x, y)[3] < 16) borderTransparent++;
    }
  }
  const isCutout = borderTransparent / Math.max(1, borderPx) > 0.5;

  /** Whole image is the subject — used when the shot is full-bleed (flat-lay
   *  rugs, wall panels) and there is no background to trim. Already tight, so
   *  passing it through unchanged is correct, not a fallback guess. */
  const fullFrame = {
    left: 0,
    top: 0,
    width: fullW,
    height: fullH,
    isCutout: false,
    sourceW: fullW,
    sourceH: fullH,
    coverage: 1,
  };

  let bg = [255, 255, 255];
  let tol = 0;
  if (!isCutout) {
    const corners = [
      at(3, 3),
      at(w - 4, 3),
      at(3, h - 4),
      at(w - 4, h - 4),
    ];
    const med = (k) => corners.map((c) => c[k]).sort((a, b) => a - b)[2];
    bg = [med(0), med(1), med(2)];
    const darkest = Math.min(bg[0], bg[1], bg[2]);
    // Corners are not background — the subject runs to the edge.
    if (darkest < 200) return fullFrame;
    tol = Math.max(16, (255 - darkest) * 0.75);
  }

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      if (!isCutout) {
        if (
          Math.abs(data[i] - bg[0]) <= tol &&
          Math.abs(data[i + 1] - bg[1]) <= tol &&
          Math.abs(data[i + 2] - bg[2]) <= tol
        ) continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  const area = ((maxX - minX + 1) * (maxY - minY + 1)) / (w * h);
  if (area < 0.005) return null; // detector found dust, not a product


  const inv = 1 / s;
  const bleed = 1;
  const left = Math.max(0, Math.floor(minX * inv) - bleed);
  const top = Math.max(0, Math.floor(minY * inv) - bleed);
  const right = Math.min(fullW, Math.ceil((maxX + 1) * inv) + bleed);
  const bottom = Math.min(fullH, Math.ceil((maxY + 1) * inv) + bleed);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    isCutout,
    sourceW: fullW,
    sourceH: fullH,
    coverage: area,
  };
}

// ── normalize ───────────────────────────────────────────────────────────────

/** Crop to the subject, then centre it on the fixed canvas with uniform padding. */
async function normalize(buf) {
  const box = await subjectBox(buf);
  if (!box) return null;

  const inner = Math.round(CANVAS * SUBJECT_FRACTION);
  const subject = await sharp(buf)
    .ensureAlpha()
    .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const sMeta = await sharp(subject).metadata();
  const left = Math.round((CANVAS - sMeta.width) / 2);
  const top = Math.round((CANVAS - sMeta.height) / 2);

  const out = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: subject, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    buf: out,
    subjectAspect: sMeta.width / sMeta.height,
    subjectW: sMeta.width / CANVAS,
    subjectH: sMeta.height / CANVAS,
    isCutout: box.isCutout,
    coverage: box.coverage,
  };
}

// ── driver ──────────────────────────────────────────────────────────────────

async function mapLimit(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  let products = catalog.products.filter((p) => p.primaryImage?.url);
  if (ONLY_SLUG) products = products.filter((p) => p.slug === ONLY_SLUG);
  if (LIMIT) {
    // Spread the sample across categories so a dry run is representative.
    const byCat = new Map();
    for (const p of products) {
      const k = p.categorySlug || 'other';
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(p);
    }
    const picked = [];
    let round = 0;
    while (picked.length < LIMIT) {
      let added = false;
      for (const list of byCat.values()) {
        if (list[round]) {
          picked.push(list[round]);
          added = true;
          if (picked.length >= LIMIT) break;
        }
      }
      if (!added) break;
      round++;
    }
    products = picked;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let supa = null;
  if (!DRY) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    supa = createClient(url, key, { auth: { persistSession: false } });
  }

  const skipped = [];
  const entries = await mapLimit(products, CONCURRENCY, async (p) => {
    const src = p.primaryImage.url;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const norm = await normalize(buf);
      if (!norm) {
        skipped.push({ slug: p.slug, reason: 'no-subject-detected', src });
        return null;
      }

      const key = `${PREFIX}/${p.slug}.png`;
      fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.png`), norm.buf);

      let publicUrl = null;
      if (supa) {
        const { error } = await supa.storage.from(BUCKET).upload(key, norm.buf, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '31536000',
        });
        if (error) throw error;
        publicUrl = supa.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      }

      return {
        slug: p.slug,
        categorySlug: p.categorySlug ?? null,
        url: publicUrl,
        sourceUrl: src,
        subjectAspect: Number(norm.subjectAspect.toFixed(4)),
        subjectW: Number(norm.subjectW.toFixed(4)),
        subjectH: Number(norm.subjectH.toFixed(4)),
        isCutout: norm.isCutout,
        coverage: Number(norm.coverage.toFixed(4)),
      };
    } catch (err) {
      skipped.push({ slug: p.slug, reason: String(err?.message || err), src });
      return null;
    }
  });

  const ok = entries.filter(Boolean);

  if (!DRY) {
    const covers = {};
    for (const e of ok) {
      covers[e.slug] = {
        url: e.url,
        aspect: e.subjectAspect,
        w: e.subjectW,
        h: e.subjectH,
      };
    }
    fs.writeFileSync(
      MANIFEST,
      `${JSON.stringify(
        {
          meta: {
            generatedAt: new Date().toISOString(),
            canvas: CANVAS,
            pad: PAD,
            subjectFraction: SUBJECT_FRACTION,
            count: ok.length,
            skipped: skipped.length,
          },
          covers,
        },
        null,
        2,
      )}\n`,
    );
  }

  fs.writeFileSync(
    path.join(OUT_DIR, '_report.json'),
    JSON.stringify({ ok, skipped }, null, 2),
  );

  console.log(
    `${DRY ? 'DRY' : 'APPLY'}  normalized=${ok.length}  skipped=${skipped.length}  out=${OUT_DIR}`,
  );
  for (const s of skipped.slice(0, 25)) console.log(`  skip ${s.slug}: ${s.reason}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
