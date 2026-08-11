# Taxonomy Execution Plan — reseed v3 + Taxonomy Studio

Merges the approved reseed plan with the Taxonomy Studio surface. One sequence, six tasks, each
gated by its Done-when. The React prototype (`taxonomy-studio.jsx`) is the reference implementation
for Task E — build what it shows, wired to the database. The workbook round-trip demotes to a
fallback path; review happens in the studio, with photos.

Sequencing constraint: this whole plan lands before Frame Studio Phase 2. The `categoryFit.ts`
freeze and legacy browse-group scorer stay untouched until Frame Studio Phase 5.

**One gap to flag before Task E:** `taxonomy-studio.jsx` did not arrive with this upload — only
`taxonomy-execution-plan.md` came through. Task E's contract below is taken from the plan text.
Send the .jsx before E starts (E is gated behind C regardless, so nothing blocks now).

---

## Task A — Rename `category_slug_v2` → `category_slug`

Migration rename, the 11 named call sites, regenerated types. Lands first so every diff, doc, and
log this plan produces already uses the clean name. `category` (legacy free-text) and
`subcategory_slug` (142 rows) stay as tracked deletion candidates in
`docs/taxonomy-open-questions.md`, tied to Frame Studio Phase 5.

**Done when:** typecheck clean, no `category_slug_v2` string remains anywhere in the repo.

## Task B — Review-state column (the seam between reseed and studio)

```sql
alter table inventory_items add column if not exists taxonomy_review jsonb;
-- { confidence:'high'|'med'|'low', source:'squarespace'|'squarespace-export'|
--   'squarespace+title'|'liveCat+title'|'title'|'export-disagreement'|'none'|'human',
--   reviewed:boolean, needs_owner:boolean, reviewed_by?:uuid, reviewed_at?:timestamptz }
```

Any human write from the studio sets `source:'human'`, `reviewed:true`, and stamps who/when.
`import.mjs` excludes this column from RMS sync exactly like the two slug columns.

**Done when:** column exists, in types, in the import exclusion list.

## Task C — Reseed

As approved: blank-vs-off-vocabulary rule (blanks skip, off-vocabulary aborts), export cross-check
as verifier with the Colorado `ut-` exclusion, four diff buckets with bucket 4 (outside workbook,
currently assigned) ruled by decision before `--apply`, family inheritance, rebake, per-collection
count verification.

`--apply` also writes `taxonomy_review` per row — confidence/source from v3, `reviewed:false`,
`needs_owner:false`. Cross-check demotions get `confidence:'med', source:'export-disagreement'`.
The 14 reds stay NULL on both slug columns with `confidence:'low'` — they are the studio's opening
queue.

**Done when:** diff reviewed, bucket 4 ruled, applied, rebaked, counts confirmed on `/collection`,
and `select confidence, count(*)` matches 588/33/14 plus any cross-check demotions.

## Task D — Archive

`docs/archive/squarespace-products-2026-08-11.csv` + README: source, date, 1,453 / 1,116 / 37
counts, and the scope line verbatim — *"Colorado only — UT rows retained for record, never
classified."*

## Task E — Taxonomy Studio at `/admin/taxonomy`

Load-bearing, keep as shown in the prototype:

- **The ledger strip.** One tick per product, colored by state (oxide = needs ruling, ochre =
  confirm, slate = with Adrienne, moss = ruled, line = restored-white). Ticks drain as rulings
  land; clicking a tick scrolls to its tile. One row, no wrapping, ~2px ticks at 635 rows.
- **Fixed 5:4 contain photo boxes** on every tile.
- **Constrained dropdowns.** Collection loads its categories from the `taxonomy` reference tables;
  invalid pairs are unrepresentable in the UI and rejected again server-side on write.
- **Bulk assign** via photo-tap selection and a bottom bar.
- **ASK ADRIENNE** toggle per tile → `needs_owner:true`, dashed slate treatment, own filter. That
  filter is her meeting agenda.
- **Filter chips with live counts** and the collection dropdown.
- The Hive back-of-house palette and type treatment as shown.

Prototype → production changes:

- Seeds all 635 lead rows (family tiles once; variants inherit on write) from the reseeded columns
  + `taxonomy_review`, not an embedded array.
- Every dropdown change writes immediately through a staff/admin-gated, audited server function
  (same middleware pattern as `updateItemImages`), setting slugs + `taxonomy_review` per Task B.
  No export-as-save, no session-only state — EXPORT RULINGS is replaced by the writes themselves.
- Default view: OPEN filter. After migration completes, default becomes the unassigned filter —
  new RMS imports land there; classification-at-intake is the standing workflow. This route is
  never deleted in a later cleanup.
- Thumbnails via the existing `withCdnWidth(url, 400)` helper.

**Done when:** all 635 tiles render with photos and seeded state; a dropdown change persists,
audits, stamps `reviewed_by/at`, and survives reload; bulk assign works; the ASK ADRIENNE filter
returns exactly the flagged set; an off-vocabulary write attempted directly at the server function
is rejected; ledger counts equal database counts.

## Task F — Meeting doc

`docs/taxonomy-open-questions.md` carries only policy questions: "Candlighting" spelling; Dining's
size; the eight absent-from-migration products (retired or lost); the `category` /
`subcategory_slug` deletion tracker. Item-level questions — the 14 reds and cross-check demotions
— live in the studio behind ASK ADRIENNE and NEEDS RULING. The doc links the route.
Storage-under-Cocktail+Bar and the bare-"chair" boundary stay closed by her own historical data.

---

## Order and gating

A → B → C (dry, diff, bucket-4 ruling, apply) → D anytime after C → E → F.
E must not start before C applies.

**First output on approval: Task A's rename migration and nothing else.**
