/**
 * Frame Studio 2.3 — synthetic fixtures.
 *
 * The engine is pure: it takes decoded pixels and returns plain data. So the
 * fixtures are decoded pixels, generated deterministically here rather than
 * committed as binaries. No sharp, no network, no disk — the same purity that
 * made 2.1's acceptance gate worth having.
 */

import type { RawImage } from "../../src/lib/frame-engine";

export type Rect = { x: number; y: number; w: number; h: number };

/** RGBA canvas with a solid opaque rectangle on a transparent field. */
export function alphaImage(w: number, h: number, subject: Rect): RawImage {
  const data = new Uint8Array(w * h * 4); // all zero => fully transparent
  paintRect(data, w, 4, subject, [40, 40, 40, 255]);
  return { data, w, h, channels: 4 };
}

/** RGBA canvas, fully opaque: a dark rectangle on a near-white studio field. */
export function whiteBgImage(
  w: number,
  h: number,
  subject: Rect,
  bg: [number, number, number] = [252, 252, 251],
): RawImage {
  const data = new Uint8Array(w * h * 4);
  fill(data, 4, [bg[0], bg[1], bg[2], 255]);
  paintRect(data, w, 4, subject, [30, 30, 30, 255]);
  return { data, w, h, channels: 4 };
}

/** RGBA canvas, fully opaque, on a mid-grey field — the "do not guess" case. */
export function dirtyBgImage(w: number, h: number, subject: Rect): RawImage {
  const data = new Uint8Array(w * h * 4);
  fill(data, 4, [120, 118, 114, 255]);
  paintRect(data, w, 4, subject, [20, 20, 20, 255]);
  return { data, w, h, channels: 4 };
}

function fill(data: Uint8Array, channels: number, color: number[]) {
  for (let i = 0; i < data.length; i += channels) {
    for (let c = 0; c < channels; c++) data[i + c] = color[c]!;
  }
}

function paintRect(data: Uint8Array, w: number, channels: number, r: Rect, color: number[]) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * w + x) * channels;
      for (let c = 0; c < channels; c++) data[i + c] = color[c]!;
    }
  }
}

/**
 * Render a placement the way `scripts/lib/frame-render.ts` does — contain
 * projection, then scale/translate — into a fresh canvas, so `verify` can be
 * exercised on an actual composition without sharp.
 */
export function composeToCanvas(
  src: RawImage,
  placement: { scale: number; offsetX: number; offsetY: number },
  canvasW: number,
  canvasH: number,
  opts: { background: "transparent" | "white" } = { background: "transparent" },
): RawImage {
  const out = new Uint8Array(canvasW * canvasH * 4);
  if (opts.background === "white") fill(out, 4, [255, 255, 255, 255]);

  const frameAspect = canvasW / canvasH;
  const imgAspect = src.w / src.h;
  const containW = imgAspect >= frameAspect ? canvasW : canvasH * imgAspect;
  const containH = imgAspect >= frameAspect ? canvasW / imgAspect : canvasH;
  const drawW = Math.max(1, Math.round(containW * placement.scale));
  const drawH = Math.max(1, Math.round(containH * placement.scale));
  const left = Math.round((canvasW - drawW) / 2 + placement.offsetX * canvasW);
  const top = Math.round((canvasH - drawH) / 2 + placement.offsetY * canvasH);

  for (let y = 0; y < drawH; y++) {
    const cy = top + y;
    if (cy < 0 || cy >= canvasH) continue;
    const sy = Math.min(src.h - 1, Math.floor((y / drawH) * src.h));
    for (let x = 0; x < drawW; x++) {
      const cx = left + x;
      if (cx < 0 || cx >= canvasW) continue;
      const sx = Math.min(src.w - 1, Math.floor((x / drawW) * src.w));
      const si = (sy * src.w + sx) * src.channels;
      const a = src.channels >= 4 ? src.data[si + 3]! : 255;
      if (a < 12) continue; // nearest-neighbour, no blending: source alpha wins
      const di = (cy * canvasW + cx) * 4;
      out[di] = src.data[si]!;
      out[di + 1] = src.data[si + 1] ?? src.data[si]!;
      out[di + 2] = src.data[si + 2] ?? src.data[si]!;
      out[di + 3] = 255;
    }
  }
  return { data: out, w: canvasW, h: canvasH, channels: 4 };
}
