// ---------------------------------------------------------------------------
// Route-image hover warmup
//
// TanStack's `preload="intent"` warms the JS chunk + loader on hover, but
// the LCP-class images on the destination page still wait for hydration to
// fire their <img> requests. For routes whose perceived weight is image
// download (atelier hero + portrait grid, gallery, collection), we inject
// `<link rel="prefetch" as="image">` tags on first hover/focus so the
// pictures arrive before the route mounts.
//
// - Idempotent per URL (de-duped via an in-module Set, so re-hovering a
//   link doesn't spam the head).
// - SSR-safe (no-op on the server).
// - Uses `prefetch` not `preload` so the browser treats them as low priority
//   and doesn't compete with the current page's critical resources.
// ---------------------------------------------------------------------------

const warmed = new Set<string>();

export function warmImages(urls: Array<string | undefined | null>): void {
  if (typeof document === "undefined") return;
  for (const url of urls) {
    if (!url || warmed.has(url)) continue;
    warmed.add(url);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = url;
    // Low fetch priority — never starve current-page critical media.
    (link as unknown as { fetchPriority?: string }).fetchPriority = "low";
    document.head.appendChild(link);
  }
}
