import { forwardRef, useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import type React from "react";

type Fit = {
  cx: number;
  cy: number;
  bottom: number;
  scale: number;
};

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  frameAspect?: number;
  visualOffsetY?: number;
  visualAnchorY?: "center" | "bottom";
  visualBaselineY?: number;
  targetArea?: number;
  maxW?: number;
  maxH?: number;
  /** Fit strategy. "area" (default) scales to a target silhouette area —
   *  correct for varied silhouettes (tables, lighting, decor). "width"
   *  scales to a target silhouette width — correct for a single typology
   *  where every object should read at the same horizontal footprint
   *  (e.g. seating: every sofa/loveseat spans ~the same tile width so
   *  they all stand on the same floor at comparable size). */
  fitMode?: "area" | "width";
  targetWidth?: number;
  /** Admin-set focal point (0–1). When both are numbers, silhouette
   *  measurement is skipped and the image is centered on this point. */
  focalX?: number | null;
  focalY?: number | null;
};

const fitCache = new Map<string, Fit | null>();

const FRAME_ASPECT = 5 / 4;
const TILE_IMAGE_INSET = 0.94;
const TILE_OBJECT_CONTENT = 0.92;
// Fallback fit for CORS-tainted, decode-failed, or unmeasurable images.
// Scale sits at the midpoint of the clamp below so a fallback tile reads
// as a peer next to a measured tile instead of a visible outlier.
const DEFAULT_FIT: Fit = { cx: 0.5, cy: 0.5, bottom: 0.62, scale: 0.97 };

// Tight uniform scale clamp. The previous 0.55–1.35 window was wide enough
// that two correctly-measured tiles could end up 2.45x different in size
// and both look "valid." Real editorial grids (RH, Aerin, Serena) keep the
// visual-weight spread inside ~1.4x.
const SCALE_MIN = 0.82;
const SCALE_MAX = 1.12;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fitFromVisualBox(
  cx: number,
  cy: number,
  bw: number,
  bh: number,
  naturalAspect: number,
  frameAspect = FRAME_ASPECT,
  targetAreaOverride?: number,
  maxWOverride?: number,
  maxHOverride?: number,
  fitMode: "area" | "width" = "area",
  targetWidthOverride?: number,
): Fit | null {
  if (!bw || !bh || !naturalAspect) return null;

  const renderedW = naturalAspect >= frameAspect ? bw : (naturalAspect / frameAspect) * bw;
  const renderedH = naturalAspect >= frameAspect ? (frameAspect / naturalAspect) * bh : bh;
  if (!renderedW || !renderedH) return null;

  const targetArea = targetAreaOverride ?? 0.32;
  const maxW = maxWOverride ?? 0.86;
  const maxH = maxHOverride ?? 0.82;

  let primaryScale: number;
  if (fitMode === "width") {
    // Width-band fitting: every silhouette lands at the same horizontal
    // footprint. Used for seating so a wide sofa and a small loveseat
    // both read as "the same class of object" on a shared floor line.
    const targetWidth = targetWidthOverride ?? 0.82;
    primaryScale = targetWidth / Math.max(0.001, TILE_IMAGE_INSET * renderedW);
  } else {
    const currentArea = Math.max(0.001, TILE_IMAGE_INSET * TILE_IMAGE_INSET * renderedW * renderedH);
    primaryScale = Math.sqrt(targetArea / currentArea);
  }
  const scaleByCaps = Math.min(
    maxW / Math.max(0.001, TILE_IMAGE_INSET * renderedW),
    maxH / Math.max(0.001, TILE_IMAGE_INSET * renderedH),
  );

  // Tighter clamp for width-band mode — the whole point is uniformity,
  // so we allow less deviation than the area path.
  const minScale = fitMode === "width" ? 0.90 : SCALE_MIN;
  const maxScale = fitMode === "width" ? 1.10 : SCALE_MAX;

  return {
    cx: clamp(cx, 0.05, 0.95),
    cy: clamp(cy, 0.05, 0.95),
    bottom: clamp(cy + bh / 2, 0.05, 0.95),
    scale: clamp(Math.min(primaryScale, scaleByCaps), minScale, maxScale),
  };
}



function measureImage(
  img: HTMLImageElement,
  frameAspect = FRAME_ASPECT,
  targetArea?: number,
  maxW?: number,
  maxH?: number,
  fitMode: "area" | "width" = "area",
  targetWidth?: number,
): Fit | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const naturalAspect = w / h;

  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, cw, ch);
  } catch {
    return fitFromVisualBox(0.5, 0.5, 1, 1, naturalAspect, frameAspect, targetArea, maxW, maxH, fitMode, targetWidth);
  }

  const px = data.data;
  // Sample the four corners to detect the actual background color.
  // The old code assumed pure white (r,g,b > 242), which failed for
  // studio-white photos (~232), cream/ivory backdrops, and JPEG-compressed
  // cutouts — the entire photo got counted as subject and silhouette
  // measurement collapsed. Median of corner RGB gives a robust background
  // reference regardless of paper stock.
  const sampleCorner = (sx: number, sy: number) => {
    const i = (sy * cw + sx) * 4;
    return [px[i], px[i + 1], px[i + 2]] as const;
  };
  const corners = [
    sampleCorner(2, 2),
    sampleCorner(cw - 3, 2),
    sampleCorner(2, ch - 3),
    sampleCorner(cw - 3, ch - 3),
  ];
  const bgR = corners.map((c) => c[0]).sort((a, b) => a - b)[2];
  const bgG = corners.map((c) => c[1]).sort((a, b) => a - b)[2];
  const bgB = corners.map((c) => c[2]).sort((a, b) => a - b)[2];
  // Only treat as background when it's actually light (>210). Dark corners
  // mean the photo has no consistent bg — fall through and measure everything.
  const hasLightBg = bgR > 210 && bgG > 210 && bgB > 210;
  // Tolerance widens on darker backgrounds to swallow JPEG noise.
  const bgTol = hasLightBg ? Math.max(14, (255 - Math.min(bgR, bgG, bgB)) * 0.6) : 0;

  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const a = px[i + 3];
      if (a < 12) continue;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (
        hasLightBg &&
        Math.abs(r - bgR) <= bgTol &&
        Math.abs(g - bgG) <= bgTol &&
        Math.abs(b - bgB) <= bgTol
      ) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  const bw = (maxX - minX + 1) / cw;
  const bh = (maxY - minY + 1) / ch;
  if (bw <= 0 || bh <= 0) return null;

  const cx = (minX + maxX + 1) / 2 / cw;
  const cy = (minY + maxY + 1) / 2 / ch;

  const fit = fitFromVisualBox(cx, cy, bw, bh, naturalAspect, frameAspect, targetArea, maxW, maxH, fitMode, targetWidth);
  if (!fit) return null;

  const renderedH = naturalAspect >= frameAspect ? frameAspect / naturalAspect : 1;
  const contentTop = naturalAspect >= frameAspect ? (1 - renderedH) / 2 : 0;
  const visualBottom = (1 - TILE_OBJECT_CONTENT) / 2 + (contentTop + ((maxY + 1) / ch) * renderedH) * TILE_OBJECT_CONTENT;
  return { ...fit, bottom: clamp(visualBottom, 0.05, 0.95) };
}

export const NormalizedProductImage = forwardRef<HTMLImageElement, Props>(function NormalizedProductImage({
  src,
  frameAspect = FRAME_ASPECT,
  visualOffsetY = 0,
  visualAnchorY = "center",
  visualBaselineY = 0.66,
  targetArea,
  maxW,
  maxH,
  fitMode = "area",
  targetWidth,
  focalX,
  focalY,
  className,
  style,
  onLoad,
  ...props
}: Props, ref) {
  const hasFocal = typeof focalX === "number" && typeof focalY === "number";
  const cacheKey = `${src}|${frameAspect}|${targetArea}|${maxW}|${maxH}|${fitMode}|${targetWidth}`;
  const cached = fitCache.get(cacheKey);
  const [fit, setFit] = useState<Fit | null | undefined>(cached);

  // Measure via a side-channel Image() with crossOrigin set BEFORE src so
  // the browser fetches with CORS mode from the start and the canvas is not
  // tainted by a pre-existing no-cors cache entry. The visible <img> can
  // load from cache normally. Skipped entirely when admin focal is set.
  useEffect(() => {
    if (hasFocal) return;
    if (!src) return;
    const existing = fitCache.get(cacheKey);
    if (existing !== undefined) {
      if (existing !== fit) setFit(existing);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      if (cancelled) return;
      try {
        const next = measureImage(probe, frameAspect, targetArea, maxW, maxH, fitMode, targetWidth);
        fitCache.set(cacheKey, next);
        setFit(next);
      } catch {
        fitCache.set(cacheKey, null);
        setFit(null);
      }
    };
    probe.onerror = () => {
      if (cancelled) return;
      fitCache.set(cacheKey, null);
      setFit(null);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, cacheKey, hasFocal, frameAspect, targetArea, maxW, maxH, fitMode, targetWidth, fit]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(e);
  };

  const transform = useMemo(() => {
    // Admin focal override: center the focal pixel in the frame at scale 1.
    // Bypasses silhouette measurement entirely. visualOffsetY still applies.
    if (hasFocal) {
      const tx = (0.5 - (focalX as number)) * 100;
      const ty = (0.5 + visualOffsetY - (focalY as number)) * 100;
      return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(1)`;
    }
    const f = fit ?? DEFAULT_FIT;
    const tx = (0.5 - f.cx) * 100;
    const scaledBottom = 0.5 + (f.bottom - 0.5) * f.scale;
    const ty = visualAnchorY === "bottom"
      ? (visualBaselineY + visualOffsetY - scaledBottom) * 100
      : (0.5 + visualOffsetY - f.cy) * 100;
    return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${f.scale.toFixed(4)})`;
  }, [fit, visualAnchorY, visualBaselineY, visualOffsetY, hasFocal, focalX, focalY]);


  return (
    <img
      {...props}
      ref={ref}
      src={src}
      // Required for canvas-based silhouette measurement. Without this the
      // browser taints the canvas on cross-origin images (Supabase CDN) and
      // getImageData throws — fit falls back to a generic shrink that
      // miscenters wide objects (e.g. sofa legs clipped at the bottom).
      onLoad={handleLoad}
      className={className}
      style={{
        ...style,
        transform,
        transformOrigin: "center center",
      }}
    />
  );
});

