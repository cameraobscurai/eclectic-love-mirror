import { useEffect, useState } from "react";

export type Silhouette = "wide" | "tall" | "square";

const cache = new Map<string, Silhouette>();

function classify(aspect: number): Silhouette {
  if (aspect >= 1.25) return "wide";
  if (aspect <= 0.85) return "tall";
  return "square";
}

/**
 * Probes an image URL for its natural aspect ratio and returns a silhouette
 * classification used to pick tile frame shape + grid column span. Results
 * are cached per-URL across the app so revisits incur no extra work and no
 * layout shift.
 *
 * Returns `null` until the first probe resolves for a brand-new URL, so
 * callers can render a neutral default frame in the interim.
 */
export function useImageSilhouette(src: string | null | undefined): Silhouette | null {
  const cached = src ? cache.get(src) ?? null : null;
  const [s, setS] = useState<Silhouette | null>(cached);

  useEffect(() => {
    if (!src) {
      setS(null);
      return;
    }
    const hit = cache.get(src);
    if (hit) {
      setS(hit);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.decoding = "async";
    probe.onload = () => {
      const w = probe.naturalWidth;
      const h = probe.naturalHeight;
      if (!w || !h) return;
      const next = classify(w / h);
      cache.set(src, next);
      if (!cancelled) setS(next);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return s;
}
