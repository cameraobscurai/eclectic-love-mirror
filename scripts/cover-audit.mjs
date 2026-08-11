// cover-audit.mjs — "how many covers are fucked, exactly, and why"
//
// Downloads every LIVE cover (baked catalog + published overlay, same merge
// precedence as phase3-catalog), runs the silhouette measurement + the current
// category fit solver OFFLINE against full-res bytes, and grades each cover:
//
//   PASS            solver lands inside target band, nothing clips
//   MEASURE_FAIL    background detection genuinely failed → bbox ≈ whole frame
//                   AND there was no alpha channel to trust. The live grid is
//                   size-normalizing the PHOTO, not the product.
//   TIGHT_CROP      advisory: alpha detection SUCCEEDED and the subject really
//                   does fill >93% of the frame. A correct measurement of a
//                   badly cropped source — not a measurement failure. These
//                   rows still run the solver, so their clamp numbers count.
//   CLAMP_TINY      required upscale exceeds clampMax → renders undersized
//   CLAMP_MASSIVE   required downscale exceeds clampMin → renders oversized
//   WOULD_CLIP      solved placement pushes silhouette past the frame edge
//   OPAQUE_BG       no alpha channel (upscaler/JPEG era) — measurement is
//                   running on the fragile color-threshold path
//   LOW_RES         longest edge < 900px — soft at 600w tile after transform

//
// Outputs:
//   cover-audit.csv           one row per product, all metrics + flags
//   cover-audit.html          contact sheet, grouped by category, red/amber/green
//   stdout                    per-category + total counts
//
// Run from repo root:
//   npm i sharp --no-save
//   node scripts/cover-audit.mjs            # full catalog
//   node scripts/cover-audit.mjs seating    # one category
//
// No env needed — reads src/data/inventory/current_catalog.json and the public
// overlay manifest, exactly like the live site does.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const CATALOG = JSON.parse(
  fs.readFileSync('src/data/inventory/current_catalog.json', 'utf8'),
);
const SUPABASE = 'https://wdyfavzfquegrxklcpmq.supabase.co';
const CATEGORY_FILTER = process.argv[2] || null;
const CONCURRENCY = 8;
const FRAME_ASPECT = 5 / 4; // PRODUCT_TILE_FRAME_ASPECT
const INSET = 0.94;         // TILE_IMAGE_INSET

// ── Category fit rules — MIRROR of src/components/collection/categoryFit.ts.
// Keep in sync by hand; the audit is only as honest as this table.
const RULES = {
  seating:          { primary: 'width',  aspectBlend: 0.65, refAspect: 2.4, primaryTarget: 0.82, secondaryMax: 0.58, anchor: 'bottom', anchorY: 0.90, clampMin: 0.70, clampMax: 1.10 },
  tables:           { primary: 'width',  aspectBlend: 0.50, refAspect: 2.0, primaryTarget: 0.80, secondaryMax: 0.60, anchor: 'bottom', anchorY: 0.90, clampMin: 0.70, clampMax: 1.10 },
  bars:             { primary: 'height', primaryTarget: 0.70, secondaryMax: 0.82, anchor: 'bottom', anchorY: 0.90, clampMin: 0.55, clampMax: 1.15 },
  lighting:         { primary: 'height', primaryTarget: 0.72, secondaryMax: 0.55, anchor: 'bottom', anchorY: 0.92, clampMin: 0.50, clampMax: 1.15 },
  chandeliers:      { primary: 'height', primaryTarget: 0.78, secondaryMax: 0.60, anchor: 'top',    anchorY: 0.08, clampMin: 0.50, clampMax: 1.15 },
  candlelight:      { primary: 'height', primaryTarget: 0.55, secondaryMax: 0.55, anchor: 'bottom', anchorY: 0.85, clampMin: 0.60, clampMax: 1.15 },
  tableware:        { primary: 'area',   primaryTarget: 0.30, secondaryMax: 0.90, anchor: 'center', anchorY: 0.50, clampMin: 0.75, clampMax: 1.20 },
  serveware:        { primary: 'area',   primaryTarget: 0.32, secondaryMax: 0.90, anchor: 'center', anchorY: 0.50, clampMin: 0.75, clampMax: 1.20 },
  'pillows-throws': { primary: 'area',   primaryTarget: 0.42, secondaryMax: 0.90, anchor: 'center', anchorY: 0.50, clampMin: 0.75, clampMax: 1.20 },
  rugs:             { primary: 'width',  primaryTarget: 0.88, secondaryMax: 0.35, anchor: 'center', anchorY: 0.55, clampMin: 0.60, clampMax: 1.20 },
  'large-decor':    { primary: 'height', primaryTarget: 0.72, secondaryMax: 0.62, anchor: 'bottom', anchorY: 0.90, clampMin: 0.55, clampMax: 1.15 },
  storage:          { primary: 'height', primaryTarget: 0.68, secondaryMax: 0.62, anchor: 'bottom', anchorY: 0.90, clampMin: 0.55, clampMax: 1.15 },
  styling:          { primary: 'area',   primaryTarget: 0.34, secondaryMax: 0.90, anchor: 'center', anchorY: 0.55, clampMin: 0.75, clampMax: 1.20 },
  'furs-pelts':     { primary: 'area',   primaryTarget: 0.42, secondaryMax: 0.90, anchor: 'center', anchorY: 0.55, clampMin: 0.75, clampMax: 1.20 },
};
const DEFAULT_RULE = { primary: 'area', primaryTarget: 0.32, secondaryMax: 0.90, anchor: 'center', anchorY: 0.50, clampMin: 0.70, clampMax: 1.20 };

// ── Live cover per product: overlay images[0] wins when non-empty, else baked.
async function liveCovers() {
  let overlay = {};
  try {
    const man = await fetch(
      `${SUPABASE}/storage/v1/object/public/squarespace-mirror/catalog/manifest.json?t=${Date.now()}`,
    ).then((r) => (r.ok ? r.json() : null));
    if (man?.overlayKey) {
      const payload = await fetch(
        `${SUPABASE}/storage/v1/object/public/squarespace-mirror/${man.overlayKey}`,
      ).then((r) => (r.ok ? r.json() : null));
      overlay = payload?.overlay ?? {};
    }
  } catch { /* baked-only audit */ }

  const rows = [];
  for (const p of CATALOG.products) {
    if (p.publicReady === false) continue;
    if (CATEGORY_FILTER && p.categorySlug !== CATEGORY_FILTER) continue;
    const live = overlay[p.id];
    const url =
      (Array.isArray(live?.images) && live.images.length > 0 ? live.images[0] : null) ??
      p.images?.[0]?.url ?? null;
    if (!url) continue;
    rows.push({ id: p.id, title: p.title, category: p.categorySlug, url });
  }
  return rows;
}

// ── Silhouette measurement — same intent as measureImage(), full-res, sharp.
// Alpha path when alpha exists; border-ring-median color path otherwise
// (stronger than the client's 4-corner sample, so MEASURE_FAIL here means the
// client definitely failed too).
async function measure(buf) {
  const img = sharp(buf, { limitInputPixels: 1e9 });
  const meta = await img.metadata();
  const W = meta.width, H = meta.height;
  const maxSide = 360;
  const s = Math.min(1, maxSide / Math.max(W, H));
  const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
  const { data } = await img
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Alpha coverage: if a meaningful share of pixels are transparent, trust alpha.
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 12) transparent++;
  const hasAlphaBg = transparent / (w * h) > 0.05;

  // Border-ring median for the color path.
  let bg = null;
  if (!hasAlphaBg) {
    const ring = [];
    const px = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
    for (let x = 0; x < w; x += 2) { ring.push(px(x, 0), px(x, h - 1)); }
    for (let y = 0; y < h; y += 2) { ring.push(px(0, y), px(w - 1, y)); }
    const med = (k) => ring.map((c) => c[k]).sort((a, b) => a - b)[ring.length >> 1];
    bg = [med(0), med(1), med(2)];
  }
  const light = bg && Math.min(...bg) > 198;
  const tol = light ? Math.max(16, (255 - Math.min(...bg)) * 0.7) : 0;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (hasAlphaBg) { if (data[i + 3] < 12) continue; }
      else if (light) {
        if (
          Math.abs(data[i] - bg[0]) <= tol &&
          Math.abs(data[i + 1] - bg[1]) <= tol &&
          Math.abs(data[i + 2] - bg[2]) <= tol
        ) continue;
      }
      // opaque + non-light bg: every pixel is "product" → bbox = frame → MEASURE_FAIL
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { W, H, fail: true, hasAlphaBg };

  // Letterbox into the 5:4 tile frame (mirror of client math), tile-space bbox.
  const na = W / H;
  const rw = na >= FRAME_ASPECT ? 1 : na / FRAME_ASPECT;
  const rh = na >= FRAME_ASPECT ? FRAME_ASPECT / na : 1;
  const left = na >= FRAME_ASPECT ? 0 : (1 - rw) / 2;
  const top = na >= FRAME_ASPECT ? (1 - rh) / 2 : 0;
  const bw = ((maxX - minX + 1) / w) * rw;
  const bh = ((maxY - minY + 1) / h) * rh;
  const cx = left + ((minX + maxX + 1) / 2 / w) * rw;
  const cy = top + ((minY + maxY + 1) / 2 / h) * rh;
  const bottom = top + ((maxY + 1) / h) * rh;
  const frameCoverage = (bw * bh) / (rw * rh);
  return { W, H, bw, bh, cx, cy, bottom, frameCoverage, hasAlphaBg, fail: false };
}

// ── solveFit mirror — returns solved scale + whether clamps bound.
function solve(m, rule) {
  const wi = INSET * m.bw, hi = INSET * m.bh;
  let sT;
  if (rule.primary === 'width') sT = rule.primaryTarget / Math.max(0.001, wi);
  else if (rule.primary === 'height') sT = rule.primaryTarget / Math.max(0.001, hi);
  else sT = rule.primaryTarget / Math.sqrt(Math.max(0.001, wi * hi));
  const blend = rule.aspectBlend ?? 0;
  if (blend > 0 && rule.primary !== 'area') {
    const aspect = wi / Math.max(0.001, hi);
    const exp = rule.primary === 'width' ? blend / 2 : -blend / 2;
    sT *= Math.pow(aspect / (rule.refAspect ?? 1), exp);
  }
  let cap = Infinity;
  if (rule.primary === 'width') cap = rule.secondaryMax / Math.max(0.001, hi);
  else if (rule.primary === 'height') cap = rule.secondaryMax / Math.max(0.001, wi);
  const unclamped = Math.min(sT, cap);
  const s = Math.max(rule.clampMin, Math.min(rule.clampMax, unclamped));
  return { s, unclamped, hitMax: unclamped > rule.clampMax, hitMin: unclamped < rule.clampMin };
}

// Soft flags never make a cover BROKEN on their own.
const SOFT_FLAGS = new Set(['OPAQUE_BG', 'LOW_RES', 'TIGHT_CROP']);

function grade(m, rule) {
  const flags = [];
  // A >0.93 frame coverage read off a real alpha channel is a CORRECT
  // measurement of a tight crop, not a failed measurement. Only call it
  // MEASURE_FAIL when detection actually failed or there was no alpha to
  // trust (color-threshold path defaulting the bbox to the whole frame).
  const fullFrame = m.frameCoverage > 0.93;
  if (m.fail || (fullFrame && !m.hasAlphaBg)) flags.push('MEASURE_FAIL');
  else if (fullFrame) flags.push('TIGHT_CROP');
  if (!m.hasAlphaBg) flags.push('OPAQUE_BG');
  if (Math.max(m.W, m.H) < 900) flags.push('LOW_RES');
  let solved = null;
  if (!flags.includes('MEASURE_FAIL')) {
    // TIGHT_CROP rows reach the solver — that's the point of the downgrade.
    // Their clamp numbers were previously swallowed by the false positive.
    solved = solve(m, rule);
    // >15% residual error after clamp = visibly off next to a passing neighbor.
    if (solved.hitMax && solved.unclamped / solved.s > 1.15) flags.push('CLAMP_TINY');
    if (solved.hitMin && solved.s / solved.unclamped > 1.15) flags.push('CLAMP_MASSIVE');
    // Clip check at solved placement.
    const sw = m.bw * solved.s, sh = m.bh * solved.s;
    const cyS = rule.anchor === 'bottom'
      ? rule.anchorY - sh / 2
      : rule.anchor === 'top' ? rule.anchorY + sh / 2 : rule.anchorY;
    if (cyS - sh / 2 < -0.01 || cyS + sh / 2 > 1.01 || sw > 1.02) flags.push('WOULD_CLIP');
  }
  const hard = flags.filter((f) => !SOFT_FLAGS.has(f));
  const verdict = hard.length ? 'BROKEN' : flags.length ? 'AT_RISK' : 'PASS';
  return { flags, verdict, solved };
}


async function run() {
  const rows = await liveCovers();
  console.log(`auditing ${rows.length} live covers${CATEGORY_FILTER ? ` in ${CATEGORY_FILTER}` : ''}…`);
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < rows.length) {
        const r = rows[i++];
        try {
          const res = await fetch(r.url, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`http ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          const m = await measure(buf);
          const g = grade(m, RULES[r.category] ?? DEFAULT_RULE);
          out.push({ ...r, ...g, m });
        } catch (e) {
          out.push({ ...r, verdict: 'BROKEN', flags: ['FETCH_FAIL'], m: null, err: String(e).slice(0, 80) });
        }
        if (out.length % 50 === 0) process.stdout.write(`  ${out.length}/${rows.length}\n`);
      }
    }),
  );

  // ── Report
  const byCat = {};
  for (const r of out) {
    byCat[r.category] ??= { PASS: 0, AT_RISK: 0, BROKEN: 0, flags: {} };
    byCat[r.category][r.verdict]++;
    for (const f of r.flags) byCat[r.category].flags[f] = (byCat[r.category].flags[f] || 0) + 1;
  }
  console.log('\ncategory        pass  risk  broken   dominant failures');
  let tP = 0, tR = 0, tB = 0;
  for (const [cat, s] of Object.entries(byCat).sort()) {
    tP += s.PASS; tR += s.AT_RISK; tB += s.BROKEN;
    const top = Object.entries(s.flags).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`${cat.padEnd(15)} ${String(s.PASS).padStart(4)} ${String(s.AT_RISK).padStart(5)} ${String(s.BROKEN).padStart(7)}   ${top}`);
  }
  console.log(`${'TOTAL'.padEnd(15)} ${String(tP).padStart(4)} ${String(tR).padStart(5)} ${String(tB).padStart(7)}`);

  const csv = ['rms_id,category,title,verdict,flags,imgW,imgH,frameCoverage,solvedScale,unclampedScale,url'];
  for (const r of out) {
    csv.push([
      r.id, r.category, JSON.stringify(r.title ?? ''), r.verdict, r.flags.join('|'),
      r.m?.W ?? '', r.m?.H ?? '', r.m?.frameCoverage?.toFixed(3) ?? '',
      r.solved?.s?.toFixed(3) ?? '', r.solved?.unclamped?.toFixed(3) ?? '', r.url,
    ].join(','));
  }
  fs.writeFileSync('cover-audit.csv', csv.join('\n'));

  const color = { PASS: '#2f7d32', AT_RISK: '#b8860b', BROKEN: '#c62828' };
  const cats = [...new Set(out.map((r) => r.category))].sort();
  const html = `<!doctype html><meta charset=utf8><title>cover audit</title>
<style>body{font:12px/1.4 system-ui;margin:24px;background:#fafafa}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin:8px 0 32px}
.t{background:#fff;border:3px solid #ccc;padding:4px}.t img{width:100%;aspect-ratio:5/4;object-fit:contain;display:block}
.f{color:#c62828;font-weight:600}h2{margin:24px 0 4px}</style>
${cats.map((cat) => `<h2>${cat} — ${byCat[cat].BROKEN} broken / ${byCat[cat].AT_RISK} at-risk / ${byCat[cat].PASS} pass</h2><div class=grid>${
  out.filter((r) => r.category === cat)
    .sort((a, b) => (a.verdict === 'BROKEN' ? -1 : 1) - (b.verdict === 'BROKEN' ? -1 : 1))
    .map((r) => `<div class=t style="border-color:${color[r.verdict]}"><img loading=lazy src="${r.url}"><div>${(r.title ?? '').slice(0, 40)}</div><div class=f>${r.flags.join(' ')}</div><div>s=${r.solved?.s?.toFixed(2) ?? '—'} want=${r.solved?.unclamped?.toFixed(2) ?? '—'}</div></div>`).join('')
}</div>`).join('')}`;
  fs.writeFileSync('cover-audit.html', html);
  console.log('\nwrote cover-audit.csv + cover-audit.html (open in browser for contact sheet)');
}

run().catch((e) => { console.error(e); process.exit(1); });
