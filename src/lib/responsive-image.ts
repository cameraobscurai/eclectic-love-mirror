// Unified responsive-image helpers.
//
// Now that the bake step rewrites every product image to the owned
// `collection` bucket (with the original Squarespace URL preserved on
// `fallbackUrl`), tiles need a helper that resizes BOTH:
//   1. supabase storage URLs → via renderUrl() (image-transform endpoint)
//   2. squarespace-cdn URLs  → via withCdnWidth() (?format=NNNw rewrite)
//
// Each underlying helper is a no-op for URLs it doesn't recognize, so
// callers don't need to branch.
import { withCdnWidth, buildCdnSrcSet } from "./image-url";
import { renderUrl, renderSrcSet } from "./storage-image";

export function responsiveSrc(url: string | null | undefined, width: number): string {
  if (!url) return "";
  if (url.includes("/storage/v1/object/public/")) {
    return renderUrl(url, { width });
  }
  return withCdnWidth(url, width);
}

export function responsiveSrcSet(
  url: string | null | undefined,
  widths: number[],
): string {
  if (!url) return "";
  if (url.includes("/storage/v1/object/public/")) {
    return renderSrcSet(url, widths);
  }
  return buildCdnSrcSet(url, widths);
}
