import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const BUCKET='category-covers';

const cat = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));

// Replicate CategoryTonalGrid ORDER + browse-group product membership
// Just use the live catalog.products' categorySlug; first product per categorySlug becomes the cover.
// Plus the explicit override:
const OVERRIDES = {
  sofas: 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/SEATING/SOFA/RESHMA Botanical Sofa 0.png',
};

// Read browse-groups so we cover same set as the grid.
const groupsSrc = fs.readFileSync('src/lib/collection-browse-groups.ts','utf8');
// Pull all BrowseGroupId IDs from the ORDER constant in CategoryTonalGrid as canonical list
const order = ["sofas","chairs","benches-ottomans","coffee-tables","side-tables","cocktail-tables","dining","bar","storage","lighting","rugs","pillows","throws","tableware","serveware","styling","accents","large-decor"];

// Extract the BROWSE_GROUPS mapping {id: predicate-ish} from collection-browse-groups
// Easier: import the module via dynamic build is heavy. Instead, derive coverage by mapping group->categorySlug heuristics OR use first product whose primaryImage exists per group via a thin grouping.
// Simpler: just snapshot the URL each card resolves to. Build that resolution server-side by replicating logic:
//   per group id, find products belonging via the same membership the app uses.
// To avoid duplicating logic, dynamically import the compiled lib — instead, use tsx to evaluate.

// Pragmatic approach: read browse-groups module and let the runtime tell us. Use bun if available.
console.log('Falling back to: snapshot first primaryImage URL for each products[].categorySlug, plus overrides keyed by their slug.');

// Map categorySlug -> first primaryImage url
const firstByCat = new Map();
for (const p of cat.products) {
  if (firstByCat.has(p.categorySlug)) continue;
  if (p.primaryImage?.url) firstByCat.set(p.categorySlug, { url: p.primaryImage.url, slug: p.slug, title: p.title });
}

// We also want the actual browse-group covers as displayed. Let's compute via running the bundled lib through bun.
