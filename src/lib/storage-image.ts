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

export function publicStorageImageUrl(
  bucket: string,
  path: string,
  width: number,
  quality = 72,
): string {
  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality),
    resize: "cover",
  });
  return `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${encodedPath}?${params}`;
}

export function publicStorageImageSrcSet(
  bucket: string,
  path: string,
  widths: number[],
  quality = 72,
): string {
  return widths
    .map((width) => `${publicStorageImageUrl(bucket, path, width, quality)} ${width}w`)
    .join(", ");
}

export const galleriesUrl = (path: string) => publicStorageUrl("image-galleries", path);
export const teamPhotoUrl = (path: string) => publicStorageUrl("team-photos", path);
export const teamPhotoOptimizedUrl = (path: string, width = 640) =>
  publicStorageImageUrl("team-photos", path, width);
export const teamPhotoSrcSet = (path: string) =>
  publicStorageImageSrcSet("team-photos", path, [320, 480, 640, 800]);
