# Round-trip receipt — one edit, published, live

**Date:** 2026-08-11 · all timestamps UTC
**Subject:** Vespa Dark Wood Shelf (RMS 1929) — https://eclectichive.com/collection/vespa-dark-wood-shelf-1929
**Field edited:** Description ("Notes" on the product page)
**Method:** the real admin UI, signed in as an admin — no scripts, no database console, nothing Adrienne can't do herself.

This is verification, not remediation. No cover bytes were touched.

## Timeline

| Time (UTC) | Step | Evidence |
| --- | --- | --- |
| 22:03:45 | Live page captured BEFORE — no Notes block | `receipts/round-trip-1-before.png` |
| 22:05:09 | Edit typed in the admin drawer, **SAVE 1 CHANGE** clicked, drawer reported SAVED | `receipts/round-trip-0-admin-drawer.png` |
| 22:05:34 | **Publish to live site** clicked in /admin/photos → snapshot `catalog/overlay-2026-08-11T22-05-34-011Z.json`, 879 rows | manifest `publishedAt: 2026-08-11T22:05:34.011Z` |
| 22:12:15 | Live page captured AFTER — Notes shows the new text | `receipts/round-trip-2-after-live.png` |
| 22:12:35 | Original text restored in the drawer | — |
| 22:12:46 | Publish clicked again — **no code deploy** | — |
| 22:13:13 | Live page shows the original text again, **27 seconds** after Publish | `receipts/round-trip-3-restored.png` |

The return leg is the important one: 22:12:46 → 22:13:13 is a content edit reaching the public
site in under half a minute with nobody from engineering involved.

## What the receipt caught

The first pass FAILED, and that is why it was worth running.

The edit saved correctly and the published snapshot contained the new text — verified inside the
snapshot blob — but the live page still showed nothing. Cause, in `src/lib/phase3-catalog.ts`:
the published snapshot's text fields (name, notes, dimensions, stock, hidden/visible) were applied
**only to products created after the last catalog bake**. For every product that already existed —
which is all 636 — those fields were read from the baked file and the admin's edit was silently
discarded at merge time. Photos, order, focal point, and category all came through; words did not.

This is the mechanical half of "I saved it and the site didn't change." It was never a save
failure. It was a merge that dropped the field on the floor.

Fixed in the same session: the merge now takes name, notes, dimensions, stock and visibility
from the published snapshot when present, with the baked file as fallback, and re-filters hidden
products after merging so unpublishing a piece also reaches the public site immediately.

Both directions were then re-run end to end, which is the table above.

## What this proves for the meeting

- An admin edit reaches eclectichive.com through the admin UI alone.
- Publish is the gate: nothing moves until it is clicked, and everything moves when it is.
- Each publish writes an immutable timestamped snapshot; the manifest is the only pointer that
  changes, so readers never see a half-written catalog.
- Unpublishing a piece now hides it live on the next publish, without a rebake.
