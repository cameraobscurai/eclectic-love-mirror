/**
 * Rewrites a Squarespace CDN image URL to request a tile-appropriate width.
 *
 * The Phase 3 catalog stores every image with `?format=2500w` baked in —
 * which is correct for the source-of-truth archive but ~50× more pixels
 * than a grid tile or thumbnail can ever display. Calling withCdnWidth(url, 750)
 * mutates the `format` query param so the CDN serves a right-sized variant.
 *
 * Only Squarespace CDN URLs with an existing `format=NNNw` param are touched.
 * Anything else (future Supabase storage URLs, direct uploads, broken inputs)
 * passes through untouched.
 */
export function withCdnWidth(url: string | null | undefined, width: number): string {
  if (!url) return "";
  // Supabase Storage public-object URLs: rewrite to the image-transform
  // endpoint so we get a properly resized variant instead of the full
  // original asset. Without this, a single multi-MB PNG cover (e.g. the
  // "sofas" category cover) would dominate first-paint and stall the
  // whole category-grid cohort while every other tile is already decoded.
  // We also URL-encode the path so spaces in object keys don't slow the
  // request with retries / encoding ambiguity.
  if (url.includes("/storage/v1/object/public/")) {
    try {
      const u = new URL(url);
      const idx = u.pathname.indexOf("/storage/v1/object/public/");
      if (idx >= 0) {
        const objectPath = u.pathname.slice(idx + "/storage/v1/object/public/".length);
        const encoded = objectPath
          .split("/")
          .map((seg) => encodeURIComponent(seg))
          .join("/");
        const rendered = new URL(
          `/storage/v1/render/image/public/${encoded}`,
          u.origin,
        );
        rendered.searchParams.set("width", String(Math.round(width)));
        rendered.searchParams.set("resize", "contain");
        rendered.searchParams.set("quality", "80");
        return rendered.toString();
      }
    } catch {
      // fall through
    }
    return url;
  }
  // Squarespace CDN: tweak the existing `format=NNNw` query param.
  if (!url.includes("squarespace-cdn.com")) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("format")) return url;
    u.searchParams.set("format", `${Math.round(width)}w`);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Builds a `srcSet` string for retina + dense-grid fidelity. Returns "" when
 * the URL isn't a Squarespace CDN URL we can resize, so callers can pass it
 * straight to <img srcSet={...}> without conditional logic.
 */
export function buildCdnSrcSet(
  url: string | null | undefined,
  widths: number[],
): string {
  if (!url || !url.includes("squarespace-cdn.com")) return "";
  return widths
    .map((w) => `${withCdnWidth(url, w)} ${w}w`)
    .join(", ");
}
