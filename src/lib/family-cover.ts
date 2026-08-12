// Family-tile cover precedence — extracted as a pure function so it can be
// fixtured. Previously this lived inline inside `mergeCatalog` in
// phase3-catalog.ts, which is exactly why it shipped a bug nobody could test:
// when the admin-chosen cover on the LEAD row was also present on a member
// row, the merge classified it as "variant-owned", skipped it in the lead
// pass, and promoted the next photo instead. Live tiles therefore contradicted
// the admin's own promise that the first photo is the cover.
//
// `leadCoverWins: false` reproduces the old (buggy) precedence exactly. It
// exists so the blast-radius audit can diff old vs new across every family
// tile before the change ships. Runtime always uses `true`.

export interface FamilyImage {
  url: string;
  position: number;
  isHero: boolean;
  inferredFilename: string | null;
  altText: string | null;
}

/**
 * Filename-level identity. Re-uploads through the admin land in
 * squarespace-mirror with a hex prefix and underscore separators
 * ("593a2c94135d-FLORENCE_Lantern_2.png") while the baked copy keeps the
 * original name ("FLORENCE Lantern 2.png"). Without normalising both, a
 * family tile shows the same photo twice.
 */
export function imageKey(url: string): string {
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

/** A macro/close-up shot is never a cover. Demote, never drop. */
export function isDetailShot(url: string): boolean {
  return /(detail|close[\s._-]?up|closeup|macro|hardware)/i.test(imageKey(url));
}

/** Promote the first non-detail image into the cover slot. */
export function coverFirst(imgs: FamilyImage[]): FamilyImage[] {
  if (imgs.length < 2 || !isDetailShot(imgs[0].url)) return imgs;
  const idx = imgs.findIndex((i) => !isDetailShot(i.url));
  if (idx <= 0) return imgs;
  const next = [...imgs.slice(idx, idx + 1), ...imgs.filter((_, i) => i !== idx)];
  return next.map((img, i) => ({ ...img, position: i, isHero: i === 0 }));
}

export interface MergeFamilyImagesInput {
  /** Live `images[]` on the family's lead RMS row, admin drag order. */
  leadImages: string[];
  /** Baked catalog images for the family tile (group/"Set" shots included). */
  bakedImages: FamilyImage[];
  /** Live images of every member row, in member order. */
  memberImages: string[];
  /** Cover URLs owned by variant rows at bake time. */
  variantCoverUrls: string[];
}

export interface MergeFamilyImagesOptions {
  /**
   * When true (runtime), the lead row's first live image always takes the
   * cover slot, even if a member row also carries that photo. When false,
   * reproduces the pre-fix precedence for audit diffing only.
   */
  leadCoverWins: boolean;
}

/**
 * Build the public image set for a family tile.
 *
 * Order:
 *   1. the admin's chosen cover (lead row images[0])   [leadCoverWins only]
 *   2. remaining lead-row photos that no variant row owns
 *   3. baked group/"Set" shots that no variant row owns
 *   4. every member row's live photos, in order
 *
 * Deduplicated by filename identity throughout.
 */
export function mergeFamilyImages(
  input: MergeFamilyImagesInput,
  options: MergeFamilyImagesOptions,
): FamilyImage[] {
  const { leadImages, bakedImages, memberImages, variantCoverUrls } = input;
  const variantKeys = new Set(
    variantCoverUrls.filter(Boolean).map((u) => imageKey(u)),
  );

  const seen = new Set<string>();
  const merged: FamilyImage[] = [];
  const push = (url: string, altText: string | null) => {
    const k = imageKey(url);
    if (seen.has(k)) return;
    seen.add(k);
    merged.push({
      url,
      position: merged.length,
      isHero: merged.length === 0,
      inferredFilename: null,
      altText,
    });
  };

  // The admin's first photo is the cover. Full stop — that is the contract
  // the product drawer states in its own banner text.
  if (options.leadCoverWins && leadImages.length > 0) {
    push(leadImages[0], null);
  }

  for (const u of leadImages) {
    if (variantKeys.has(imageKey(u))) continue;
    push(u, null);
  }
  for (const img of bakedImages) {
    if (variantKeys.has(imageKey(img.url))) continue;
    push(img.url, img.altText);
  }
  for (const u of memberImages) push(u, null);

  return merged;
}
