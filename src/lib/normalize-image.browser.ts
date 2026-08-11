/**
 * Browser port of scripts/normalize-covers.mjs.
 *
 * Why it lives in the browser: the normalization needs pixel access, and the
 * script version uses `sharp`, which cannot run in the Worker runtime our
 * server functions execute in. Doing it client-side at upload time also means
 * staff SEE the normalized result before they save, instead of discovering it
 * on the public grid later.
 *
 * Same math, same constants as the script, so a derivative produced here is
 * interchangeable with one produced by the batch pass:
 *   1. find the subject bounding box (alpha mask when the file is a cutout,
 *      corner-median colour keying when it is a photo on a light sweep)
 *   2. crop to that box
 *   3. centre it on a fixed 1536x1536 transparent canvas with uniform padding
 *
 * Returns the derivative PNG plus the subject box as fractions of the canvas.
 * That box is what the render layer uses to size a tile analytically instead
 * of measuring the image in the browser on first paint.
 */

export const CANVAS = 1536;
export const PAD = 0.06;
export const SUBJECT_FRACTION = 1 - PAD * 2;

export type NormalizedResult = {
  blob: Blob;
  /** Subject width as a fraction of the square canvas. */
  w: number;
  /** Subject height as a fraction of the square canvas. */
  h: number;
  aspect: number;
  isCutout: boolean;
  /** Subject area as a fraction of the source image. Sanity gate. */
  coverage: number;
};

export class NormalizeError extends Error {}

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  isCutout: boolean;
  coverage: number;
};

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new NormalizeError("Could not read that image file.");
  }
}

function subjectBox(bmp: ImageBitmap): Box | null {
  const fullW = bmp.width;
  const fullH = bmp.height;
  if (!fullW || !fullH) return null;

  // Detect on a downscaled copy — identical to the script's 700px probe.
  const maxSide = 700;
  const s = Math.min(1, maxSide / Math.max(fullW, fullH));
  const w = Math.max(1, Math.round(fullW * s));
  const h = Math.max(1, Math.round(fullH * s));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new NormalizeError("Canvas unavailable in this browser.");
  ctx.drawImage(bmp, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const at = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };

  // Cutout test on the border ring only: interior alpha is noisy when the
  // file carries a soft drop shadow.
  let borderPx = 0;
  let borderTransparent = 0;
  const ring = Math.min(2, Math.floor(Math.min(w, h) / 2) - 1);
  if (ring >= 0) {
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
  }
  const isCutout = borderTransparent / Math.max(1, borderPx) > 0.5;

  const fullFrame: Box = {
    left: 0,
    top: 0,
    width: fullW,
    height: fullH,
    isCutout: false,
    coverage: 1,
  };

  let bg: readonly [number, number, number] = [255, 255, 255];
  let tol = 0;
  if (!isCutout) {
    const corners = [at(3, 3), at(w - 4, 3), at(3, h - 4), at(w - 4, h - 4)];
    const med = (k: 0 | 1 | 2) =>
      corners.map((cc) => cc[k]).sort((a, b) => a - b)[2];
    bg = [med(0), med(1), med(2)];
    const darkest = Math.min(bg[0], bg[1], bg[2]);
    // Corners are not background — subject runs to the edge, keep full frame.
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
      if (data[i + 3] < 16) continue;
      if (
        !isCutout &&
        Math.abs(data[i] - bg[0]) <= tol &&
        Math.abs(data[i + 1] - bg[1]) <= tol &&
        Math.abs(data[i + 2] - bg[2]) <= tol
      ) {
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  const coverage = ((maxX - minX + 1) * (maxY - minY + 1)) / (w * h);
  if (coverage < 0.005) return null; // dust, not a product

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
    coverage,
  };
}

/**
 * Produce the normalized derivative for one uploaded file.
 * Throws NormalizeError when the subject cannot be separated — the caller
 * keeps the original and tells the user, rather than shipping a guess.
 */
export async function normalizeImageFile(file: Blob): Promise<NormalizedResult> {
  const bmp = await decode(file);
  try {
    const box = subjectBox(bmp);
    if (!box) {
      throw new NormalizeError(
        "Could not separate the product from the background. Use a photo on a plain light backdrop, or a PNG cutout.",
      );
    }

    const inner = Math.round(CANVAS * SUBJECT_FRACTION);
    const scale = Math.min(inner / box.width, inner / box.height);
    const drawW = Math.max(1, Math.round(box.width * scale));
    const drawH = Math.max(1, Math.round(box.height * scale));

    const out = document.createElement("canvas");
    out.width = CANVAS;
    out.height = CANVAS;
    const ctx = out.getContext("2d");
    if (!ctx) throw new NormalizeError("Canvas unavailable in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bmp,
      box.left,
      box.top,
      box.width,
      box.height,
      Math.round((CANVAS - drawW) / 2),
      Math.round((CANVAS - drawH) / 2),
      drawW,
      drawH,
    );

    const blob = await new Promise<Blob | null>((res) =>
      out.toBlob(res, "image/png"),
    );
    if (!blob) throw new NormalizeError("Could not encode the normalized image.");

    return {
      blob,
      w: drawW / CANVAS,
      h: drawH / CANVAS,
      aspect: drawW / drawH,
      isCutout: box.isCutout,
      coverage: box.coverage,
    };
  } finally {
    bmp.close?.();
  }
}

/**
 * Gate a computed box before it is allowed to influence sizing. A detector
 * that found almost nothing, or the whole frame, is not trustworthy enough to
 * drive tile scale — fall back to the original photo in that case.
 */
export function geometryIsTrustworthy(r: NormalizedResult): boolean {
  if (!(r.w > 0) || !(r.h > 0)) return false;
  if (r.coverage < 0.02) return false;
  if (r.coverage > 0.995) return false;
  return true;
}
