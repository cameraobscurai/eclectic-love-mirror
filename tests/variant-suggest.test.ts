import { describe, expect, it } from "vitest";
import { suggestForFamily, suggestAxis, commonPrefix, BASE_LABEL } from "@/lib/variant-suggest";

const labelsOf = (members: { id: string; title: string }[]) =>
  Object.values(suggestForFamily(members).labels);

describe("variant-suggest", () => {
  it("strips the shared prefix and leaves the distinguishing words", () => {
    const s = suggestForFamily([
      { id: "a", title: "Fiona Bone Dinner Fork" },
      { id: "b", title: "Fiona Bone Dinner Knife" },
      { id: "c", title: "Fiona Bone Tea Spoon" },
    ]);
    expect(commonPrefix(["Fiona Bone Dinner Fork", "Fiona Bone Dinner Knife"])).toBe(
      "Fiona Bone Dinner",
    );
    expect(s.labels.a).toBe("Dinner Fork");
    expect(s.labels.c).toBe("Tea Spoon");
    expect(s.axis).toBe("Piece");
  });

  // Regression: the Nisha/Arian/Midas flatware sets. Word-exact prefix matching
  // bailed on the brand alias and returned the full title as every label.
  it("treats a slash alias as the same anchor word", () => {
    const got = labelsOf([
      { id: "a", title: "Nisha Matte Black Fork" },
      { id: "b", title: "Nisha Matte Black Knife" },
      { id: "c", title: "Nisha/Vidal Butter Knife" },
      { id: "d", title: "Nisha/Vidal Dessert Knife" },
    ]);
    expect(got).toEqual(["Matte Black Fork", "Matte Black Knife", "Butter Knife", "Dessert Knife"]);
  });

  // Regression: SINATRA — the base SKU carries no suffix at all.
  it("names the bare base variant instead of echoing its title", () => {
    const s = suggestForFamily([
      { id: "a", title: "Sinatra - Walnut Fluted Bar" },
      { id: "b", title: "Sinatra - Walnut Fluted Bar - Double (16')" },
      { id: "c", title: "Sinatra - Walnut Fluted Bar - Triple (24')" },
    ]);
    expect(s.labels.a).toBe(BASE_LABEL);
    expect(s.labels.b).toBe("Double (16')");
    expect(s.axis).toBe("Size");
  });

  // Regression: GREEN OLIVE VELVET — differentiator sandwiched by a shared
  // prefix AND a shared suffix.
  it("handles a mid-title differentiator", () => {
    const s = suggestForFamily([
      { id: "a", title: "Green Olive Velvet Lumbar Pillow" },
      { id: "b", title: "Green Olive Velvet Pillow" },
    ]);
    expect(s.labels.a).toBe("Lumbar");
    expect(s.labels.b).toBe(BASE_LABEL);
  });

  it("reads sizes as a Size axis", () => {
    expect(suggestAxis(["Single 5'", "Double 10'"])).toBe("Size");
  });

  it("calls a pure colorway Color, not Finish", () => {
    expect(suggestAxis(["Black", "Olive Green"])).toBe("Color");
  });

  it("never returns an empty or duplicated label", () => {
    const got = labelsOf([
      { id: "a", title: "Sage Coupe Glass" },
      { id: "b", title: "Sage Coupe Glass" },
      { id: "c", title: "Sage Coupe Glass" },
    ]);
    expect(new Set(got).size).toBe(3);
    expect(got.every((l) => l.trim().length > 0)).toBe(true);
  });
});
