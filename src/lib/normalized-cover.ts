/**
 * Normalized covers — source-level geometry normalization.
 *
 * Every cover in the manifest has been trimmed to its subject and centred on
 * the same 1536x1536 canvas with the same padding ratio (see
 * scripts/normalize-covers.mjs). That removes the one variable no amount of
 * CSS could ever compensate for: how tightly the original photo happened to be
 * cropped.
 *
 * Because the geometry is fixed and known, the render layer does not have to
 * measure these images in the browser at all — the silhouette box is supplied
 * analytically from the manifest, so tiles size identically on first paint with
 * no canvas read, no CORS risk, and no fade-in-on-measure.
 *
 * Substitution is conservative: it only applies when the product's current hero
 * is still the exact image the normalized file was derived from. Swap the cover
 * in admin and the product silently reverts to the original until the pipeline
 * is re-run.
 */

import MANIFEST from "@/data/inventory/normalized-covers.json";

export type NormalizedCover = {
  url: string;
  /** Hero URL this was derived from. */
  src: string;
  /** Subject aspect (w/h). */
  aspect: number;
  /** Subject width as a fraction of the square canvas. */
  w: number;
  /** Subject height as a fraction of the square canvas. */
  h: number;
};

type Manifest = {
  meta: {
    generatedAt: string;
    canvas: number;
    pad: number;
    subjectFraction: number;
    count: number;
  };
  covers: Record<string, NormalizedCover>;
};

const manifest = MANIFEST as Manifest;

/** Master flag. Set false to fall back to original covers everywhere. */
export const NORMALIZED_COVERS_ENABLED = true;

export const NORMALIZED_CANVAS_ASPECT = 1;

/** Cache buster tied to the pipeline run, so a re-bake displaces the CDN copy. */
const VERSION = Math.floor(new Date(manifest.meta.generatedAt).getTime() / 1000);

/** Strip cache-busting/query noise so hero comparison is path-based. */
function baseUrl(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

export function normalizedCoverFor(
  slug: string | null | undefined,
  currentHeroUrl?: string | null,
): NormalizedCover | null {
  if (!NORMALIZED_COVERS_ENABLED || !slug) return null;
  const entry = manifest.covers[slug];
  if (!entry) return null;
  if (currentHeroUrl && baseUrl(currentHeroUrl) !== baseUrl(entry.src)) return null;
  return { ...entry, url: `${entry.url}?v=${VERSION}` };
}
