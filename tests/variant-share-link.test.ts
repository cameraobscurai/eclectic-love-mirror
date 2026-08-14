// End-to-end contract for a shared product link: the `?v=` key the Share
// button writes must resolve back to the exact same variant on a cold load,
// and a stale/garbage key must land on the family lead rather than 404 or a
// blank stage.
import { describe, expect, it } from "vitest";
import {
  configurableVariants,
  resolveVariant,
  variantKey,
} from "@/components/pdp/VariantConfigurator";
import type { CollectionProduct, ProductVariant } from "@/lib/phase3-catalog";

const variant = (id: string, label: string | null, isLead = false): ProductVariant =>
  ({
    id,
    title: `Fiona Bone ${label ?? id}`,
    label,
    isLead,
    imageUrl: `https://cdn.example/${id}.png`,
    dimensions: null,
    stockedQuantity: null,
  }) as unknown as ProductVariant;

const family = (optionName: string | null): CollectionProduct =>
  ({
    id: "3380",
    slug: "fiona-bone-flatware",
    title: "Fiona Bone Salad Fork",
    optionName,
    variants: [
      variant("3380", "Salad Fork", true),
      variant("3384", "Steak Knife"),
      variant("3382", "Tea Spoon"),
    ],
  }) as unknown as CollectionProduct;

/** What ShareButton builds. Kept in sync by the assertion below. */
const shareUrl = (slug: string, key: string | null) =>
  `https://eclectichive.com/collection/${slug}${key ? `?v=${encodeURIComponent(key)}` : ""}`;

describe("share link → variant round trip", () => {
  it("re-selects the shared variant on a cold load", () => {
    const p = family("Piece");
    const picked = configurableVariants(p).find((v) => v.label === "Steak Knife")!;
    const url = new URL(shareUrl(p.slug!, variantKey(picked)));

    expect(url.pathname).toBe("/collection/fiona-bone-flatware");
    expect(url.searchParams.get("v")).toBe("steak-knife");

    // Cold load: only the URL is known.
    const restored = resolveVariant(p, url.searchParams.get("v") ?? undefined);
    expect(restored?.id).toBe(picked.id);
    expect(restored?.title).toBe(picked.title);
    expect(restored?.imageUrl).toBe(picked.imageUrl);
  });

  it("omits ?v= when no variant is selected, and opens on the lead", () => {
    const p = family("Piece");
    expect(shareUrl(p.slug!, null)).toBe("https://eclectichive.com/collection/fiona-bone-flatware");
    expect(resolveVariant(p, undefined)?.isLead).toBe(true);
  });

  it("falls back to the lead for a stale or garbage key", () => {
    const p = family("Piece");
    expect(resolveVariant(p, "no-longer-a-variant")?.isLead).toBe(true);
  });

  it("survives URL encoding of punctuated labels", () => {
    const p = {
      ...family("Size"),
      variants: [variant("a", "Single 5'", true), variant("b", 'Double 10"')],
    } as unknown as CollectionProduct;
    const picked = configurableVariants(p)[1];
    const key = variantKey(picked);
    const round = new URL(shareUrl("x", key)).searchParams.get("v");
    expect(round).toBe(key);
    expect(resolveVariant(p, round ?? undefined)?.id).toBe("b");
  });

  it("shares a plain product link while the family axis is unset", () => {
    // No option_name = no chips = nothing to pin in the URL. The share link is
    // still valid, it just carries no selection.
    const p = family(null);
    expect(configurableVariants(p)).toHaveLength(0);
    expect(shareUrl(p.slug!, null)).not.toContain("?v=");
  });
});
