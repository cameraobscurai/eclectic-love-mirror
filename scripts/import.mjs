import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import xlsx from 'xlsx';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Workbook path is overridable so the intake-loop test can drive this exact
// script against a synthetic two-row workbook instead of the real RMS export.
// See scripts/audit/intake-loop-test.mjs and DECISIONS.md#r6.
const WORKBOOK = process.env.RMS_WORKBOOK || '/tmp/current_inventory.xlsx';
const wb = xlsx.readFile(WORKBOOK);
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const CAT = {
  'Tableware':'tableware','Pillows':'pillows-throws','Throws':'pillows-throws',
  'Seating':'seating','Styling':'styling','Tables':'tables','Serveware':'serveware',
  'Bars':'bars','Large Decor & Dividers':'large-decor','Lighting':'lighting',
  'Rugs':'rugs','Candlelight':'candlelight','Chandeliers':'chandeliers',
  'Storage':'storage','Furs & Pelts':'furs-pelts','Subrentals':'subrentals',
};
const PUBLIC = new Set(Object.values(CAT).filter(c=>c!=='subrentals'));
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'item';
const DIM = /(\d+(?:\.\d+)?)\s*(['"])\s*([WDH])/gi;
function parseDims(s) {
  if (!s) return [null,null,null];
  const o = {W:null,D:null,H:null};
  let m;
  while ((m = DIM.exec(s))) {
    const n = parseFloat(m[1]);
    const inches = m[2] === "'" ? n*12 : n;
    const cm = Math.round(inches*2.54*10)/10;
    const a = m[3].toUpperCase();
    if (o[a] == null) o[a] = cm;
  }
  return [o.W,o.D,o.H];
}

const records = rows.map(r => {
  const rms_id = String(r['Id']);
  const name = String(r['Name']).trim();
  const group = String(r['Product Group']).trim();
  const cat = CAT[group] || slugify(group);
  const status = PUBLIC.has(cat) ? 'available' : 'draft';
  const stock = r['Current Stock'];
  const isNum = typeof stock === 'number' && !Number.isNaN(stock);
  const dims_raw = r['(W" x D" x H") Dims'] || null;
  const [w,d,h] = parseDims(dims_raw);
  return {
    rms_id, title: name, slug: `${slugify(name)}-${rms_id}`,
    category: cat, status,
    quantity: isNum ? Math.trunc(stock) : null,
    quantity_label: isNum ? null : (stock != null ? String(stock) : null),
    dimensions_raw: dims_raw,
    width_cm: w, depth_cm: d, height_cm: h,
    images: [],
  };
});

console.log('records:', records.length);

/**
 * TAXONOMY PROTECTION — do not remove.
 *
 * `collection_slug` / `category_slug` are DECLARED by the owner (Adrienne's
 * review), not derived from RMS. This importer must never write them on an
 * existing row: doing so would null her assignments, and since unassigned
 * products stay out of nav, a routine re-import would silently pull live
 * products off the site with no error anywhere.
 *
 * New RMS products are inserted with both columns NULL on purpose — they land
 * in the "Unassigned" queue in admin Inventory for a human to classify.
 *
 * Same reasoning applies to `images`: RMS has no image data, so an upsert that
 * included it would wipe curated photos on every sync.
 *
 * `taxonomy_review` carries the provenance and reviewed-state of those
 * assignments (who ruled, when, from which record). It is human/tooling state,
 * never RMS state, so it gets the same clobber protection.
 */
const OWNER_DECLARED_COLUMNS = [
  'collection_slug',
  'category_slug',
  'taxonomy_review',
  'images',
];

// First soft-delete legacy rows
const { error: delErr } = await sb.from('inventory_items').update({ status: 'draft' }).is('rms_id', null).neq('status', 'draft');
if (delErr) { console.error('soft-delete error', delErr); process.exit(1); }

// Which rms_ids already exist? Existing rows get a narrow UPDATE, new rows an INSERT.
const existing = new Set();
{
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('inventory_items')
      .select('rms_id')
      .not('rms_id', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) { console.error('existing-id fetch error', error); process.exit(1); }
    for (const r of data) existing.add(String(r.rms_id));
    if (data.length < PAGE) break;
  }
}

const toInsert = records.filter(r => !existing.has(r.rms_id));
const toUpdate = records.filter(r => existing.has(r.rms_id));
console.log('new:', toInsert.length, 'existing:', toUpdate.length);

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) {
  console.log('[dry-run] would insert', toInsert.length, 'and update', toUpdate.length, 'rows');
  console.log('[dry-run] columns never written on existing rows:', OWNER_DECLARED_COLUMNS.join(', '));
  process.exit(0);
}

const CHUNK = 200;

// New rows: taxonomy columns intentionally left NULL → Unassigned queue.
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const part = toInsert.slice(i, i + CHUNK);
  const { error } = await sb.from('inventory_items').insert(part);
  if (error) { console.error('insert error chunk', i, error); process.exit(1); }
  console.log('inserted', Math.min(i + CHUNK, toInsert.length), '/', toInsert.length);
}

// Existing rows: RMS-owned fields only. Never the owner-declared columns.
let updated = 0;
for (const rec of toUpdate) {
  const patch = { ...rec };
  for (const col of OWNER_DECLARED_COLUMNS) delete patch[col];
  delete patch.rms_id;
  const { error } = await sb.from('inventory_items').update(patch).eq('rms_id', rec.rms_id);
  if (error) { console.error('update error', rec.rms_id, error); process.exit(1); }
  updated += 1;
  if (updated % 100 === 0) console.log('updated', updated, '/', toUpdate.length);
}
console.log('updated', updated, '/', toUpdate.length);

const { count: finalCount } = await sb.from('inventory_items').select('*', { count: 'exact', head: true }).not('rms_id','is',null);
console.log('total rows with rms_id in db:', finalCount);

const { count: unassigned } = await sb
  .from('inventory_items')
  .select('*', { count: 'exact', head: true })
  .not('rms_id', 'is', null)
  .is('collection_slug', null);
console.log('unassigned (needs classification):', unassigned);

