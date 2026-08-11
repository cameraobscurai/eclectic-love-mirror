/**
 * Task C — reseed the declared taxonomy from the v4 workbook.
 *
 *   node scripts/reseed-taxonomy.mjs /path/to/taxonomy-remap-v4.xlsx [--apply]
 *
 * Default is a DRY RUN: writes nothing, emits three review artifacts under docs/
 *   - docs/taxonomy-reseed-diff.md   (buckets 1–4 + per-collection counts)
 *   - docs/taxonomy-bucket4.md       (assigned in db, absent from workbook)
 *   - docs/taxonomy-title-lint.md    (title-vs-category mismatch advisories)
 *
 * Rules (as approved):
 *  - blank proposed_category → skipped (left as-is, counted); off-vocabulary → ABORT.
 *  - export cross-check is a verifier only. Colorado rule: export rows whose
 *    Product Page starts with "ut-" are never used for matching.
 *  - rows whose workbook source is 'human' are exempt from cross-check demotion.
 *  - family variants inherit the lead row's assignment.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
const EXPORT_CSV = process.argv.find(a => a.endsWith('.csv'));
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/reseed-taxonomy.mjs <workbook.xlsx> [export.csv] [--apply]');
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── vocabulary ──────────────────────────────────────────────────────────────
const { data: cats, error: catErr } = await sb
  .from('taxonomy_categories').select('slug, collection_slug, label');
if (catErr) { console.error(catErr); process.exit(1); }
const validPairs = new Set(cats.map(c => `${c.collection_slug}::${c.slug}`));
const bySlug = new Map(cats.map(c => [c.slug, c]));
const byLabel = new Map(cats.map(c => [c.label.toLowerCase(), c]));

const slugify = s => String(s ?? '').trim().toLowerCase()
  .replace(/\+/g, ' ').replace(/&/g, ' ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function resolve(collectionRaw, categoryRaw) {
  const cRaw = String(categoryRaw ?? '').trim();
  if (!cRaw) return { blank: true };
  const hit = bySlug.get(slugify(cRaw)) || byLabel.get(cRaw.toLowerCase()) || bySlug.get(cRaw);
  if (!hit) return { unknown: true };
  const collection = slugify(collectionRaw) || hit.collection_slug;
  if (!validPairs.has(`${collection}::${hit.slug}`)) {
    // Collection-crossing rule: when a category's home differs between the old
    // tree (workbook column, inherited from the old site) and the declared tree,
    // the declared tree wins. The category's home dictates the collection —
    // never inherit the old parent for a category that crossed collections.
    return {
      collection_slug: hit.collection_slug, category_slug: hit.slug,
      crossed: { workbookCollection: collection, referenceCollection: hit.collection_slug },
    };
  }
  return { collection_slug: collection, category_slug: hit.slug };
}

// ── workbook ────────────────────────────────────────────────────────────────
const wb = xlsx.readFile(file);
const sheet = wb.SheetNames.find(n => /remap/i.test(n)) ?? wb.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet]);
console.log(`sheet "${sheet}": ${rows.length} rows`);

const familyPath = path.join(process.cwd(), 'src/data/inventory/family-map.json');
const families = fs.existsSync(familyPath)
  ? JSON.parse(fs.readFileSync(familyPath, 'utf8')).families : {};

const assignments = new Map(); // rms_id -> {collection_slug, category_slug, via, confidence, source, title}
const rejects = [];   // true off-vocabulary — nothing in the reference tables
const crossings = []; // category crossed collections between trees — declared tree wins
const blanks = [];

for (const r of rows) {
  const rmsId = String(r.rms_id ?? '').trim();
  if (!rmsId) continue;
  const res = resolve(r.proposed_collection, r.proposed_category);
  if (res.unknown) {
    rejects.push({ rmsId, title: r.title, c: r.proposed_collection, k: r.proposed_category });
    continue;
  }
  if (res.crossed) {
    crossings.push({
      rmsId, title: String(r.title ?? ''), category: res.category_slug,
      workbookCollection: res.crossed.workbookCollection,
      appliedCollection: res.crossed.referenceCollection,
    });
  }
  if (res.blank) { blanks.push({ rmsId, title: r.title }); continue; }
  const base = {
    ...res,
    confidence: String(r.confidence ?? 'high').trim().toLowerCase(),
    source: String(r.source ?? 'squarespace').trim().toLowerCase(),
    title: String(r.title ?? ''),
  };
  assignments.set(rmsId, { ...base, via: 'reviewed' });
  for (const m of families[rmsId]?.members ?? []) {
    const id = String(m.id);
    if (!assignments.has(id)) assignments.set(id, { ...base, via: `family:${rmsId}`, title: m.title ?? base.title });
  }
}

const BLOCKED = rejects.length > 0;
if (rejects.length) {
  console.error(`\n${rejects.length} off-vocabulary value(s):`);
  for (const r of rejects.slice(0, 40)) console.error(`  ${r.rmsId} ${r.title} -> "${r.c}" / "${r.k}"`);
}
if (crossings.length) {
  console.log(`\n${crossings.length} collection-crossing correction(s) — declared tree wins:`);
  for (const m of crossings.slice(0, 40)) {
    console.log(`  ${m.rmsId} ${m.title}: workbook "${m.workbookCollection}" -> applied "${m.appliedCollection}/${m.category}"`);
  }
}
if (BLOCKED && APPLY) {
  console.error('\nABORT — resolve the blockers above before --apply. Nothing written.');
  process.exit(1);
}

// ── current db state ────────────────────────────────────────────────────────
const db = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('inventory_items')
    .select('rms_id, title, collection_slug, category_slug, taxonomy_review')
    .not('rms_id', 'is', null).range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  for (const row of data) db.set(String(row.rms_id), row);
  if (data.length < 1000) break;
}

// ── export cross-check (verifier only, Colorado rule) ───────────────────────
const exportByTitle = new Map();
let exportUt = 0, exportUsed = 0;
if (EXPORT_CSV && fs.existsSync(EXPORT_CSV)) {
  const text = fs.readFileSync(EXPORT_CSV, 'utf8');
  const recs = parseCsv(text);
  const head = recs[0];
  const ix = n => head.indexOf(n);
  for (const rec of recs.slice(1)) {
    const page = rec[ix('Product Page')] ?? '';
    if (/^ut-/i.test(page.trim())) { exportUt += 1; continue; }
    const title = (rec[ix('Title')] ?? '').trim().toLowerCase();
    const category = (rec[ix('Categories')] ?? '').trim();
    if (!title || !category) continue;
    if (!exportByTitle.has(title)) { exportByTitle.set(title, category); exportUsed += 1; }
  }
}

const demotions = [];
for (const [rmsId, a] of assignments) {
  if (a.via !== 'reviewed' || a.source === 'human') continue;
  const exp = exportByTitle.get(a.title.trim().toLowerCase());
  if (!exp) continue;
  const expSlug = slugify(exp);
  const hit = bySlug.get(expSlug) || byLabel.get(exp.toLowerCase());
  if (hit && hit.slug !== a.category_slug) {
    demotions.push({ rmsId, title: a.title, proposed: a.category_slug, export: exp });
  }
}

// ── buckets ─────────────────────────────────────────────────────────────────
const b1 = [], b2 = [], b3 = [], b4 = [];
for (const [rmsId, a] of assignments) {
  const cur = db.get(rmsId);
  if (!cur) continue;
  if (!cur.category_slug) b1.push({ rmsId, ...a });
  else if (cur.category_slug !== a.category_slug || cur.collection_slug !== a.collection_slug)
    b2.push({ rmsId, ...a, wasC: cur.collection_slug, wasK: cur.category_slug });
  else b3.push({ rmsId, ...a });
}
for (const [rmsId, row] of db) {
  if (assignments.has(rmsId)) continue;
  if (row.category_slug || row.collection_slug) b4.push({ rmsId, title: row.title, c: row.collection_slug, k: row.category_slug });
}
const notInDb = [...assignments.keys()].filter(id => !db.has(id));

// ── title lint ──────────────────────────────────────────────────────────────
const hintByToken = new Map();
for (const c of cats) {
  for (const w of c.label.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) {
    const t = w.replace(/s$/, '');
    if (t.length < 4) continue;
    if (!hintByToken.has(t)) hintByToken.set(t, new Set());
    hintByToken.get(t).add(c.slug);
  }
}
const EXTRA_HINTS = {
  banquette: 'banquettes', settee: 'sofas-loveseats', sofa: 'sofas-loveseats',
  loveseat: 'sofas-loveseats', ottoman: 'ottomans-poufs', pouf: 'ottomans-poufs',
  stool: 'chairs-stools', chair: 'chairs-stools', chandelier: 'chandeliers',
  lantern: 'lanterns', pillow: 'pillows', throw: 'throws', rug: 'rugs',
  console: 'consoles', bar: 'bars', tray: 'trays', bowl: 'bowls', vase: 'vases',
};
for (const [tok, slug] of Object.entries(EXTRA_HINTS)) {
  if (bySlug.has(slug)) { if (!hintByToken.has(tok)) hintByToken.set(tok, new Set()); hintByToken.get(tok).add(slug); }
}
const lint = [];
for (const [rmsId, a] of assignments) {
  if (a.via !== 'reviewed') continue;
  const words = a.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).map(w => w.replace(/s$/, ''));
  const suggested = new Set();
  for (const w of words) for (const s of hintByToken.get(w) ?? []) suggested.add(s);
  if (suggested.size && !suggested.has(a.category_slug)) {
    lint.push({ rmsId, title: a.title, assigned: a.category_slug, suggests: [...suggested].join(', ') });
  }
}

// ── counts ──────────────────────────────────────────────────────────────────
const byCollection = {};
const byConfidence = {};
for (const a of assignments.values()) {
  byCollection[a.collection_slug] = (byCollection[a.collection_slug] ?? 0) + 1;
  byConfidence[a.confidence] = (byConfidence[a.confidence] ?? 0) + 1;
}

const ts = new Date().toISOString();
const table = (rowsArr, cols) =>
  ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |',
    ...rowsArr.map(r => '| ' + cols.map(c => String(r[c] ?? '')).join(' | ') + ' |')].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/taxonomy-reseed-blockers.md', `# Reseed blockers — must be ruled before \`--apply\`

Generated ${ts}.

## Collection-crossing corrections (${crossings.length}) — not blockers

Ruled: the declared tree wins. The workbook inherited the old-site collection for a
category that moved collections; the category's home in \`taxonomy_categories\`
dictates the collection.

${crossings.length ? table(crossings, ['rmsId', 'title', 'category', 'workbookCollection', 'appliedCollection']) : '_None._'}

## Off-vocabulary values (${rejects.length})

Nothing in the reference tables matches these. They abort the apply outright.

${rejects.length ? table(rejects.map(r => ({ rmsId: r.rmsId, title: r.title, collection: r.c, category: r.k })), ['rmsId', 'title', 'collection', 'category']) : '_None._'}
`);
fs.writeFileSync('docs/taxonomy-reseed-diff.md', `# Taxonomy reseed v4 — dry run diff

${BLOCKED ? `> **BLOCKED** — ${rejects.length} off-vocabulary value(s) must be ruled first. See \`docs/taxonomy-reseed-blockers.md\`.\n` : ''}
Generated ${ts} from \`${path.basename(file)}\`${EXPORT_CSV ? ` cross-checked against \`${path.basename(EXPORT_CSV)}\`` : ''}. **Nothing written.**

## Totals

- workbook rows: ${rows.length}
- blank category (skipped): ${blanks.length}
- off-vocabulary rejects: ${rejects.length} (any > 0 aborts the apply)
- collection-crossing corrections applied (declared tree wins): ${crossings.length}
- rows to write: ${assignments.size} (${[...assignments.values()].filter(a => a.via !== 'reviewed').length} inherited by family)
- workbook rms_ids absent from db: ${notInDb.length}${notInDb.length ? ` — ${notInDb.join(', ')}` : ''}
- db rows with an rms_id: ${db.size}

## Buckets

| bucket | meaning | count |
| --- | --- | --- |
| 1 | new assignment (db was unassigned) | ${b1.length} |
| 2 | changed assignment | ${b2.length} |
| 3 | unchanged | ${b3.length} |
| 4 | assigned in db, absent from workbook — kept, review-stamped \`med\`/\`v1-seed\` | ${b4.length} |

## Confidence (from workbook)

${table(Object.entries(byConfidence).map(([confidence, count]) => ({ confidence, count })), ['confidence', 'count'])}

## Per-collection counts after reseed

${table(Object.entries(byCollection).sort((a, b) => b[1] - a[1]).map(([collection, count]) => ({ collection, count })), ['collection', 'count'])}

## Export cross-check (verifier)

- export rows excluded by the Colorado \`ut-\` rule: ${exportUt}
- export titles used for matching: ${exportUsed}
- disagreements → demote to \`confidence:'med', source:'export-disagreement'\`: ${demotions.length}
- \`source:'human'\` rows are exempt from demotion.

${demotions.length ? table(demotions, ['rmsId', 'title', 'proposed', 'export']) : '_No disagreements._'}

## Bucket 2 — changed assignments

${b2.length ? table(b2, ['rmsId', 'title', 'wasC', 'wasK', 'collection_slug', 'category_slug']) : '_None._'}

## Bucket 1 — new assignments

${b1.length ? table(b1.slice(0, 200), ['rmsId', 'title', 'collection_slug', 'category_slug']) + (b1.length > 200 ? `\n\n_…and ${b1.length - 200} more._` : '') : '_None._'}
`);

fs.writeFileSync('docs/taxonomy-bucket4.md', `# Bucket 4 — assigned in db, absent from the v4 workbook

Generated ${ts}. ${b4.length} row(s). **Ruled:** keep their current values and stamp
\`{ confidence:'med', source:'v1-seed', reviewed:false }\` — post-bake intake that routes to the
studio's CONFIRM queue with photos and filled proposals.

${b4.length ? table(b4, ['rmsId', 'title', 'c', 'k']) : '_Empty — no ruling required._'}
`);

fs.writeFileSync('docs/taxonomy-title-lint.md', `# Title-vs-category lint (advisory)

Generated ${ts}. ${lint.length} advisory row(s). These do **not** block the reseed —
the title contains a word that names a different category than the one assigned
(e.g. AUSET LINEN BANQUETTE filed outside Banquettes). Rule them in the studio.

${lint.length ? table(lint, ['rmsId', 'title', 'assigned', 'suggests']) : '_No mismatches._'}
`);

// ── prediction table (the apply's acceptance criteria) ──────────────────────
const predictedByCollection = {};
for (const [rmsId, a] of assignments) {
  if (!db.has(rmsId)) continue;
  predictedByCollection[a.collection_slug] = (predictedByCollection[a.collection_slug] ?? 0) + 1;
}
for (const r of b4) {
  predictedByCollection[r.c] = (predictedByCollection[r.c] ?? 0) + 1;
}
const prediction = {
  generatedAt: ts,
  workbook: path.basename(file),
  rowsWritten: [...assignments.keys()].filter(id => db.has(id)).length,
  bucket1New: b1.length,
  bucket2Changed: b2.length,
  bucket3Unchanged: b3.length,
  bucket4ReviewStamped: b4.length,
  crossingCorrections: crossings.length,
  demotions: demotions.length,
  ghostIds: notInDb,
  confidence: {
    med: demotions.length + b4.length,
    high: [...assignments.keys()].filter(id => db.has(id)).length - demotions.length,
  },
  perCollection: predictedByCollection,
};
fs.writeFileSync('docs/taxonomy-reseed-prediction.json', JSON.stringify(prediction, null, 2));

// ── ghost ids → open questions ──────────────────────────────────────────────
const openQ = 'docs/taxonomy-open-questions.md';
const ghostBlock = `## Workbook ids with no database row (${notInDb.length})

Generated ${ts} by \`scripts/reseed-taxonomy.mjs\`. Ruled: **skip, never create** — the workbook
came from the Aug 8 bake and these products have been retired since. A workbook must never
resurrect a product. One glance at the meeting to confirm each was intentionally retired.

${notInDb.length ? notInDb.map(id => `- ${id}`).join('\n') : '_None._'}
`;
let openQText = fs.existsSync(openQ) ? fs.readFileSync(openQ, 'utf8') : '# Taxonomy — open questions\n';
openQText = openQText.includes('## Workbook ids with no database row')
  ? openQText.replace(/## Workbook ids with no database row[\s\S]*?(?=\n## |$)/, ghostBlock)
  : `${openQText.trimEnd()}\n\n${ghostBlock}`;
fs.writeFileSync(openQ, openQText);

console.log(`\nbuckets: new ${b1.length} · changed ${b2.length} · unchanged ${b3.length} · bucket4 ${b4.length}`);
console.log(`crossings ${crossings.length} · blanks ${blanks.length} · demotions ${demotions.length} · title lint ${lint.length}`);
console.log('\n── predicted counts (acceptance criteria for --apply) ──');
console.log(JSON.stringify({ ...prediction, ghostIds: prediction.ghostIds.length }, null, 2));
console.log('\nwrote docs/taxonomy-reseed-blockers.md, docs/taxonomy-reseed-diff.md, docs/taxonomy-bucket4.md, docs/taxonomy-title-lint.md, docs/taxonomy-reseed-prediction.json, docs/taxonomy-open-questions.md');

if (!APPLY) {
  console.log('\n[dry run] nothing written to the database. Re-run with --apply.');
  process.exit(0);
}

// ── apply ───────────────────────────────────────────────────────────────────
const demoted = new Set(demotions.map(d => d.rmsId));
let written = 0;
for (const [rmsId, a] of assignments) {
  if (!db.has(rmsId)) continue;
  const review = demoted.has(rmsId)
    ? { confidence: 'med', source: 'export-disagreement', reviewed: false, needs_owner: false }
    : { confidence: a.confidence, source: a.via === 'reviewed' ? a.source : 'family-inherit', reviewed: false, needs_owner: false };
  const { error } = await sb.from('inventory_items')
    .update({ collection_slug: a.collection_slug, category_slug: a.category_slug, taxonomy_review: review })
    .eq('rms_id', rmsId);
  if (error) { console.error('update error', rmsId, error); process.exit(1); }
  written += 1;
  if (written % 100 === 0) console.log('written', written, '/', assignments.size);
}
console.log('written', written);

// bucket 4 — keep values, stamp review only
let stamped = 0;
for (const r of b4) {
  const { error } = await sb.from('inventory_items')
    .update({ taxonomy_review: { confidence: 'med', source: 'v1-seed', reviewed: false, needs_owner: false } })
    .eq('rms_id', r.rmsId);
  if (error) { console.error('stamp error', r.rmsId, error); process.exit(1); }
  stamped += 1;
}
console.log('bucket-4 review-stamped', stamped);

// ── verify actuals against the prediction ───────────────────────────────────
const actualByCollection = {};
const actualConfidence = {};
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('inventory_items')
    .select('collection_slug, taxonomy_review').not('rms_id', 'is', null).range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  for (const row of data) {
    if (row.collection_slug) actualByCollection[row.collection_slug] = (actualByCollection[row.collection_slug] ?? 0) + 1;
    const c = row.taxonomy_review?.confidence;
    if (c) actualConfidence[c] = (actualConfidence[c] ?? 0) + 1;
  }
  if (data.length < 1000) break;
}
const mismatchLines = [];
if (written !== prediction.rowsWritten) mismatchLines.push(`rowsWritten ${written} != predicted ${prediction.rowsWritten}`);
if (stamped !== prediction.bucket4ReviewStamped) mismatchLines.push(`bucket4 ${stamped} != predicted ${prediction.bucket4ReviewStamped}`);
for (const [k, v] of Object.entries(prediction.perCollection)) {
  if ((actualByCollection[k] ?? 0) !== v) mismatchLines.push(`collection ${k}: actual ${actualByCollection[k] ?? 0} != predicted ${v}`);
}
for (const [k, v] of Object.entries(prediction.confidence)) {
  if ((actualConfidence[k] ?? 0) !== v) mismatchLines.push(`confidence ${k}: actual ${actualConfidence[k] ?? 0} != predicted ${v}`);
}
console.log('\n── actual vs predicted ──');
console.log('per-collection:', JSON.stringify(actualByCollection));
console.log('confidence    :', JSON.stringify(actualConfidence));
if (mismatchLines.length) {
  console.error('\nFAIL — actuals do not match the prediction:');
  for (const l of mismatchLines) console.error('  ' + l);
  process.exit(1);
}
console.log('\nPASS — apply counts equal the predicted table.');

// ── minimal CSV parser (quoted fields, embedded commas/newlines) ────────────
function parseCsv(text) {
  const out = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 1; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out;
}
