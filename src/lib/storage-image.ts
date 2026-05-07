// ---------------------------------------------------------------------------
// Public storage URL helper
//
// Lovable Cloud (Supabase) storage exposes public buckets at a stable URL:
//   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
//
// We build URLs by string instead of going through `supabase.storage` so the
// resulting strings are usable in static markup, OG tags, loaders, and SSR
// without any client dependency. Paths are URL-encoded segment-by-segment so
// filenames with spaces (e.g. "ADD ON Close Up.jpg") work correctly.
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  // Browser bundle
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  // SSR / server functions
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "";

export function publicStorageUrl(bucket: string, path: string): string {
  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export const galleriesUrl = (path: string) => publicStorageUrl("image-galleries", path);
export const teamPhotoUrl = (path: string) => publicStorageUrl("team-photos", path);

/**
 * Storage origin (no path) — useful for `<link rel="preconnect">` so the
 * TLS handshake to the image CDN happens before the first card paints.
 */
export const STORAGE_ORIGIN = SUPABASE_URL;

/**
 * Rewrites a public-object URL to hit Supabase's image-transformation
 * render endpoint, which serves resized variants on demand.
 *
 *   /storage/v1/object/public/{bucket}/{path}
 *     ↓
 *   /storage/v1/render/image/public/{bucket}/{path}?width=N&quality=Q&format=origin
 *
 * `format=origin` keeps the source mime (so JPGs stay JPG, PNGs stay PNG)
 * but lets the CDN serve smaller AVIF/WebP via content negotiation when
 * the browser accepts it. Pass through anything that isn't a recognized
 * public storage URL untouched.
 */
export function renderUrl(
  url: string,
  opts: { width: number; quality?: number },
): string {
  if (!url || !url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  const sep = transformed.includes("?") ? "&" : "?";
  const q = opts.quality ?? 72;
  // resize=contain → keep source aspect ratio. Without it, Supabase's render
  // endpoint sets the width but keeps the ORIGINAL height, producing absurdly
  // tall slivers (e.g. 720×3936 from a 2624×3936 source) that then get
  // catastrophically cropped by `object-cover` in any sane aspect container.
  return `${transformed}${sep}width=${Math.round(opts.width)}&quality=${q}&resize=contain`;
}

/**
 * Builds a responsive `srcSet` for an `<img>` from a public storage URL.
 * Empty string when the URL isn't a storage URL we can resize, so the
 * caller can pass it through unconditionally.
 */
export function renderSrcSet(
  url: string,
  widths: number[],
  quality = 72,
): string {
  if (!url || !url.includes("/storage/v1/object/public/")) return "";
  return widths
    .map((w) => `${renderUrl(url, { width: w, quality })} ${w}w`)
    .join(", ");
}
