// Deterministic cover framing.
//
// The model reframes whatever you hand it, so framing is NOT negotiated with
// the prompt — it is imposed afterwards. Every upscaled cover lands on the same
// square white canvas, with the silhouette at the same scale target and the
// same anchor line as the live tile fit rules use.
//
// Aspect ratio decision: SQUARE (1:1).
//   - Collection tiles are square, so a square master is used 1:1 with no crop.
//   - PDP / QuickView stages are 4:3-ish and letterbox a square on white, which
//     is invisible against #ffffff.
//   - Any non-square master would force a center-crop somewhere, and center-crop
//     is exactly what produced the inconsistent sizing we keep fighting.

import sharp from 'sharp';

export const CANVAS = 1536;

// Mirrors src/components/collection/categoryFit.ts. Keep in sync by hand —
// the bake pipeline is node, the fit rules are TS in the client bundle.
const RULES = {
  seating:        { anchor: 'bottom', anchorY: 0.90, maxW: 0.86, maxH: 0.80 },
  tables:         { anchor: 'bottom', anchorY: 0.90, maxW: 0.86, maxH: 0.80 },
  bars:           { anchor: 'bottom', anchorY: 0.90, maxW: 0.80, maxH: 0.84 },
  lighting:       { anchor: 'bottom', anchorY: 0.92, maxW: 0.72, maxH: 0.84 },
  chandeliers:    { anchor: 'top',    anchorY: 0.08, maxW: 0.78, maxH: 0.80 },
  candlelight:    { anchor: 'bottom', anchorY: 0.85, maxW: 0.62, maxH: 0.76 },
  tableware:      { anchor: 'center', anchorY: 0.50, maxW: 0.70, maxH: 0.70 },
  serveware:      { anchor: 'center', anchorY: 0.50, maxW: 0.74, maxH: 0.74 },
  'pillows-throws': { anchor: 'center', anchorY: 0.50, maxW: 0.76, maxH: 0.76 },
  rugs:           { anchor: 'center', anchorY: 0.55, maxW: 0.86, maxH: 0.80 },
  'large-decor':  { anchor: 'bottom', anchorY: 0.90, maxW: 0.82, maxH: 0.84 },
  storage:        { anchor: 'bottom', anchorY: 0.90, maxW: 0.84, maxH: 0.82 },
  styling:        { anchor: 'center', anchorY: 0.55, maxW: 0.70, maxH: 0.72 },
  'furs-pelts':   { anchor: 'center', anchorY: 0.55, maxW: 0.84, maxH: 0.78 },
};
const DEFAULT_RULE = { anchor: 'center', anchorY: 0.5, maxW: 0.78, maxH: 0.78 };

export const ruleFor = (slug) => RULES[slug] || DEFAULT_RULE;

/** Bounding box of everything that is not near-white / not transparent. */
export async function contentBox(buf, { threshold = 246 } = {}) {
  const { data, info } = await sharp(buf)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      if (data[i] < threshold || data[i + 1] < threshold || data[i + 2] < threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, srcW: w, srcH: h };
}

/**
 * Trim to content, then place on a square white canvas at the category's
 * scale target and anchor line. Same product size, same spot, every time.
 */
export async function normalizeCover(buf, categorySlug, { canvas = CANVAS } = {}) {
  const rule = ruleFor(categorySlug);
  const box = await contentBox(buf);
  if (!box) return { buf, note: 'blank-input' };

  const subject = await sharp(buf)
    .flatten({ background: '#ffffff' })
    .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .toBuffer();

  const scale = Math.min((canvas * rule.maxW) / box.width, (canvas * rule.maxH) / box.height);
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));

  const left = Math.round((canvas - w) / 2);
  const anchorPx = Math.round(canvas * rule.anchorY);
  const top =
    rule.anchor === 'bottom' ? anchorPx - h
    : rule.anchor === 'top' ? anchorPx
    : Math.round(anchorPx - h / 2);

  const resized = await sharp(subject).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).toBuffer();

  const out = await sharp({
    create: { width: canvas, height: canvas, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: resized, left, top: Math.max(0, Math.min(top, canvas - h)) }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { buf: out, note: `${box.width}x${box.height} -> ${w}x${h} @ ${rule.anchor}/${rule.anchorY}` };
}

/**
 * Pre-pad the source to square white before sending it to the model. The model
 * mirrors the framing it is given, so a square in means far less reframing out.
 */
export async function padToSquare(buf, { margin = 0.06 } = {}) {
  const box = await contentBox(buf);
  const base = sharp(buf).flatten({ background: '#ffffff' });
  const meta = await sharp(buf).metadata();
  const side = Math.round(Math.max(box?.width ?? meta.width, box?.height ?? meta.height) * (1 + margin * 2));
  const src = box
    ? await base.extract({ left: box.left, top: box.top, width: box.width, height: box.height }).toBuffer()
    : await base.toBuffer();
  const s = await sharp(src).metadata();
  return sharp({ create: { width: side, height: side, channels: 3, background: '#ffffff' } })
    .composite([{ input: src, left: Math.round((side - s.width) / 2), top: Math.round((side - s.height) / 2) }])
    .png()
    .toBuffer();
}
