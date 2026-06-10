import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

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
};

const fitCache = new Map<string, Fit | null>();

const FRAME_ASPECT = 4 / 5;
const TILE_IMAGE_INSET = 0.84;
const DEFAULT_FIT: Fit = { cx: 0.5, cy: 0.5, bottom: 0.66, scale: 0.68 };

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
): Fit | null {
  if (!bw || !bh || !naturalAspect) return null;

  const renderedW = naturalAspect >= frameAspect ? bw : (naturalAspect / frameAspect) * bw;
  const renderedH = naturalAspect >= frameAspect ? (frameAspect / naturalAspect) * bh : bh;
  if (!renderedW || !renderedH) return null;

  const silhouette = renderedW / renderedH;
  const targetArea = targetAreaOverride ?? (silhouette > 1.45 ? 0.16 : silhouette < 0.75 ? 0.17 : 0.2);
  const maxW = maxWOverride ?? (silhouette > 1.45 ? 0.78 : silhouette < 0.75 ? 0.42 : 0.56);
  const maxH = maxHOverride ?? (silhouette > 1.45 ? 0.32 : silhouette < 0.75 ? 0.58 : 0.56);
  const currentArea = Math.max(0.001, TILE_IMAGE_INSET * TILE_IMAGE_INSET * renderedW * renderedH);
  const scaleByArea = Math.sqrt(targetArea / currentArea);
  const scaleByCaps = Math.min(
    maxW / Math.max(0.001, TILE_IMAGE_INSET * renderedW),
    maxH / Math.max(0.001, TILE_IMAGE_INSET * renderedH),
  );

  return {
    cx: clamp(cx, 0.05, 0.95),
    cy: clamp(cy, 0.05, 0.95),
    bottom: clamp(cy + bh / 2, 0.05, 0.95),
    scale: clamp(Math.min(scaleByArea, scaleByCaps), 0.52, 1.55),
  };
}

function measureImage(
  img: HTMLImageElement,
  frameAspect = FRAME_ASPECT,
  targetArea?: number,
  maxW?: number,
  maxH?: number,
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
    return fitFromVisualBox(0.5, 0.5, 1, 1, naturalAspect, frameAspect, targetArea, maxW, maxH);
  }

  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;
  const px = data.data;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const a = px[i + 3];
      if (a < 12) continue;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (r > 242 && g > 242 && b > 242) continue;
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

  const fit = fitFromVisualBox(cx, cy, bw, bh, naturalAspect, frameAspect, targetArea, maxW, maxH);
  if (!fit) return null;

  const renderedH = naturalAspect >= frameAspect ? frameAspect / naturalAspect : 1;
  const contentTop = naturalAspect >= frameAspect ? (1 - renderedH) / 2 : 0;
  const visualBottom = contentTop + ((maxY + 1) / ch) * renderedH;
  return { ...fit, bottom: clamp(visualBottom, 0.05, 0.95) };
}

export function NormalizedProductImage({
  src,
  frameAspect = FRAME_ASPECT,
  visualOffsetY = 0,
  visualAnchorY = "center",
  visualBaselineY = 0.66,
  targetArea,
  maxW,
  maxH,
  className,
  style,
  ...props
}: Props) {
  const cacheKey = `${src}|${frameAspect}|${targetArea}|${maxW}|${maxH}`;
  const cached = fitCache.get(cacheKey);
  const [fit, setFit] = useState<Fit | null | undefined>(cached);

  useEffect(() => {
    if (fitCache.has(cacheKey)) {
      setFit(fitCache.get(cacheKey));
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      const next = measureImage(probe, frameAspect, targetArea, maxW, maxH);
      fitCache.set(cacheKey, next);
      if (!cancelled) setFit(next);
    };
    probe.onerror = () => {
      fitCache.set(cacheKey, null);
      if (!cancelled) setFit(null);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [cacheKey, frameAspect, src, targetArea, maxW, maxH]);

  const transform = useMemo(() => {
    const f = fit ?? DEFAULT_FIT;
    const tx = (0.5 - f.cx) * 100;
    const ty = visualAnchorY === "bottom"
      ? (visualBaselineY + visualOffsetY - f.bottom) * 100
      : (0.5 + visualOffsetY - f.cy) * 100;
    return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${f.scale.toFixed(4)})`;
  }, [fit, visualAnchorY, visualBaselineY, visualOffsetY]);

  return (
    <img
      {...props}
      src={src}
      className={className}
      style={{
        ...style,
        transform,
        transformOrigin: "center center",
      }}
    />
  );
}
