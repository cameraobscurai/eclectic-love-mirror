import { describe, expect, it } from "vitest";
import catalog from "@/data/inventory/current_catalog.json";
import {
  COMBINED_SUBS,
  PARENT_ORDER,
  PARENT_SUBS,
  TILE_TO_PARENT_SUB,
  isLegacyTileId,
  productMatchesSub,
  productParent,
} from "@/lib/collection-parents";
import type { CollectionProduct } from "@/lib/phase3-catalog";

const products = (catalog as unknown as { products: CollectionProduct[] }).products;
const seating = "lounge-seating" as const;
const pick = (sub: string, parent = seating) =>
  products.filter((p) => productMatchesSub(p, parent, sub));
const cats = (list: CollectionProduct[]) => new Set(list.map((p) => p.declaredCategory));

const fake = (collectionSlug: string, declaredCategory: string | null, title = "Sofa Bench") =>
  ({ collectionSlug, declaredCategory, title }) as unknown as CollectionProduct;

describe("Benches + Ottomans combined filter", () => {
  it("tile and legacy ?group=benches-ottomans map to the combined sub, not 'all'", () => {
    expect(isLegacyTileId("benches-ottomans")).toBe(true);
    expect(TILE_TO_PARENT_SUB["benches-ottomans"]).toEqual({
      parent: seating,
      sub: "benches-ottomans",
    });
    expect(COMBINED_SUBS["benches-ottomans"].members).toEqual(["benches", "ottomans"]);
  });

  it("is exactly the union of declared benches and ottomans", () => {
    const combined = pick("benches-ottomans");
    const union = [...pick("benches"), ...pick("ottomans")];
    expect(combined.length).toBe(union.length);
    expect(new Set(combined)).toEqual(new Set(union));
    expect(cats(combined)).toEqual(new Set(["benches", "ottomans"]));
    expect(combined.length).toBe(24); // current catalog: 9 benches + 15 ottomans
  });

  it("uses declared category only — never title words", () => {
    expect(productMatchesSub(fake(seating, "sofas-loveseats"), seating, "benches-ottomans")).toBe(
      false,
    );
    expect(productMatchesSub(fake(seating, null, "Ottoman"), seating, "benches-ottomans")).toBe(
      false,
    );
    expect(productMatchesSub(fake(seating, "benches", "Sofa"), seating, "benches-ottomans")).toBe(
      true,
    );
  });

  it("individual selections and other Seating filters are unchanged", () => {
    expect(cats(pick("benches"))).toEqual(new Set(["benches"]));
    expect(cats(pick("ottomans"))).toEqual(new Set(["ottomans"]));
    expect(pick("benches").length).toBe(9);
    expect(pick("ottomans").length).toBe(15);
    expect(cats(pick("sofas-loveseats"))).toEqual(new Set(["sofas-loveseats"]));
    expect(cats(pick("lounge-chairs"))).toEqual(new Set(["lounge-chairs"]));
    expect(pick("all").length).toBe(products.filter((p) => productParent(p) === seating).length);
    // The combined id is not a declared rail category.
    expect(PARENT_SUBS[seating].map((s) => s.id)).not.toContain("benches-ottomans");
  });

  it("stays isolated to Lounge Seating", () => {
    for (const parent of PARENT_ORDER.filter((p) => p !== seating)) {
      expect(pick("benches-ottomans", parent)).toHaveLength(0);
    }
    expect(productMatchesSub(fake("dining", "benches"), "dining", "benches-ottomans")).toBe(false);
  });
});
