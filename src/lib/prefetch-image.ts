// ---------------------------------------------------------------------------
// Image prefetch / warm cache
//
// macOS-like "already there" feel: when a user shows intent (hover, focus,
// touchstart) we start fetching the *destination-sized* bitmap before the
// click lands. By the time the route transitions, the image is in the HTTP
// cache and paints on the first frame instead of network-round-tripping.
//
// Deduped by URL so repeated hovers cost nothing.
// ---------------------------------------------------------------------------

const warmed = new Set<string>();

export function prefetchImage(src: string, srcSet?: string): void {
  if (typeof window === "undefined") return;
  if (!src || warmed.has(src)) return;
  warmed.add(src);

  const img = new Image();
  img.decoding = "async";
  // Low priority so intent-prefetch never competes with the visible viewport.
  (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
  if (srcSet) img.srcset = srcSet;
  img.src = src;
}

/** True once the browser has this exact URL decoded and ready to paint. */
export function isImageWarm(src: string): boolean {
  return warmed.has(src);
}
