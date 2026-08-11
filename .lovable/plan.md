# Road to "Adrienne stops wanting to hurt us"

Meeting is inside 24 hours. This plan is ordered by what she will actually touch or look at in that
meeting, not by engineering elegance. Everything below Tier 1 is post-meeting.

## Tier 1 — must exist before the meeting

### 1. Taxonomy Studio at `/admin/taxonomy` (Task E)
Her taxonomy is now the law of the site, but she has no way to see or change it. Right now the only
category editor is the legacy read-only field in the product drawer. Without this she has to email
spreadsheets again, which is the exact loop she is angry about.

- Photo-first grid, fixed 5:4 contain boxes, one tile per family (~636).
- Collection dropdown loads its categories from `taxonomy_collections` / `taxonomy_categories`, so
  an invalid pair is unrepresentable in the UI and rejected again server-side.
- Every change writes immediately through an admin-gated, audited server function; sets
  `taxonomy_review = { source:'human', reviewed:true, reviewed_by, reviewed_at }`.
- Filter chips with live counts: NEEDS RULING / CONFIRM / ASK ADRIENNE / RULED / UNASSIGNED.
- Ledger strip: one tick per product, colored by state, drains as rulings land.
- Bulk assign via photo-tap selection + bottom bar.
- Default view: CONFIRM queue (16 rows are already waiting).

### 2. Meeting doc (Task F)
`docs/taxonomy-open-questions.md` becomes the agenda, not a dev log. Policy questions only:
"Candlighting" spelling, Dining's narrowness (19 items), the 15 retired products to confirm, and
the ASK ADRIENNE queue link. Item-level questions live in the studio, with photos.

### 3. Her three standing complaints, verified live not assumed
- **Sizing consistency** — run the tile-fit harness across every collection slice and screenshot
  the outliers. Anything failing gets a normalized cover, not a code tweak.
- **Padded covers** — 44 known padded covers get run through `normalize-covers.py` (trim, center,
  write back in place). This is the real defect count; the audit script's 539 is noise.
- **Images "reverting"** — confirm one edit → publish → live round trip end to end and be able to
  show her the receipt in the meeting.

## Tier 2 — right after the meeting

- **Task D archive** — park the Squarespace export in `docs/archive/` with its provenance README.
- **Product drawer** gets the same constrained collection/category dropdowns as the studio, so
  taxonomy can be fixed from wherever she happens to be.
- **Inquiry inbox inline reply** — she currently has to leave the admin to answer a lead.
- **Collection overview og:image** — the one real SEO gap left in the fix queue.
- **New-product intake** — anything new from RMS lands unassigned and shows up in the studio queue.
  Confirm that loop with a real dry-run re-import before trusting it.

## Tier 3 — the structural fix, not a meeting item

Frame Studio Phase 2: bake framed cover derivatives so tiles stop being measured in the browser.
This is what permanently ends the sizing complaints. It is a multi-session build and should not be
started in the next 24 hours.

## What I will not do before the meeting

No batched perf work, no dead-code deletion, no touching `categoryFit.ts` / `productFit.ts` /
`productPhysicalScale.ts`. The Frame Studio freeze holds. Breaking the site the night before is a
worse outcome than an unfinished studio.

## Technical notes

- The studio seeds lead rows from `inventory_items` (`collection_slug`, `category_slug`,
  `taxonomy_review`), thumbnails via `withCdnWidth(url, 400)`.
- Writes reuse the `updateItemImages` middleware pattern and revalidate the pair against the
  reference tables server-side; the UI constraint is convenience, not security.
- No export-as-save and no session-only state — the writes are the save.
- Cover normalization writes back to the same storage path, originals to `originals-backup/`.
  Never a second cover URL.
