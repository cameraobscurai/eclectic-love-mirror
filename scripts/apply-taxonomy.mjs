/**
 * Apply the declared taxonomy (Adrienne's spreadsheet) to inventory_items.
 *
 * Usage:
 *   node scripts/apply-taxonomy.mjs <workbook.xlsx> [--apply]
 *
 * Default is a DRY RUN that prints a manifest and writes nothing.
 *
 * The workbook must have a sheet named "Remap Draft" with the columns
 * rms_id, title, proposed_collection, proposed_category. Adrienne types over
 * the proposed_* values; anything she leaves alone is taken as approved.
 *
 * Rules:
 *  - Every value is validated against public.taxonomy_collections /
 *    taxonomy_categories. Off-vocabulary values abort the run with a report —
 *    nothing partial is written.
 *  - Assignment is per family tile: variant rows folded under a family
 *    inherit the lead row's collection/category, so review stays at ~635 rows
 *    instead of 835.
 *  - Rows absent from the workbook are left NULL (Unassigned queue), never
 *    guessed.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/apply-taxonomy.mjs <workbook.xlsx> [--apply]');
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const wb = xlsx.readFile(file);
const sheetName = wb.SheetNames.includes('Remap Draft') ? 'Remap Draft' : wb.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
console.log(`sheet "${sheetName}": ${rows.length} rows`);

// ── Reference vocabulary ────────────────────────────────────────────────────
const { data: cats, error: catErr } = await sb
  .from('taxonomy_categories')
  .select('slug, collection_slug, label');
if (catErr) { console.error('taxonomy fetch error', catErr); process.exit(1); }

const validPairs = new Set(cats.map(c => `${c.collection_slug}::${c.slug}`));
const bySlug = new Map(cats.map(c => [c.slug, c]));
const byLabel = new Map(cats.map(c => [c.label.toLowerCase(), c]));

const slugify = s => String(s).trim().toLowerCase()
  .replace(/\+/g, ' ').replace(/&/g, ' ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Accept either the slug or her display label ("Sofas + Loveseats"). */
function resolveCategory(collectionRaw, categoryRaw) {
  const cRaw = String(categoryRaw ?? '').trim();
  if (!cRaw) return null;
  const hit = bySlug.get(slugify(cRaw)) || byLabel.get(cRaw.toLowerCase()) || bySlug.get(cRaw);
  if (!hit) return null;
  const collection = slugify(collectionRaw ?? '') || hit.collection_slug;
  if (!validPairs.has(`${collection}::${hit.slug}`)) return null;
  return { collection_slug: collection, category_slug_v2: hit.slug };
}

// ── Family map: variant rows inherit the lead row's assignment ──────────────
const familyPath = path.join(process.cwd(), 'src/data/inventory/family-map.json');
const families = fs.existsSync(familyPath)
  ? JSON.parse(fs.readFileSync(familyPath, 'utf8')).families
  : {};

// ── Build the assignment set ────────────────────────────────────────────────
const assignments = new Map(); // rms_id -> { collection_slug, category_slug_v2, via }
const rejects = [];

for (const r of rows) {
  const rmsId = String(r.rms_id ?? '').trim();
  if (!rmsId) continue;
  const resolved = resolveCategory(r.proposed_collection, r.proposed_category);
  if (!resolved) {
    rejects.push({
      rms_id: rmsId,
      title: r.title,
      collection: r.proposed_collection,
      category: r.proposed_category,
    });
    continue;
  }
  assignments.set(rmsId, { ...resolved, via: 'reviewed' });

  const fam = families[rmsId];
  if (fam?.members) {
    for (const m of fam.members) {
      const id = String(m.id);
      if (!assignments.has(id)) assignments.set(id, { ...resolved, via: `family:${rmsId}` });
    }
  }
}

if (rejects.length) {
  console.error(`\n${rejects.length} off-vocabulary value(s) — nothing was written:\n`);
  for (const r of rejects.slice(0, 40)) {
    console.error(`  ${r.rms_id}  ${r.title}  →  "${r.collection}" / "${r.category}"`);
  }
  if (rejects.length > 40) console.error(`  … and ${rejects.length - 40} more`);
  console.error('\nValid categories:', [...bySlug.keys()].join(', '));
  process.exit(1);
}

// ── Manifest ────────────────────────────────────────────────────────────────
const byCollection = {};
for (const a of assignments.values()) {
  byCollection[a.collection_slug] = (byCollection[a.collection_slug] ?? 0) + 1;
}
const inherited = [...assignments.values()].filter(a => a.via !== 'reviewed').length;

console.log('\n── manifest ──');
console.log('reviewed rows      :', rows.length);
console.log('rows to write      :', assignments.size, `(${inherited} inherited by family)`);
for (const [k, v] of Object.entries(byCollection).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${v}`);
}

const { count: totalRows } = await sb
  .from('inventory_items')
  .select('*', { count: 'exact', head: true })
  .not('rms_id', 'is', null);
console.log('rows in db         :', totalRows);
console.log('will stay unassigned:', (totalRows ?? 0) - assignments.size);

if (!APPLY) {
  console.log('\n[dry run] nothing written. re-run with --apply');
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────
let written = 0;
for (const [rmsId, a] of assignments) {
  const { error } = await sb
    .from('inventory_items')
    .update({ collection_slug: a.collection_slug, category_slug_v2: a.category_slug_v2 })
    .eq('rms_id', rmsId);
  if (error) { console.error('update error', rmsId, error); process.exit(1); }
  written += 1;
  if (written % 100 === 0) console.log('written', written, '/', assignments.size);
}
console.log('written', written, '/', assignments.size);

const { count: stillUnassigned } = await sb
  .from('inventory_items')
  .select('*', { count: 'exact', head: true })
  .not('rms_id', 'is', null)
  .is('collection_slug', null);
console.log('unassigned remaining:', stillUnassigned);
