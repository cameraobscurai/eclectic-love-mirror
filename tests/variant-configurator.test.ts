import { describe, expect, it } from "vitest";
import {
  configurableVariants,
  resolveVariant,
  variantKey,
} from "@/components/pdp/VariantConfigurator";
import type { CollectionProduct } from "@/lib/phase3-catalog";

type V = NonNullable<CollectionProduct["variants"]>[number];

const v = (over: Partial<V>): V => ({
  id: over.id ?? "id-1",
  title: over.title ?? "Piece",
  dimensions: over.dimensions ?? null,
  stockedQuantity: over.stockedQuantity ?? null,
  imageUrl: over.imageUrl ?? null,
  label: over.label ?? null,
  pinned: over.pinned ?? false,
  isLead: over.isLead ?? false,
});

const product = (over: Partial<CollectionProduct>): CollectionProduct =>
  ({ id: "p1", title: "MONROE", ...over }) as CollectionProduct;

describe("variant configurator gating", () => {
  it("stays off without a declared option axis", () => {
    const p = product({
      variants: [v({ id: "a", label: "Single 5'" }), v({ id: "b", label: "Double 10'" })],
    });
    expect(configurableVariants(p)).toEqual([]);
    expect(resolveVariant(p, undefined)).toBeNull();
  });

  it("stays off with only one labelled variant", () => {
    const p = product({
      optionName: "Size",
      variants: [v({ id: "a", label: "Single 5'" }), v({ id: "b", label: null })],
    });
    expect(configurableVariants(p)).toEqual([]);
  });

  it("turns on with an axis and two labelled variants", () => {
    const p = product({
      optionName: "Size",
      variants: [v({ id: "a", label: "Single 5'" }), v({ id: "b", label: "Double 10'" })],
    });
    expect(configurableVariants(p).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("de-duplicates variants that share a label", () => {
    const p = product({
      optionName: "Size",
      variants: [
        v({ id: "a", label: "Single 5'" }),
        v({ id: "b", label: "single 5'" }),
        v({ id: "c", label: "Double" }),
      ],
    });
    expect(configurableVariants(p).map((x) => x.id)).toEqual(["a", "c"]);
  });
});

describe("selection resolution", () => {
  const p = product({
    optionName: "Size",
    variants: [
      v({ id: "a", label: "Single 5'" }),
      v({ id: "b", label: "Double 10'", isLead: true }),
    ],
  });

  it("keys are url-safe and stable", () => {
    expect(variantKey(v({ label: "Single 5'" }))).toBe("single-5");
    expect(variantKey(v({ id: "row-9", label: null }))).toBe("row-9");
  });

  it("an unknown ?v= falls back to the lead, never throws", () => {
    expect(resolveVariant(p, "does-not-exist")?.id).toBe("b");
  });

  it("no ?v= lands on the lead", () => {
    expect(resolveVariant(p, undefined)?.id).toBe("b");
  });

  it("a known ?v= wins over the lead", () => {
    expect(resolveVariant(p, "single-5")?.id).toBe("a");
  });

  it("falls back to first member when no lead is declared", () => {
    const noLead = product({
      optionName: "Finish",
      variants: [v({ id: "x", label: "Brass" }), v({ id: "y", label: "Nickel" })],
    });
    expect(resolveVariant(noLead, undefined)?.id).toBe("x");
  });
});
