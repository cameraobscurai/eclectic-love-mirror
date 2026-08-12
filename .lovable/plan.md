# Fix family-cover order overriding the admin

## Confirmed diagnosis

Hudson's database row is correct: `HUDSON_Render.png` is first in `images[]`, matching the admin.

The public catalog folds Hudson into a family tile. During that merge, `phase3-catalog.ts` classifies the selected cover as a variant image, excludes it from the lead-row cover pass, and promotes the next image (`20240803_003751155_iOS.jpg`) instead. That is the angled photo on the live tile.

This also violates the admin's own documented promise: "the group shot only stays first while it is first there" claims admin order authority the merge does not honor.

## Step 1 — Blast-radius report before anything ships

Changing family-cover precedence re-derives the cover for every family tile, not just Hudson.

- Produce a dry-run comparison across all family tiles: current precedence vs new precedence.
- List every tile whose `primaryImage` changes, with title, current cover filename, new cover filename.
- Write it to a receipt file rather than only printing it.
- Review that list before Publish. Ship either way, but knowingly and with the list recorded.

No code ships in this step.

## Step 2 — Extract the precedence logic, then fix it

The merge is not currently testable as a pure function, which is why the fixtures were deferred. Since this exact logic is being edited, the extraction rides along now.

- Extract family-cover precedence into a pure, exported function taking lead row images, member images, and baked group shots, returning ordered images.
- Change precedence so the lead row's first live image always wins the cover slot, even when it also appears in a member row.
- Keep existing family aggregation and filename-level deduplication so merged member photos remain available.

## Step 3 — Executing fixtures, not aspirational ones

Real tests against the extracted function:

- Hudson's shape: lead cover also present as a variant image, assert lead `images[0]` stays the public cover.
- A family where the lead has no live images, assert existing group-shot behavior is unchanged.
- Cache-version assertion: `updated_at` still wins over the bake-time version.

Wired into the existing test run so CI enforces them.

## Step 4 — Verification set

- Hudson: tile shows `HUDSON_Render.png`, and quick view/PDP order matches the admin.
- One other family tile: merged member photos still present and correctly ordered.
- One non-family tile: unchanged, proving the common path did not regress.

## Step 5 — Publish and record

- Publish so the live site reflects the fix.
- Screenshot Hudson's live tile into the receipts folder alongside the blast-radius list.

## Scope

Frontend catalog-merge defect. No database edit, no rebake, no photo replacement.
