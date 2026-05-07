/**
 * Image URL helpers — width-rewriting for both image origins we serve from.
 *
 * Originally this only handled Squarespace CDN URLs (`?format=NNNw`). Since
 * the bake step now rewrites every product image to our owned `collection`
 * Supabase storage bucket, both helpers transparently delegate to
 * `renderUrl` / `renderSrcSet` when given a Supabase storage URL — so every
 * existing `<img src={withCdnWidth(...)}>` site gets right-sized variants
 * automatically without any callsite changes.
 *
 * Anything we don't recognize (direct uploads, broken inputs) passes through
 * untouched.
 */
import { renderUrl, renderSrcSet } from "./storage-image";

const STORAGE_MARKER = "/storage/v1/object/public/";

export function withCdnWidth(url: string | null | undefined, width: number): string {
  if (!url) return "";
  if (url.includes(STORAGE_MARKER)) return renderUrl(url, { width });
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

export function buildCdnSrcSet(
  url: string | null | undefined,
  widths: number[],
): string {
  if (!url) return "";
  if (url.includes(STORAGE_MARKER)) return renderSrcSet(url, widths);
  if (!url.includes("squarespace-cdn.com")) return "";
  return widths.map((w) => `${withCdnWidth(url, w)} ${w}w`).join(", ");
}
