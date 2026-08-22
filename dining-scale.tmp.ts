import catalog from "@/data/inventory/current_catalog.json";
import { resolveProductFit } from "@/components/collection/productFit";
import {
  physicalScaleFor,
  parseDimensionsInches,
} from "@/components/collection/productPhysicalScale";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
const prods = (catalog as any).products.filter((p: any) => getProductBrowseGroup(p) === "dining");
console.log("dining count", prods.length);
for (const p of prods) {
  const d = parseDimensionsInches(p.dimensions);
  const s = physicalScaleFor(p);
  const f = resolveProductFit(p);
  console.log(
    [
      p.title.padEnd(38),
      (p.categorySlug + "/" + (p.liveSubcategories?.[0] ?? p.subcategory ?? "-")).padEnd(28),
      d ? `${d.width}x${d.height}` : "NO-DIMS",
      "size=" + s.size.toFixed(2),
      "area=" +
        (f.primary === "area"
          ? f.primaryTarget.toFixed(2)
          : f.primary + ":" + f.primaryTarget.toFixed(2)),
      "hMax=" + (f.heightMax?.toFixed(2) ?? "-"),
      "wMax=" + (f.widthMax?.toFixed(2) ?? "-"),
    ].join(" | "),
  );
}
