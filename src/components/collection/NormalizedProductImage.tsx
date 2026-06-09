import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

type Fit = {
  cx: number;
  cy: number;
  scale: number;
};

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

const fitCache = new Map<string, Fit | null>();

const DEFAULT_FIT: Fit = { cx: 0.5, cy: 0.5, scale: 1 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function measureImage(img: HTMLImageElement): Fit | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

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
    return null;
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
      // Wider white/near-white threshold catches slightly off-white studio backgrounds
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

  // Target: subject fills 82% of the tile's effective area.
  // min clamp reduced to 0.8 (allow slight shrink for subjects that nearly fill the canvas).
  // max clamp raised to 4.0 so small subjects (≥20% of canvas) still hit the target.
  // Result: subjects in the 20–90% canvas fill range all appear ~75% of tile width/height.
  const scaleToFrame = 0.82 / Math.max(bw, bh);

  return {
    // Tighter center clamp prevents extreme off-center translations at high scale
    cx: clamp(cx, 0.1, 0.9),
    cy: clamp(cy, 0.1, 0.9),
    scale: clamp(scaleToFrame, 0.8, 4.0),
  };
}

export function NormalizedProductImage({ src, className, style, ...props }: Props) {
  const cached = fitCache.get(src);
  const [fit, setFit] = useState<Fit | null | undefined>(cached);

  useEffect(() => {
    if (fitCache.has(src)) {
      setFit(fitCache.get(src));
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      const next = measureImage(probe);
      fitCache.set(src, next);
      if (!cancelled) setFit(next);
    };
    probe.onerror = () => {
      fitCache.set(src, null);
      if (!cancelled) setFit(null);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const transform = useMemo(() => {
    const f = fit ?? DEFAULT_FIT;
    const tx = (0.5 - f.cx) * 100;
    const ty = (0.5 - f.cy) * 100;
    return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${f.scale.toFixed(4)})`;
  }, [fit]);

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
