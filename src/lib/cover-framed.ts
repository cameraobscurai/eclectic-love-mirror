/**
 * Frame Studio derivative URL helpers.
 *
 * `cover_framed_url` always stores the 1200w derivative. The 600w sibling is
 * derived by suffix swap (`-1200.webp` → `-600.webp`); both sizes share the
 * same hash, so only one URL is ever stored.
 *
 * The swap falls back to the stored URL unchanged when the suffix isn't
 * present. That keeps the render path resilient to any future path-shape
 * change (and to hand-set test rows) instead of silently 404ing the src.
 */

const SUFFIX_1200 = /-1200\.webp(\?.*)?$/i;

/** 600w URL for a stored 1200w framed cover. Passes through when the URL
 *  doesn't match the `-1200.webp` shape. */
export function framedCoverSrc600(url: string): string {
  if (!SUFFIX_1200.test(url)) return url;
  return url.replace(/-1200\.webp/i, "-600.webp");
}

/** srcSet pairing the (possibly derived) 600w src with the stored 1200w URL. */
export function framedCoverSrcSet(url: string): string | undefined {
  const small = framedCoverSrc600(url);
  if (small === url) return undefined;
  return `${small} 600w, ${url} 1200w`;
}
