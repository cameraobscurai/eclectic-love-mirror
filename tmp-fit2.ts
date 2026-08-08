import cat from './src/data/inventory/current_catalog.json';
import { resolveProductFit } from './src/components/collection/productFit';
import { physicalScaleFor, parseDimensionsInches } from './src/components/collection/productPhysicalScale';
const items:any[] = cat as any;
const rows = items.filter(p=>p.categorySlug==='seating').map(p=>{
  const f:any = resolveProductFit(p as any);
  const ph = physicalScaleFor(p as any);
  const d = parseDimensionsInches(p.dimensions);
  return {t:p.title, dim:p.dimensions, size:+ph.size.toFixed(2), h:+ph.height.toFixed(2),
    target:+f.primaryTarget.toFixed(3), wMax:f.widthMax, hMax:+(f.heightMax??0).toFixed(3), sub:p.subcategory};
});
const show = rows.filter(r=>/CHAIR|SOFA/.test(r.t)).slice(0,14);
console.table(show);
