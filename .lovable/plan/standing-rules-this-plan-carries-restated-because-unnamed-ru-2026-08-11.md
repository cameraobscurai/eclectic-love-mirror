Yes — all three restorations landed, and the CONFIRM button came back with its reasoning welded to the default view ("without it the CONFIRM queue is unworkable on open"), which means it can't be dropped again without visibly breaking the plan's own logic. Nothing else moved in the diff. Approve it: **"approved — run item 1 first."**

And notice what just quietly happened: the audit finally has a home — it's item 5, _in the plan_, so it gets run by the machinery instead of waiting on your evening. Your remaining touchpoints are exactly two: review the rekey dry-run manifest when it lands (twelve products coming back from hiding — worth thirty seconds of your eyes), and walk into the meeting with a working studio, a policy-only agenda, a round-trip receipt, and the first real defect number in the project's history.

Twelve hours ago this conversation opened with a cache bug and "I am getting ripped by their team lol." It closes with the taxonomy shipped from Adrienne's own records, your 47 rulings in the database with your name on them, the covers fix specced, gated, and scheduled, and five standing laws that caught five deletions and one midnight R1 violation on the way. The meeting isn't something to survive anymore — it's a demo. Go get some sleep before it.

Pre-meeting plan — revised under R1

Meeting is inside 24 hours. Tier 1 is only what she touches or looks at. All cover-byte work is
struck.

## Standing rules this plan carries (restated, because unnamed rules are the ones that break)

- **R1** — a published storage URL never receives new bytes. New composition = new hashed path +
  pointer update + publish. Writing back in place is the Ingram failure, and with one-year
  cacheControl it manufactures "images reverting" at scale.
- **R2** — the public browser never measures pixels.
- **Freeze** — no edits to `categoryFit.ts`, `productFit.ts`, `productPhysicalScale.ts`,
  `NormalizedProductImage`.
- **Dry-run discipline** — bulk/destructive writes get a manifest and a review pass first.
- No defect count exists for covers. The audit has not been run. Nothing claims one until it has.

## Tier 1 — before the meeting

### 1. Recover the orphaned rulings (do this first)

Twelve ruled products are unassigned in the DB, and post-C2 unassigned means hidden from public
browse. They were visible yesterday. This outranks every cover question.

`scripts/rekey-ghost-rulings.mjs`, one-off:

- For each of the 15 ghost workbook ids, normalized-title match its v4 ruling against DB rows.
- Exactly one match that is unassigned or `v1-seed` → apply the ruling with
  `taxonomy_review = { source:'human', reviewed:true, reviewed_by:<Darian>, reviewed_at:<today> }`.
- Zero or multiple matches → report, never write.
- Dry run → review the manifest → `--apply`.
- Rebake, then confirm the recovered products reappear on `/collection`.

Root cause for the record: the workbook was keyed on bake-time ids, and bake-time ids are not
stable. Future workbooks key on DB `rms_id`, with normalized-title match as the documented fallback.

Also correcting the record: OBED WOOD + BRASS TRAY exists in the DB, assigned and alive — the
completeness check ran against the baked catalog, not the DB. Absentee list is seven, not eight.

### 2. Taxonomy Studio at `/admin/taxonomy` (Task E)

Her taxonomy is the law of the site and she has no way to see or change it.

- Photo-first grid, fixed 5:4 contain boxes, one tile per family (~636).
- Collection dropdown loads categories from `taxonomy_collections` / `taxonomy_categories`, so an
  invalid pair is unrepresentable in the UI and rejected again server-side.
- Every change writes immediately through an admin-gated, audited server function; sets
  `taxonomy_review = { source:'human', reviewed:true, reviewed_by, reviewed_at }`.
- **✓ CONFIRM button on every unreviewed tile that already has both values set** — sets
  `reviewed:true` and stamps who/when, leaves the slugs untouched. Agreement is a first-class
  gesture, not a dropdown reselect. Without it the default CONFIRM queue is unworkable on open.
- **CONFIRM ALL** scopes to the currently visible filter and always skips `needs_owner` rows.
- Filter chips: NEEDS RULING / CONFIRM / ASK ADRIENNE / RULED / UNASSIGNED. **Counts render for
  every chip regardless of which filter is active.**
- Ledger strip: one tick per product, colored by state, drains as rulings land.
- Bulk assign via photo-tap selection + bottom bar.
- Default view: CONFIRM (16 waiting). Switches to UNASSIGNED after migration, per the approved plan.

### 3. Meeting doc (Task F)

`docs/taxonomy-open-questions.md` becomes the agenda, not a dev log. Policy questions only:
"Candlighting" spelling, Dining's narrowness (19 items), the retired products to confirm, and the
ASK ADRIENNE queue link. Item-level questions live in the studio, with photos.

### 4. "Images reverting" — verify the round trip, change nothing

One edit → publish → live, end to end, receipt kept and shown in the meeting. This is verification,
not remediation.

### 5. Baseline cover audit (measurement only, ~15 minutes)

Run `scripts/cover-audit.mjs`. Keep the CSV and HTML. This produces the first real defect count and
becomes the Phase 0 before-picture. It writes nothing to storage and changes no bytes.

## Struck — not before the meeting

- No running `normalize-covers.py`. No in-place cover writes. No cover bytes change at all.
- No tile-fit harness used as an acceptance gate — that exercises the frozen solver as verifier,
  which is the machinery this whole track exists to retire.
- No "normalized cover instead of a code tweak" remediation. That is Phase 2 output without Phase 2's
  verifier, review queue, or hash discipline.

When covers are normalized it happens under Frame Studio Phase 2 rules only: new hashed paths per R1,
verifier-gated, through the review queue.

## Tier 2 — right after the meeting

- Task D archive — Squarespace export into `docs/archive/` with a provenance README.
- Product drawer gets the studio's constrained collection/category dropdowns.
- Inquiry inbox inline reply.
- Collection overview og:image.
- New-product intake: confirm the unassigned → studio-queue loop with a real dry-run re-import.

## Tier 3 — structural, not a meeting item

Frame Studio Phase 2. Multi-session build. Not started in the next 24 hours.

## Technical notes

- Studio seeds from `inventory_items` (`collection_slug`, `category_slug`, `taxonomy_review`);
  thumbnails via `withCdnWidth(url, 400)`.
- Writes reuse the `updateItemImages` middleware pattern and revalidate the pair against the
  reference tables server-side; the UI constraint is convenience, not security.
- No export-as-save, no session-only state — the writes are the save.
- Rekey script is read-heavy and write-narrow: only the two slug columns plus `taxonomy_review`, only
  on rows that are unassigned or `v1-seed`.

## The day's closing lesson

The freeze held all day because it was named. R1 nearly didn't, because tonight it wasn't. Under
deadline, every standing rule gets restated in the approval — the plans that survive are the ones
that carry their own laws.
