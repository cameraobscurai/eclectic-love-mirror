/**
 * Frame Studio 2.2 — `renderCover`.
 *
 * Node-only (sharp). Deliberately NOT under src/: nothing in the app import
 * graph may pull sharp into the Worker bundle. The batch bake (2.4) and the
 * engine fixtures (2.3) import this; the server function receives finished
 * bytes over base64, exactly as Phase 1 specified.
 *
 * Contract:
 *   decode -> crop/rotate per recipe -> ONE composition on 1500x1200
 *   -> verify(that composition) -> two encodings (1200w, 600w) from the SAME
 *   canvas. Never two render passes: the pair cannot disagree.
 *   A verify FAIL returns the failure list and NO bytes.
 *
 * sharp only, `kernel: 'lanczos3'`, two-step downscale below 0.5x (amendment 3).
 */

import sharp from "sharp";
import {
  CANVAS_W,
  CANVAS_H,
  FRAME_ASPECT,
  OUTPUT_SIZES,
  measureSilhouette,
  placeSilhouette,
  toFrameBox,
  verify,
  RULE_VERSION,
  type FrameRecipe,
  type Measurement,
  type RawImage,
  type VerifyResult,
} from "../../src/lib/frame-engine";
import { sha256Hex } from "../../src/lib/frame-hash";

export type RenderInput = {
  sourceBytes: Uint8Array;
  categorySlug: string | null | undefined;
  collectionSlug?: string | null;
  /** Omit to auto-place from the measured silhouette. */
  recipe?: FrameRecipe;
};

export type RenderOutput = {
  ok: boolean;
  /** Present on success only. */
  bytes?: { w1200: Uint8Array; w600: Uint8Array };
  recipe: FrameRecipe;
  measurement: Measurement;
  verify: VerifyResult;
  srcHash: string;
  ruleVersion: string;
  resampleFactor: number;
  /** Silhouette bbox in source pixel space, for `cover_framed_meta.bboxPx`. */
  bboxPx: [number, number, number, number] | null;
  /** Transparent canvas (alpha source) or flattened white (opaque source). */
  background: "transparent" | "white";
};

const toRaw = async (buf: Buffer): Promise<RawImage & { buf: Buffer }> => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), w: info.width, h: info.height, channels: info.channels, buf };
};

/** lanczos3 resize, split into two passes when shrinking past 0.5x. */
async function resample(input: Buffer, w: number, h: number): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const srcW = meta.width ?? w;
  if (w / srcW < 0.5) {
    const mid = await sharp(input)
      .resize(Math.max(1, Math.round(srcW / 2)), null, { kernel: "lanczos3" })
      .toBuffer();
    return sharp(mid).resize(w, h, { fit: "fill", kernel: "lanczos3" }).toBuffer();
  }
  return sharp(input).resize(w, h, { fit: "fill", kernel: "lanczos3" }).toBuffer();
}

export async function renderCover(input: RenderInput): Promise<RenderOutput> {
  const src = Buffer.from(input.sourceBytes);
  const srcHash = await sha256Hex(input.sourceBytes);

  // 1. crop / rotate per recipe (Phase 2 writes neither; the path exists so
  //    3.5's straighten tool needs no re-plumb).
  let working = sharp(src);
  const meta0 = await working.metadata();
  if (input.recipe?.crop) {
    const c = input.recipe.crop;
    const W = meta0.width ?? 1;
    const H = meta0.height ?? 1;
    working = sharp(
      await working
        .extract({
          left: Math.max(0, Math.round(c.x * W)),
          top: Math.max(0, Math.round(c.y * H)),
          width: Math.max(1, Math.round(c.w * W)),
          height: Math.max(1, Math.round(c.h * H)),
        })
        .toBuffer(),
    );
  }
  if (input.recipe?.rotate) {
    working = sharp(
      await working
        .rotate(input.recipe.rotate, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toBuffer(),
    );
  }
  const prepared = await working.toBuffer();

  // 2. measure the silhouette on the prepared source.
  const raw = await toRaw(prepared);
  const measurement = measureSilhouette(raw);

  const emptyVerify = (message: string): VerifyResult => ({
    pass: false,
    failures: [{ code: "V4", message }],
    advisories: [],
  });

  if (!measurement.bbox) {
    return {
      ok: false,
      recipe: input.recipe ?? { placement: { scale: 1, offsetX: 0, offsetY: 0 } },
      measurement,
      verify: emptyVerify("measureSilhouette failed — dirty or dark background (queue for review)"),
      srcHash,
      ruleVersion: RULE_VERSION,
      resampleFactor: 1,
      bboxPx: null,
      background: "white",
    };
  }

  // Alpha source keeps its transparency; an opaque white-bg source is composed
  // onto white so the render measures the subject, not a pasted rectangle.
  const background: "transparent" | "white" =
    measurement.method === "alpha" ? "transparent" : "white";

  // 3. placement (auto unless the caller supplied a recipe).
  const box = toFrameBox(measurement.bbox, raw.w, raw.h, FRAME_ASPECT);
  const recipe: FrameRecipe = input.recipe ?? {
    placement: placeSilhouette(box, input.categorySlug, input.collectionSlug),
  };
  const { scale, offsetX, offsetY } = recipe.placement;

  // 4. ONE composition on 1500x1200. `contain` projection then scale/translate
  //    — the same geometry `toFrameBox`/`placeSilhouette` reason in.
  const imgAspect = raw.w / Math.max(1, raw.h);
  const containW = imgAspect >= FRAME_ASPECT ? CANVAS_W : CANVAS_H * imgAspect;
  const containH = imgAspect >= FRAME_ASPECT ? CANVAS_W / imgAspect : CANVAS_H;
  const drawW = Math.max(1, Math.round(containW * scale));
  const drawH = Math.max(1, Math.round(containH * scale));
  const left = Math.round((CANVAS_W - drawW) / 2 + offsetX * CANVAS_W);
  const top = Math.round((CANVAS_H - drawH) / 2 + offsetY * CANVAS_H);
  const resampleFactor = drawW / raw.w;

  let layer = await resample(prepared, drawW, drawH);
  let layerLeft = left;
  let layerTop = top;

  // The engine has no clamp band, so a placement may legitimately ask for a
  // layer larger than the canvas or hanging off its edge. sharp refuses to
  // composite that ("must have same dimensions or smaller"), so crop the layer
  // to the visible window and shift the origin to match. The geometry is
  // unchanged — the render is exactly what the placement asked for, clipped by
  // the frame — which is precisely what V3 exists to catch downstream. Do NOT
  // "fix" this by shrinking the placement: that would reintroduce a clamp.
  const cropLeft = Math.max(0, -layerLeft);
  const cropTop = Math.max(0, -layerTop);
  const cropW = Math.min(drawW - cropLeft, CANVAS_W - Math.max(0, layerLeft));
  const cropH = Math.min(drawH - cropTop, CANVAS_H - Math.max(0, layerTop));
  if (cropW <= 0 || cropH <= 0) {
    return {
      ok: false,
      recipe: input.recipe ?? { placement: { scale, offsetX, offsetY } },
      measurement,
      verify: {
        pass: false,
        failures: [{ code: "V3", message: "placement puts the subject entirely off-canvas" }],
        advisories: [],
      },
      srcHash,
      ruleVersion: RULE_VERSION,
      resampleFactor,
      bboxPx: [measurement.bbox.x, measurement.bbox.y, measurement.bbox.w, measurement.bbox.h],
      background,
    };
  }
  if (cropLeft || cropTop || cropW !== drawW || cropH !== drawH) {
    layer = await sharp(layer)
      .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
      .toBuffer();
    layerLeft = Math.max(0, layerLeft);
    layerTop = Math.max(0, layerTop);
  }

  const canvas = sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background:
        background === "white"
          ? { r: 255, g: 255, b: 255, alpha: 1 }
          : { r: 255, g: 255, b: 255, alpha: 0 },
    },
  }).composite([{ input: layer, left: layerLeft, top: layerTop }]);

  const rendered = await canvas.png().toBuffer();

  // 5. verify the 1500 render, before any encoding leaves this function.
  const renderedRaw = await toRaw(rendered);
  const result = verify(
    { rendered: renderedRaw, resampleFactor },
    input.categorySlug,
    input.collectionSlug,
  );

  const bboxPx: [number, number, number, number] = [
    measurement.bbox.x,
    measurement.bbox.y,
    measurement.bbox.w,
    measurement.bbox.h,
  ];

  if (!result.pass) {
    return {
      ok: false,
      recipe,
      measurement,
      verify: result,
      srcHash,
      ruleVersion: RULE_VERSION,
      resampleFactor,
      bboxPx,
      background,
    };
  }

  // 6. two encodings of that one canvas.
  const encode = async (w: number, h: number) => {
    const resized = await resample(rendered, w, h);
    return new Uint8Array(await sharp(resized).webp({ quality: 82 }).toBuffer());
  };
  const [a, b] = OUTPUT_SIZES;
  const w1200 = await encode(a.w, a.h);
  const w600 = await encode(b.w, b.h);

  // V6 on the encoded bytes.
  const oversize = [
    { name: `${a.w}w`, n: w1200.byteLength },
    { name: `${b.w}w`, n: w600.byteLength },
  ].filter((x) => x.n > 400_000);
  if (oversize.length) {
    return {
      ok: false,
      recipe,
      measurement,
      verify: {
        pass: false,
        failures: oversize.map((x) => ({
          code: "V6" as const,
          message: `${x.name} derivative is ${x.n} bytes (>400000)`,
        })),
        advisories: result.advisories,
      },
      srcHash,
      ruleVersion: RULE_VERSION,
      resampleFactor,
      bboxPx,
      background,
    };
  }

  return {
    ok: true,
    bytes: { w1200, w600 },
    recipe,
    measurement,
    verify: result,
    srcHash,
    ruleVersion: RULE_VERSION,
    resampleFactor,
    bboxPx,
    background,
  };
}
