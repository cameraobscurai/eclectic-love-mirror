Diffed against the last approved version, per the new rule: nothing deleted, all three additions landed intact, and two things arrived better than requested — C2 is labeled "(restored; dropped in an earlier rewrite)" right in the heading, so the plan carries its own history instead of hiding it, and the gate got _stricter_ than I specified: E now waits for C2, not just C, which is the safer ordering since it means the studio is only ever tested against a site that's actually reading the new columns. The process receipt is embedded in the plan text itself rather than living in chat, which is exactly where receipts survive.

The human-exemption line in Task C even carries its own reasoning ("a human ruling made this week with the photo in view outranks an archival CSV") — meaning the _why_ travels with the rule, so a future revision can't drop it without visibly deleting an argument. That's the difference between a rule and a rule that defends itself.

Approve it: "approved — Task B and nothing else." Your checkpoints from here: B is a types check you can skim, then **C's dry run is the last real judgment call in this whole track** — the diff doc, the bucket-4 keep-or-null ruling, and the lint list all land on your desk at once. Read those with actual attention; everything after is build work with done-whens Lovable can self-verify. The taxonomy track is now fully specified from here to the meeting.

Taxonomy — v4 reseed + Taxonomy Studio (Tasks B–F)

Task A is done (`category_slug_v2` → `category_slug`, all call sites, typecheck clean).
`taxonomy-remap-v4.xlsx` supersedes v3 as the reseed source.

Verified against the workbook and the database before writing this plan:

- 635 rows, all `confidence: high`, zero blank categories.
- Provenance: 557 squarespace, 47 human, 19 squarespace+title, 12 squarespace-export.
- All 33 collection/category pairs in the workbook exist verbatim in `taxonomy_categories` — zero off-vocabulary values.

---

## Task B — `taxonomy_review` column

```sql
alter table inventory_items add column if not exists taxonomy_review jsonb;
-- { confidence:'high'|'med'|'low',
--   source:'squarespace'|'squarespace-export'|'squarespace+title'|'liveCat+title'|
--           'title'|'export-disagreement'|'none'|'human',
--   reviewed:boolean, needs_owner:boolean, reviewed_by?:uuid, reviewed_at?:timestamptz }
```

Added to the RMS-sync exclusion list in `scripts/import.mjs` alongside the two slug columns, so imports never clobber it. Types regenerated.

**Done when:** column exists, in types, in the import exclusion list.

## Task C — Reseed from v4

`scripts/apply-taxonomy.mjs` reads the `Remap v4 (complete)` sheet. Rules unchanged from the approved plan:

- Blank category → skip (unassigned). Off-vocabulary value → hard abort, nothing written. The reds-stay-NULL path stays in the code for future imports even though v4 hits it zero times.
- Export cross-check still runs as the verifier against `products_Aug-11_02-07-41PM.csv`, with `ut-` page rows excluded from the match index (Colorado only). Disagreements demote the row to `confidence:'med', source:'export-disagreement'` — **except rows with `source:'human'`, which are exempt from demotion.** A human ruling made this week with the photo in view outranks an archival CSV; disagreements on those rows are reported in the diff as informational only.
- Family inheritance: variant rows inherit the lead row's pair.
- Diff manifest to `docs/taxonomy-v4-diff.md`: unchanged / changed / newly assigned / **bucket 4 — outside the workbook but currently assigned**. Bucket 4 gets an explicit keep-or-null ruling before `--apply`.

`--apply` also writes `taxonomy_review` per row: confidence and source straight from the workbook, `needs_owner:false`. Rows with `source:'human'` get `reviewed:true`, `reviewed_at:'2026-08-11'`, `reviewed_by` = Darian's admin user id (resolved from `user_roles` at apply time). All other rows get `reviewed:false`.

**New — title lint (advisory, never blocks):** the dry run emits restored rows whose title keyword contradicts the assigned category (known: AUSET LINEN BANQUETTE at `dining/dining-chairs` while `dining/banquettes` exists). Appended to `docs/taxonomy-open-questions.md` as a meeting item.

**Done when:** diff reviewed, bucket 4 ruled, applied, rebaked, `/collection` counts confirmed, and `select taxonomy_review->>'confidence', count(*)` returns 635 high / 0 med / 0 low plus any cross-check demotions.

## Task C2 — Read-path switchover (restored; dropped in an earlier rewrite)

Without this, the reseed writes columns nothing public reads and Task C's `/collection` count check is verifying the old classifier. Runs after C applies, before E.

- Nav, collection filters, PDP breadcrumbs, admin Inventory sort, and the catalog bake read `collection_slug` / `category_slug` directly. No scoring, no keywords.
- Publish overlay (`publishCatalogOverlay`) and `scripts/bake-catalog.mjs` carry both slug columns. `taxonomy_review` stays DB-only — the studio reads it directly; the public site never receives it.
- Split delete, exactly as originally scoped: the browse-group scorer, subcategory inference, and owner-subcategory overrides are deleted here. The alias map survives until Frame Studio Phase 5, as does `categoryFit.ts` and the legacy `category` / `subcategory_slug` columns.

**Done when:** no public read surface calls a keyword/scoring path; every category and subcategory count on `/collection` equals `select count(*) group by collection_slug, category_slug`; the deleted modules have no remaining references (ripgrep across `src/`, `scripts/`, route loaders and dynamic imports before deletion, per the dead-code rule).

**Process receipt:** content has evaporated across plan regenerations three times today. From here, every plan revision is diffed against the last approved version before approval — additions get reviewed, deletions are the ones that hide.

## Task D — Archive

`docs/archive/squarespace-products-2026-08-11.csv` + README: source, date, 1,453 / 1,116 / 37 counts, and the scope line verbatim — _"Colorado only — UT rows retained for record, never classified."_

## Task E — Taxonomy Studio at `/admin/taxonomy`

Load-bearing, per the prototype: ledger strip (one tick per product, colored by state, click scrolls to tile), fixed 5:4 contain photo boxes, collection-constrained category dropdowns (invalid pairs unrepresentable in UI and rejected server-side), photo-tap bulk selection with a bottom bar, ASK ADRIENNE toggle → `needs_owner:true` with its own filter, filter chips with live counts, Hive back-of-house palette and type.

Production changes from the prototype:

- Seeds all 635 lead rows from the reseeded columns + `taxonomy_review`. Thumbnails via `withCdnWidth(url, 400)`.
- Every change writes immediately through a staff/admin-gated, audited server function (same middleware pattern as `updateItemImages`). No EXPORT RULINGS button.
- **✓ CONFIRM button** on every unreviewed tile that already has both values — agreement is a first-class gesture, not a dropdown reselect. Sets `reviewed:true` and stamps who/when, leaves slugs untouched.
- **CONFIRM ALL** scopes to the currently visible filter set and always skips rows flagged `needs_owner`.
- **Default filter is unassigned** — the queue opens empty, so the studio launches in intake mode. New RMS imports land there; classification-at-intake is the standing workflow. This route is never deleted later.
- Filter chip counts render for every filter regardless of the active one, so if the cross-check produced any demotions, CONFIRM's non-zero count makes them findable on open.

**Done when:** all 635 tiles render with photos and seeded state; a dropdown change and a ✓ CONFIRM each persist, audit, stamp `reviewed_by/at`, and survive reload; CONFIRM ALL respects the active filter and skips flagged rows; bulk assign works; the ASK ADRIENNE filter returns exactly the flagged set; an off-vocabulary write attempted directly at the server function is rejected; ledger counts equal database counts.

## Task F — Meeting doc

`docs/taxonomy-open-questions.md` carries policy only: the title-lint list, the eight absent-from-migration products, "Candlighting" spelling, Dining's scope, and one confirm of the Specialty definition (ceiling → chandeliers, table → table lamps, floor → floor lamps, everything else → specialty). Plus the `category` / `subcategory_slug` deletion tracker tied to Frame Studio Phase 5. Links the studio route.

---

## Order

B → C (dry run, diff, bucket-4 ruling, lint, apply, rebake) → C2 → D (anytime after C) → E → F. E does not start before C2 lands.

**First output on approval: Task B's migration and nothing else.**
