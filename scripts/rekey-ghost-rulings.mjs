/**
 * Recover the orphaned v4 rulings ("ghost ids").
 *
 *   node scripts/rekey-ghost-rulings.mjs /path/to/taxonomy-remap-v4.xlsx [--apply]
 *
 * Root cause for the record: the v4 workbook was keyed on BAKE-TIME ids, and
 * bake-time ids are not stable. Fifteen workbook rows therefore matched no DB
 * row during Task C, so their real rows are still unassigned — and post-C2,
 * unassigned means hidden from public browse. Twelve products that were
 * visible yesterday are invisible now.
 *
 * Future workbooks key on DB `rms_id`. Normalized-title match is the
 * documented fallback, and this script is that fallback executed once.
 *
 * Rules:
 *  - Match each ghost id's ruling to DB rows by NORMALIZED TITLE only.
 *  - Exactly one match AND that row is unassigned or `v1-seed` → write.
 *  - Zero matches, multiple matches, or a match already ruled by a human →
 *    REPORT, never write.
 *  - Write is narrow: collection_slug, category_slug, taxonomy_review. Nothing
 *    else on the row is touched.
 *  - Dry run by default. Manifest at docs/taxonomy-rekey-manifest.md.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/rekey-ghost-rulings.mjs <workbook.xlsx> [--apply]');
  process.exit(1);
}

const REVIEWED_BY = process.env.REKEY_ACTOR_ID || 'e4b2a019-4861-4ce6-820a-bca22275ed33'; // Darian
const REVIEWED_AT = new Date().toISOString();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── vocabulary (same resolve rules as the reseed) ───────────────────────────
const { data: cats, error: catErr } = await sb
  .from('taxonomy_categories').select('slug, collection_slug, label');
if (catErr) { console.error(catErr); process.exit(1); }
const validPairs = new Set(cats.map(c => `${c.collection_slug}::${c.slug}`));
const bySlug = new Map(cats.map(c => [c.slug, c]));
const byLabel = new Map(cats.map(c => [c.label.toLowerCase(), c]));

const slugify = s => String(s ?? '').trim().toLowerCase()
  .replace(/\+/g, ' ').replace(/&/g, ' ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Title normalization for matching: case, punctuation, and inch/quote marks
 *  collapse; word order and content must otherwise be identical. */
const normTitle = s => String(s ?? '')
  .toLowerCase()
  .replace(/["“”'’]/g, '')
  .replace(/\bin\b|\binch(es)?\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function resolve(collectionRaw, categoryRaw) {
  const cRaw = String(categoryRaw ?? '').trim();
  if (!cRaw) return { blank: true };
  const hit = bySlug.get(slugify(cRaw)) || byLabel.get(cRaw.toLowerCase()) || bySlug.get(cRaw);
  if (!hit) return { unknown: true };
  const collection = slugify(collectionRaw) || hit.collection_slug;
  // Collection-crossing rule: the declared tree's home wins.
  if (!validPairs.has(`${collection}::${hit.slug}`)) {
    return { collection_slug: hit.collection_slug, category_slug: hit.slug, crossed: true };
  }
  return { collection_slug: collection, category_slug: hit.slug };
}

// ── ghost ids from the open-questions doc ───────────────────────────────────
const openQPath = path.join(process.cwd(), 'docs/taxonomy-open-questions.md');
const openQ = fs.readFileSync(openQPath, 'utf8');
const section = openQ.match(/## Workbook ids with no database row[\s\S]*?(?=\n## |$)/)?.[0] ?? '';
const ghostIds = [...section.matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
if (!ghostIds.length) { console.error('no ghost ids found in docs/taxonomy-open-questions.md'); process.exit(1); }
console.log(`${ghostIds.length} ghost ids`);

// ── workbook rulings for those ids ──────────────────────────────────────────
const wb = xlsx.readFile(file);
const sheet = wb.SheetNames.find(n => /remap/i.test(n)) ?? wb.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet]);
const rulings = new Map();
for (const r of rows) {
  const id = String(r.rms_id ?? '').trim();
  if (!ghostIds.includes(id)) continue;
  rulings.set(id, {
    title: String(r.title ?? '').trim(),
    ...resolve(r.proposed_collection, r.proposed_category),
  });
}

// ── db rows ─────────────────────────────────────────────────────────────────
const dbRows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('inventory_items')
    .select('id, rms_id, title, collection_slug, category_slug, taxonomy_review')
    .range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  dbRows.push(...data);
  if (data.length < 1000) break;
}
const byNormTitle = new Map();
for (const row of dbRows) {
  const k = normTitle(row.title);
  if (!byNormTitle.has(k)) byNormTitle.set(k, []);
  byNormTitle.get(k).push(row);
}

// ── classify ────────────────────────────────────────────────────────────────
const writes = [], reports = [];
for (const ghostId of ghostIds) {
  const ruling = rulings.get(ghostId);
  if (!ruling) { reports.push({ ghostId, why: 'no workbook row for this id' }); continue; }
  if (ruling.unknown || ruling.blank) {
    reports.push({ ghostId, title: ruling.title, why: ruling.blank ? 'blank ruling' : 'off-vocabulary ruling' });
    continue;
  }
  const matches = byNormTitle.get(normTitle(ruling.title)) ?? [];
  if (matches.length === 0) { reports.push({ ghostId, title: ruling.title, why: 'zero title matches in db' }); continue; }
  if (matches.length > 1) {
    reports.push({ ghostId, title: ruling.title, why: `${matches.length} title matches — ambiguous`, matches: matches.map(m => m.rms_id) });
    continue;
  }
  const row = matches[0];
  const source = row.taxonomy_review?.source ?? null;
  const unassigned = !row.collection_slug || !row.category_slug;
  const eligible = unassigned || source === 'v1-seed';
  if (!eligible) {
    reports.push({
      ghostId, title: ruling.title,
      why: `db row (rms_id ${row.rms_id ?? '—'}) is already assigned `
        + `${row.collection_slug}/${row.category_slug}`
        + (row.collection_slug === ruling.collection_slug && row.category_slug === ruling.category_slug
          ? ' — matches the ruling, nothing to recover'
          : ` — DIFFERS from the ruling ${ruling.collection_slug}/${ruling.category_slug}, needs a human call`)
        + ` (review source: ${source ?? 'none'})`,
    });
    continue;
  }
  const already = row.collection_slug === ruling.collection_slug && row.category_slug === ruling.category_slug;
  writes.push({
    ghostId, rmsId: row.rms_id, id: row.id, title: row.title,
    from: `${row.collection_slug ?? '∅'}/${row.category_slug ?? '∅'}`,
    to: `${ruling.collection_slug}/${ruling.category_slug}`,
    collection_slug: ruling.collection_slug, category_slug: ruling.category_slug,
    wasUnassigned: unassigned, valuesUnchanged: already, source,
  });
}

// ── manifest ────────────────────────────────────────────────────────────────
const md = [
  '# Taxonomy — ghost-ruling rekey manifest',
  '',
  `Generated ${REVIEWED_AT} by \`scripts/rekey-ghost-rulings.mjs\` (${APPLY ? 'APPLY' : 'DRY RUN'}).`,
  '',
  'Root cause: the v4 workbook was keyed on bake-time ids, which are not stable.',
  'Future workbooks key on DB `rms_id`; normalized-title match is the documented fallback.',
  '',
  `## Will write (${writes.length})`,
  '',
  '| ghost id | db rms_id | title | from | to | prior source |',
  '| --- | --- | --- | --- | --- | --- |',
  ...writes.map(w => `| ${w.ghostId} | ${w.rmsId} | ${w.title} | ${w.from} | ${w.to} | ${w.source ?? '—'} |`),
  '',
  `## Reported, not written (${reports.length})`,
  '',
  ...(reports.length
    ? reports.map(r => `- **${r.ghostId}** ${r.title ? `(${r.title})` : ''} — ${r.why}${r.matches ? ` [${r.matches.join(', ')}]` : ''}`)
    : ['- none']),
  '',
].join('\n');
fs.writeFileSync(path.join(process.cwd(), 'docs/taxonomy-rekey-manifest.md'), md);

console.log(`\nwill write: ${writes.length}   reported: ${reports.length}`);
for (const w of writes) console.log(`  ${w.ghostId} -> ${w.rmsId} "${w.title}"  ${w.from} => ${w.to}`);
for (const r of reports) console.log(`  SKIP ${r.ghostId} — ${r.why}`);
console.log('\nmanifest: docs/taxonomy-rekey-manifest.md');

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Review the manifest, then re-run with --apply.');
  process.exit(0);
}

let ok = 0, fail = 0;
for (const w of writes) {
  const { error } = await sb.from('inventory_items').update({
    collection_slug: w.collection_slug,
    category_slug: w.category_slug,
    taxonomy_review: {
      source: 'human', confidence: 'high', reviewed: true,
      reviewed_by: REVIEWED_BY, reviewed_at: REVIEWED_AT,
      note: `rekeyed from workbook ghost id ${w.ghostId} by normalized-title match`,
    },
  }).eq('id', w.id);
  if (error) { console.error(`  FAIL ${w.rmsId}: ${error.message}`); fail++; } else ok++;
}
console.log(`\napplied: ${ok} ok, ${fail} fail\nnext: node scripts/bake-catalog.mjs`);
