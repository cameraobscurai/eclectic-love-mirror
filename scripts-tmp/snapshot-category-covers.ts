import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getCollectionCatalog } from '../src/lib/phase3-catalog';
import { groupProductsByBrowseGroup, type BrowseGroupId } from '../src/lib/collection-browse-groups';
import { CATEGORY_COVERS } from '../src/lib/category-covers';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const BUCKET='category-covers';

const ORDER: BrowseGroupId[] = ["sofas","chairs","benches-ottomans","coffee-tables","side-tables","cocktail-tables","dining","bar","storage","lighting","rugs","pillows","throws","tableware","serveware","styling","accents","large-decor"];

const catalog = getCollectionCatalog();
console.log('catalog products:', catalog.products.length);

// Group products by browse-group predicate
function productsForGroup(id: BrowseGroupId) {
  const g = (BROWSE_GROUPS as any)[id];
  if (!g) return [];
  const pred = g.predicate;
  return catalog.products.filter((p: any) => pred(p));
}

const plan: Array<{id:string; url:string; filename:string; targetPath:string}> = [];
function exactFilename(url: string) {
  const noQ = url.split('?')[0];
  const last = noQ.substring(noQ.lastIndexOf('/')+1);
  try { return decodeURIComponent(last); } catch { return last; }
}

for (const id of ORDER) {
  const products = productsForGroup(id);
  if (!products.length) { console.log('skip empty group:', id); continue; }
  const cover = (CATEGORY_COVERS as any)[id];
  const fallback = products.find((p:any)=>p.primaryImage)?.primaryImage?.url;
  const url = cover ?? fallback;
  if (!url) { console.log('NO IMAGE for', id); continue; }
  const fn = exactFilename(url);
  plan.push({ id, url, filename: fn, targetPath: `${id}/${fn}` });
}
console.log('plan:', plan.length, 'covers');
plan.forEach(p => console.log(' -', p.id, '<-', p.url));

// Upload
let ok=0, fail=0;
for (const j of plan) {
  try {
    const r = await fetch(j.url);
    if (!r.ok) throw new Error('fetch '+r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || 'image/png';
    const { error } = await sb.storage.from(BUCKET).upload(j.targetPath, buf, { contentType: ct, upsert: true });
    if (error) throw error;
    ok++; console.log('OK', j.targetPath, buf.length);
  } catch (e:any) { fail++; console.log('FAIL', j.id, e.message); }
}
console.log(`\nDONE  ok=${ok} fail=${fail}`);
