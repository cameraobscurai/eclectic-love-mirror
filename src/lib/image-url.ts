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
  try {
    const u = new URL(url);
    // Squarespace CDN: ?format=NNNw
    if (u.hostname.includes("squarespace-cdn.com")) {
      if (!u.searchParams.has("format")) return url;
      u.searchParams.set("format", `${Math.round(width)}w`);
      return u.toString();
    }
    // Supabase Storage: rewrite /object/public/ → /render/image/public/?width=
    // so multi-MB owner-uploaded PNGs (e.g. category covers) get served as
    // right-sized WebP instead of forcing the browser to decode the original.
    if (u.hostname.endsWith(".supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
      u.searchParams.set("width", String(Math.round(width)));
      u.searchParams.set("resize", "contain");
      u.searchParams.set("quality", "80");
      return u.toString();
    }
    return url;
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
  if (!url) return "";
  const isSqs = url.includes("squarespace-cdn.com");
  const isSupabase = url.includes(".supabase.co/storage/v1/object/public/");
  if (!isSqs && !isSupabase) return "";
  return widths
    .map((w) => `${withCdnWidth(url, w)} ${w}w`)
    .join(", ");
}
