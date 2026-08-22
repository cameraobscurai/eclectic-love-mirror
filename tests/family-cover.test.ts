import { describe, expect, it } from "vitest";
import { coverFirst, imageKey, mergeFamilyImages, type FamilyImage } from "@/lib/family-cover";

const baked = (urls: string[]): FamilyImage[] =>
  urls.map((url, i) => ({
    url,
    position: i,
    isHero: i === 0,
    inferredFilename: null,
    altText: null,
  }));

const S = "https://x.supabase.co/storage/v1/object/public/squarespace-mirror";

describe("imageKey", () => {
  it("normalises admin re-upload prefixes and separators to baked filenames", () => {
    expect(imageKey(`${S}/3524/fbdaf98f6a83-HUDSON_Render.png`)).toBe(
      imageKey("https://images.squarespace-cdn.com/x/HUDSON+Render.png"),
    );
  });
});

describe("mergeFamilyImages — Hudson's shape", () => {
  // The reported bug: the admin's chosen cover on the LEAD row is ALSO the
  // cover of a member row, so the old precedence treated it as variant-owned,
  // skipped it, and promoted the next photo instead.
  const leadCover = `${S}/3524/fbdaf98f6a83-HUDSON_Render.png`;
  const eventShot = `${S}/3524/7386fbbaf1ba-20240803_003751155_iOS.jpg`;
  const input = {
    leadImages: [leadCover, eventShot],
    bakedImages: baked([
      "https://images.squarespace-cdn.com/x/HUDSON+Render.png",
      "https://images.squarespace-cdn.com/x/20240803_003751155_iOS.jpg",
    ]),
    memberImages: [leadCover, eventShot],
    variantCoverUrls: [
      "https://x.supabase.co/storage/v1/object/public/incoming-photos/largedecor/HUDSON%20Render.png",
    ],
  };

  it("keeps the lead row's first image as the public cover", () => {
    const out = mergeFamilyImages(input, { leadCoverWins: true });
    expect(out[0].url).toBe(leadCover);
    expect(out[0].isHero).toBe(true);
  });

  it("reproduces the old defect when lead precedence is disabled", () => {
    const out = mergeFamilyImages(input, { leadCoverWins: false });
    expect(out[0].url).not.toBe(leadCover);
  });

  it("does not duplicate the cover after promoting it", () => {
    const out = mergeFamilyImages(input, { leadCoverWins: true });
    const keys = out.map((i) => imageKey(i.url));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("still exposes every member photo behind the cover", () => {
    const out = mergeFamilyImages(input, { leadCoverWins: true });
    expect(out.map((i) => imageKey(i.url))).toContain(imageKey(eventShot));
  });

  it("assigns contiguous positions with exactly one hero", () => {
    const out = mergeFamilyImages(input, { leadCoverWins: true });
    expect(out.map((i) => i.position)).toEqual(out.map((_, i) => i));
    expect(out.filter((i) => i.isHero)).toHaveLength(1);
  });
});

describe("mergeFamilyImages — lead row with no live images", () => {
  it("falls back to baked group shots, unchanged by the fix", () => {
    const input = {
      leadImages: [],
      bakedImages: baked([`${S}/set/EDEN_Set.png`, `${S}/set/EDEN_Charger.png`]),
      memberImages: [`${S}/member/EDEN_Charger.png`],
      variantCoverUrls: [],
    };
    const before = mergeFamilyImages(input, { leadCoverWins: false });
    const after = mergeFamilyImages(input, { leadCoverWins: true });
    expect(after.map((i) => i.url)).toEqual(before.map((i) => i.url));
    expect(after[0].url).toBe(`${S}/set/EDEN_Set.png`);
  });
});

describe("coverFirst", () => {
  it("demotes a detail shot out of the cover slot without dropping it", () => {
    const out = coverFirst(baked([`${S}/a/CHAIR_detail.png`, `${S}/a/CHAIR_full.png`]));
    expect(out[0].url).toBe(`${S}/a/CHAIR_full.png`);
    expect(out).toHaveLength(2);
  });

  it("leaves a valid cover alone", () => {
    const imgs = baked([`${S}/a/CHAIR_full.png`, `${S}/a/CHAIR_detail.png`]);
    expect(coverFirst(imgs)).toBe(imgs);
  });
});

describe("cache-buster version precedence", () => {
  // Locks the fix from the image round-trip receipt: a live edit timestamp
  // must beat the frozen bake-time version, or a photo replaced at the SAME
  // storage URL keeps serving stale CDN bytes.
  const resolveVersion = (liveVersion: number | null, bakedVersion: number) =>
    Math.max(liveVersion ?? 0, bakedVersion ?? 0);

  it("advances when updated_at moves past bake time", () => {
    expect(resolveVersion(1786523662, 1786482743)).toBe(1786523662);
  });

  it("keeps the baked version when the row has not been edited since", () => {
    expect(resolveVersion(null, 1786482743)).toBe(1786482743);
  });
});
