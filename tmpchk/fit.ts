import CAT from "@//data/inventory/current_catalog.json";
import { physicalScaleFor } from "@//components/collection/productPhysicalScale";
import { resolveProductFit } from "@//components/collection/productFit";
const ps = (CAT as any).products.filter((p:any)=>p.categorySlug==="seating").slice(0,60);
for (const p of ps){
  const s = physicalScaleFor(p); const f = resolveProductFit(p);
  console.log(p.title.slice(0,30).padEnd(32), (p.dimensions||"-").slice(0,26).padEnd(28), "w×"+s.width.toFixed(2), "h×"+s.height.toFixed(2), "target", f.primaryTarget.toFixed(3), "hcap", f.secondaryMax.toFixed(3));
}
