import { describe, expect, it } from "vitest";
import { suggestForFamily, suggestAxis, commonPrefix } from "@/lib/variant-suggest";

describe("variant-suggest", () => {
  it("strips the shared prefix and leaves the distinguishing words", () => {
    const s = suggestForFamily([
      { id: "a", title: "Fiona Bone Dinner Fork" },
      { id: "b", title: "Fiona Bone Dinner Knife" },
      { id: "c", title: "Fiona Bone Tea Spoon" },
    ]);
    expect(commonPrefix(["Fiona Bone Dinner Fork", "Fiona Bone Dinner Knife"])).toBe("Fiona Bone Dinner");
    expect(s.labels.a).toBe("Dinner Fork");
    expect(s.labels.c).toBe("Tea Spoon");
    expect(s.axis).toBe("Piece");
  });

  it("reads sizes as a Size axis", () => {
    expect(suggestAxis(["Single 5'", "Double 10'"])).toBe("Size");
  });

  it("never returns an empty label", () => {
    const s = suggestForFamily([
      { id: "a", title: "Sage Coupe Glass" },
      { id: "b", title: "Sage Coupe Glass" },
    ]);
    expect(s.labels.a.length).toBeGreaterThan(0);
  });
});
