import cat from "../../src/data/inventory/current_catalog.json";
import { parseDimensionsInches, parseWidthInches } from "../../src/components/collection/productPhysicalScale";
import { canonicalCategorySlug } from "../../src/components/collection/categoryAliases";
const byCat: Record<string, any[]> = {};
let dims=0, wOnly=0, none=0;
for (const p of (cat as any).products) {
  const c = canonicalCategorySlug(p.categorySlug) ?? "?";
  const d = parseDimensionsInches(p.dimensions);
  const w = parseWidthInches(p.dimensions);
  if (d) dims++; else if (w) wOnly++; else none++;
  (byCat[c] ??= []).push({ sub: (p.liveSubcategories?.[0] ?? p.subcategory ?? "").toLowerCase().trim(), d, w });
}
console.log({dims,wOnly,none});
for (const [c, rows] of Object.entries(byCat)) {
  const subs: Record<string, number[]> = {};
  for (const r of rows) if (r.d) (subs[r.sub||"—"] ??= []).push(Math.sqrt(r.d.width*r.d.height));
  const med=(a:number[])=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:0};
  const all = rows.filter(r=>r.d).map(r=>Math.sqrt(r.d.width*r.d.height));
  console.log(c, "n="+rows.length, "measured="+all.length, "med="+med(all).toFixed(1),
    Object.entries(subs).map(([s,v])=>`${s}:${v.length}@${med(v).toFixed(0)}`).join(" | "));
}
