import { forwardRef, useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import type React from "react";
import type { FitRule } from "./categoryFit";

type Fit = {
  cx: number;
  cy: number;
  bottom: number;
  top: number;
  scale: number;
};

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  frameAspect?: number;

  /** New category-aware fit rule. When supplied, takes over scaling +
   *  anchoring entirely — the solver in this file is the single source of
   *  truth for x/y/scale. Legacy props below are ignored. */
  fit?: FitRule;

  // ── Legacy props (still used by admin.photos and CollectionWallTile) ──
  visualOffsetY?: number;
  visualAnchorY?: "center" | "bottom";
  visualBaselineY?: number;
  targetArea?: number;
  maxW?: number;
  maxH?: number;
  fitMode?: "area" | "width";
  targetWidth?: number;

  /** Admin-set focal point (0–1). When both are numbers, silhouette
   *  measurement is skipped and the image is centered on this point. */
  focalX?: number | null;
  focalY?: number | null;

  /** Skip the fade-in-on-measure gate. Above-fold tiles (LCP-critical) pass
   *  eager=true so the tile paints immediately with the fallback fit and
   *  refines to the measured fit when the silhouette resolves. */
  eager?: boolean;
};

// Cache keyed by src+frame+mode. Measured silhouette geometry is reusable
// across rules on the same image — the SOLVER runs per-rule, the MEASUREMENT
// is shared.
type Measurement = {
  renderedW: number;
  renderedH: number;
  bw: number;
  bh: number;
  cx: number;
  cy: number;
  bottom: number;
  top: number;
  naturalAspect: number;
};
const measurementCache = new Map<string, Measurement | null>();

const FRAME_ASPECT = 5 / 4;
const TILE_IMAGE_INSET = 0.94;

// Legacy area/width path retained for non-fit-rule callers.
const LEGACY_TILE_OBJECT_CONTENT = 0.92;
const LEGACY_DEFAULT_FIT: Fit = { cx: 0.5, cy: 0.5, bottom: 0.62, top: 0.38, scale: 0.97 };
const LEGACY_SCALE_MIN = 0.82;
const LEGACY_SCALE_MAX = 1.12;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ────────────────────────────────────────────────────────────────────────
// Measurement — canvas-based silhouette bbox in tile-space.
// ────────────────────────────────────────────────────────────────────────

function measureImage(
  img: HTMLImageElement,
  frameAspect: number,
): Measurement | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const naturalAspect = w / h;

  const maxSide = 180;
  const scaleDown = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scaleDown));
  const ch = Math.max(1, Math.round(h * scaleDown));
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

  const px = data.data;
  // Corner-median background detection — see prior implementation notes.
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
  const hasLightBg = bgR > 210 && bgG > 210 && bgB > 210;
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

  // Rendered frame: the image letterboxed into the tile's frame aspect.
  const renderedW = naturalAspect >= frameAspect ? 1 : naturalAspect / frameAspect;
  const renderedH = naturalAspect >= frameAspect ? frameAspect / naturalAspect : 1;
  const contentTop = naturalAspect >= frameAspect ? (1 - renderedH) / 2 : 0;
  const contentLeft = naturalAspect >= frameAspect ? 0 : (1 - renderedW) / 2;

  // Silhouette bbox in tile-space (0–1).
  const bw = ((maxX - minX + 1) / cw) * renderedW;
  const bh = ((maxY - minY + 1) / ch) * renderedH;
  const cx = contentLeft + ((minX + maxX + 1) / 2 / cw) * renderedW;
  const cy = contentTop + ((minY + maxY + 1) / 2 / ch) * renderedH;
  const top = contentTop + (minY / ch) * renderedH;
  const bottom = contentTop + ((maxY + 1) / ch) * renderedH;

  return {
    renderedW,
    renderedH,
    bw,
    bh,
    cx,
    cy,
    top,
    bottom,
    naturalAspect,
  };
}

// ────────────────────────────────────────────────────────────────────────
// The rigorous solver — takes a FitRule + measurement, returns Fit.
// ────────────────────────────────────────────────────────────────────────

function solveFit(m: Measurement, rule: FitRule): Fit {
  const inset = TILE_IMAGE_INSET;
  const wInsetFrame = inset * m.renderedW * m.bw;
  const hInsetFrame = inset * m.renderedH * m.bh;

  // 1. Primary-axis target scale.
  let sTarget: number;
  if (rule.primary === "width") {
    sTarget = rule.primaryTarget / Math.max(0.001, wInsetFrame);
  } else if (rule.primary === "height") {
    sTarget = rule.primaryTarget / Math.max(0.001, hInsetFrame);
  } else {
    const currentArea = Math.max(0.001, wInsetFrame * hInsetFrame);
    sTarget = rule.primaryTarget / Math.sqrt(currentArea);
  }

  // 2. Secondary-axis cap (skip for area primary).
  let sCap = Infinity;
  if (rule.primary === "width") {
    sCap = rule.secondaryMax / Math.max(0.001, hInsetFrame);
  } else if (rule.primary === "height") {
    sCap = rule.secondaryMax / Math.max(0.001, wInsetFrame);
  }

  // 3. Final scale.
  const s = clamp(Math.min(sTarget, sCap), rule.clampMin, rule.clampMax);

  return { scale: s, cx: m.cx, cy: m.cy, bottom: m.bottom, top: m.top };
}

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────

export const NormalizedProductImage = forwardRef<HTMLImageElement, Props>(function NormalizedProductImage({
  src,
  frameAspect = FRAME_ASPECT,
  fit: fitRule,
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
  eager = false,
  className,
  style,
  onLoad,
  ...props
}: Props, ref) {
  const hasFocal = typeof focalX === "number" && typeof focalY === "number";
  // Measurement is a property of the image, not the frame — reusing the same
  // measurement across wall/grid toggles prevents the "everything goes big
  // then snaps" pop when frameAspect changes.
  const cacheKey = src;
  const cached = measurementCache.get(cacheKey);
  const [measurement, setMeasurement] = useState<Measurement | null | undefined>(cached);

  useEffect(() => {
    if (hasFocal) return;
    if (!src) return;
    const existing = measurementCache.get(cacheKey);
    if (existing !== undefined) {
      if (existing !== measurement) setMeasurement(existing);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      if (cancelled) return;
      try {
        const next = measureImage(probe, frameAspect);
        measurementCache.set(cacheKey, next);
        setMeasurement(next);
      } catch {
        measurementCache.set(cacheKey, null);
        setMeasurement(null);
      }
    };
    probe.onerror = () => {
      if (cancelled) return;
      measurementCache.set(cacheKey, null);
      setMeasurement(null);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, cacheKey, hasFocal, frameAspect, measurement]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(e);
  };

  const transform = useMemo(() => {
    // Admin focal override — bypass everything.
    if (hasFocal) {
      const tx = (0.5 - (focalX as number)) * 100;
      const ty = (0.5 + visualOffsetY - (focalY as number)) * 100;
      return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(1)`;
    }

    // ── New solver path ──
    if (fitRule) {
      let f: Fit;
      if (measurement) {
        f = solveFit(measurement, fitRule);
      } else {
        const fb = fitRule.fallback;
        f = { scale: fb.scale, cx: fb.cx, cy: fb.cy, bottom: fb.bottom, top: fb.top };
      }
      const tx = (fitRule.centerX - (0.5 + (f.cx - 0.5) * f.scale)) * 100;
      let ty: number;
      if (fitRule.anchor === "bottom") {
        const scaledBottom = 0.5 + (f.bottom - 0.5) * f.scale;
        ty = (fitRule.anchorY + visualOffsetY - scaledBottom) * 100;
      } else if (fitRule.anchor === "top") {
        const scaledTop = 0.5 + (f.top - 0.5) * f.scale;
        ty = (fitRule.anchorY + visualOffsetY - scaledTop) * 100;
      } else {
        const scaledCy = 0.5 + (f.cy - 0.5) * f.scale;
        ty = (fitRule.anchorY + visualOffsetY - scaledCy) * 100;
      }
      return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${f.scale.toFixed(4)})`;
    }

    // ── Legacy path (admin.photos, CollectionWallTile) ──
    let legacyFit: Fit;
    if (measurement) {
      // Reuse measurement via the legacy area/width math.
      const wInsetFrame = TILE_IMAGE_INSET * measurement.renderedW * measurement.bw;
      const hInsetFrame = TILE_IMAGE_INSET * measurement.renderedH * measurement.bh;
      const legacyTargetArea = targetArea ?? 0.32;
      const legacyMaxW = maxW ?? 0.86;
      const legacyMaxH = maxH ?? 0.82;
      let primaryScale: number;
      if (fitMode === "width") {
        const tW = targetWidth ?? 0.82;
        const wS = tW / Math.max(0.001, wInsetFrame);
        const hS = 0.52 / Math.max(0.001, hInsetFrame);
        primaryScale = Math.min(wS, hS);
      } else {
        const currentArea = Math.max(0.001, wInsetFrame * hInsetFrame);
        primaryScale = Math.sqrt(legacyTargetArea / currentArea);
      }
      const scaleByCaps = Math.min(
        legacyMaxW / Math.max(0.001, wInsetFrame),
        legacyMaxH / Math.max(0.001, hInsetFrame),
      );
      const minScale = fitMode === "width" ? 0.55 : LEGACY_SCALE_MIN;
      const maxScale = fitMode === "width" ? 1.1 : LEGACY_SCALE_MAX;
      const s = clamp(Math.min(primaryScale, scaleByCaps), minScale, maxScale);

      // Legacy bottom compression (area path only).
      const visualBottom = fitMode === "width"
        ? measurement.bottom
        : (1 - LEGACY_TILE_OBJECT_CONTENT) / 2 + measurement.bottom * LEGACY_TILE_OBJECT_CONTENT;
      legacyFit = {
        scale: s,
        cx: clamp(measurement.cx, 0.05, 0.95),
        cy: clamp(measurement.cy, 0.05, 0.95),
        bottom: clamp(visualBottom, 0.05, 0.99),
        top: measurement.top,
      };
    } else {
      legacyFit = { ...LEGACY_DEFAULT_FIT };
      if (measurement === null && fitMode === "width") {
        legacyFit.bottom = 0.95;
      }
    }

    const tx = (0.5 - legacyFit.cx) * 100;
    const scaledBottom = 0.5 + (legacyFit.bottom - 0.5) * legacyFit.scale;
    const ty = visualAnchorY === "bottom"
      ? (visualBaselineY + visualOffsetY - scaledBottom) * 100
      : (0.5 + visualOffsetY - legacyFit.cy) * 100;
    return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${legacyFit.scale.toFixed(4)})`;
  }, [
    measurement,
    fitRule,
    hasFocal,
    focalX,
    focalY,
    visualOffsetY,
    visualAnchorY,
    visualBaselineY,
    targetArea,
    maxW,
    maxH,
    fitMode,
    targetWidth,
  ]);

  // Avoid the "big-then-snap" flash: while we're still measuring the
  // silhouette, the solver would fall back to a ~full-size transform and
  // pop to the correct scale a tick later. Hold opacity at 0 until
  // measurement resolves (or focal override is set), then fade in.
  const ready = hasFocal || measurement !== undefined;

  return (
    <img
      {...props}
      ref={ref}
      src={src}
      onLoad={handleLoad}
      className={className}
      style={{
        ...style,
        transform,
        transformOrigin: "center center",
        opacity: ready ? (style?.opacity ?? 1) : 0,
        transition: "opacity 180ms ease-out",
      }}
    />
  );
});
