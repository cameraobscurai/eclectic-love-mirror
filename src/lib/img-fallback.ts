// One-shot <img> error fallback.
//
// Usage on any product image:
//   <img
//     src={img.url}
//     data-fallback={img.fallbackUrl}
//     onError={imgFallback}
//   />
//
// If `src` fails to load and `data-fallback` is set, the handler swaps `src`
// to the fallback URL exactly once and clears the attribute so we never loop.
// This is the safety net for the bake-time rewrite to the `collection`
// bucket: if a path isn't actually present in the bucket (stale manifest,
// rename, etc.), the original Squarespace-mirror or CDN URL takes over.
import type { SyntheticEvent } from "react";

export function imgFallback(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  const fb = el.dataset.fallback;
  if (fb && fb !== el.src) {
    el.dataset.fallback = "";
    el.src = fb;
    // Also clear srcset so the browser uses the new src directly.
    if (el.srcset) el.srcset = "";
  }
}
