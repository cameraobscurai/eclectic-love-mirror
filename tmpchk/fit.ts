import CAT from "@/data/inventory/current_catalog.json";
import { resolveProductFit } from "@/components/collection/productFit";
const pick = ["HENRY","COSETTE","ANTONELLA","BRAYAN","JESSIE","ERIN","CICELY","LUNA","ADELAIDE"];
for (const p of (CAT as any).products){
  if(p.categorySlug!=="seating") continue;
  if(!pick.some(k=>p.title.startsWith(k))) continue;
  const f = resolveProductFit(p);
  console.log(p.title.slice(0,28).padEnd(30),(p.dimensions||"").slice(0,24).padEnd(26),"w",f.primaryTarget.toFixed(3),"h",f.secondaryMax.toFixed(3));
}
