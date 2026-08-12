import { describe, expect, it } from "vitest";
import { applyTombstones, type TombstoneProduct } from "@/lib/tombstones";

const img = (url: string, position = 0) => ({
  url,
  position,
  isHero: position === 0,
  inferredFilename: null,
  altText: null,
});

function family(): TombstoneProduct {
  return {
    id: "LEAD",
    title: "Monroe — Single 5'",
    dimensions: "60W",
    stockedQuantity: "1",
    images: [img("lead.jpg", 0), img("sib.jpg", 1)],
    primaryImage: img("lead.jpg", 0),
    imageCount: 2,
    variants: [
      { id: "SIB1", title: "Monroe — Double 10'", dimensions: "120W", stockedQuantity: "2", imageUrl: "sib.jpg" },
      { id: "SIB2", title: "Monroe — Triple", dimensions: "180W", stockedQuantity: "1", imageUrl: null },
    ],
  };
}

describe("applyTombstones", () => {
  it("is a no-op when nothing is deleted", () => {
    const input = [family()];
    expect(applyTombstones(input, new Set())).toBe(input);
  });

  it("drops a standalone tile whose row is gone", () => {
    const solo: TombstoneProduct = {
      id: "SOLO",
      title: "Vanna",
      dimensions: null,
      stockedQuantity: null,
      images: [img("a.jpg")],
      primaryImage: img("a.jpg"),
      imageCount: 1,
      variants: [],
    };
    expect(applyTombstones([solo], new Set(["SOLO"]))).toHaveLength(0);
  });

  it("removes a deleted variant chip but keeps the tile", () => {
    const [out] = applyTombstones([family()], new Set(["SIB1"]));
    expect(out.id).toBe("LEAD");
    expect(out.title).toBe("Monroe — Single 5'");
    expect(out.variants?.map((v) => v.id)).toEqual(["SIB2"]);
  });

  it("promotes the next surviving sibling when the lead is deleted", () => {
    const [out] = applyTombstones([family()], new Set(["LEAD"]));
    expect(out.title).toBe("Monroe — Double 10'");
    expect(out.dimensions).toBe("120W");
    expect(out.primaryImage?.url).toBe("sib.jpg");
    expect(out.images[0].isHero).toBe(true);
    expect(out.images[0].position).toBe(0);
    expect(out.variants?.map((v) => v.id)).toEqual(["SIB2"]);
  });

  it("drops the tile when the lead and every sibling are deleted", () => {
    expect(applyTombstones([family()], new Set(["LEAD", "SIB1", "SIB2"]))).toHaveLength(0);
  });
});
