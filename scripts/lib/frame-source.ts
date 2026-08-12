/**
 * Frame Studio 2.4 — cover source selection.
 *
 * The framer must compose the photo the SITE IS ACTUALLY SHOWING, not
 * `images[0]` off the row. That means replicating the runtime merge's
 * precedence (src/lib/phase3-catalog.ts, mergeCatalog ~L229–L380):
 *
 *   - live row images win when the array is non-empty; empty/null falls back
 *     to the baked catalog so legacy `images = '{}'` rows don't blank
 *   - macro/close-up shots are demoted, never chosen as a cover
 *   - FAMILY rows: the lead row's own non-variant photo (a group shot she
 *     uploaded) wins the cover slot, then baked group shots, then members —
 *     so a family tile frames its joint cover, not one variant's single shot
 *
 * Kept as a small pure helper rather than an import of phase3-catalog: that
 * module is client-side and pulls the Supabase browser client. When the merge
 * is extracted to a pure function (post-meeting), this collapses into it.
 */

export type CatalogVariant = { id: string; imageUrl?: string | null };
export type CatalogImage = { url: string };
export type CatalogProduct = {
  id: string;
  slug?: string;
  title?: string;
  images?: CatalogImage[];
  variants?: CatalogVariant[] | null;
};

export function imgKey(url: string): string {
  try {
    const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    const ext = (base.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
    const stem = base
      .slice(0, base.length - ext.length)
      .replace(/^[0-9a-f]{8,}-/i, "")
      .replace(/[_+\-\s]+/g, " ")
      .trim()
      .toLowerCase();
    return (stem ? stem + ext : base.toLowerCase()) || url;
  } catch {
    return url;
  }
}

export const isDetailShot = (url: string) =>
  /(detail|close[\s._-]?up|closeup|macro|hardware)/i.test(imgKey(url));

/** First non-detail url, or the first url if they are all details. */
function pickCover(urls: string[]): string | null {
  const clean = urls.filter(Boolean);
  if (!clean.length) return null;
  return clean.find((u) => !isDetailShot(u)) ?? clean[0]!;
}

export type ResolveInput = {
  product: CatalogProduct;
  /** rms_id -> live `images` array from inventory_items. */
  liveImages: Map<string, string[]>;
};

export type ResolvedCover = {
  url: string | null;
  /** Which branch produced it — recorded in the run report. */
  origin: "live" | "live-family-lead" | "baked-group" | "baked" | "live-member" | "none";
};

export function resolveCoverSource({ product, liveImages }: ResolveInput): ResolvedCover {
  const members = product.variants ?? [];
  const lead = liveImages.get(product.id) ?? [];
  const baked = (product.images ?? []).map((i) => i.url).filter(Boolean);

  if (members.length > 0) {
    const variantKeys = new Set(
      members.map((v) => (v.imageUrl ? imgKey(v.imageUrl) : "")).filter(Boolean),
    );
    // 1. owner-uploaded group photo living on the lead row
    const leadGroup = pickCover(lead.filter((u) => !variantKeys.has(imgKey(u))));
    if (leadGroup) return { url: leadGroup, origin: "live-family-lead" };
    // 2. baked "Set" shot — no variant row owns these
    const bakedGroup = pickCover(baked.filter((u) => !variantKeys.has(imgKey(u))));
    if (bakedGroup) return { url: bakedGroup, origin: "baked-group" };
    // 3. otherwise the first member photo in order
    const memberUrls: string[] = [];
    for (const id of [product.id, ...members.map((v) => v.id)]) {
      for (const u of liveImages.get(id) ?? []) memberUrls.push(u);
    }
    const member = pickCover(memberUrls) ?? pickCover(baked);
    return member ? { url: member, origin: "live-member" } : { url: null, origin: "none" };
  }

  const live = pickCover(lead);
  if (live) return { url: live, origin: "live" };
  const b = pickCover(baked);
  return b ? { url: b, origin: "baked" } : { url: null, origin: "none" };
}
