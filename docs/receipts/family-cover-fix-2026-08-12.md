# Receipt — family-cover precedence fix (producer #5)

Date: 2026-08-12
Reported by: Darian, reproducing Adrienne's "photos don't stay changed"

## Defect

`inventory_items` row 3611 (HUDSON ROCK WALL WITH SHELVES) had
`HUDSON_Render.png` first in `images[]` — matching the admin drawer.
The live tile showed an angled event photo instead.

Cause: the family-tile merge in `phase3-catalog.ts` treated the lead row's
chosen cover as "variant-owned" (it also appears on a member row), skipped it
in the lead pass, and promoted the next photo. This contradicted the admin
drawer's own stated contract: "the group shot only stays first while it is
first there."

Not a publish gap, not a cache buster, not the upscaler. Fifth distinct
producer of the same complaint.

## Fix

- Extracted precedence into `src/lib/family-cover.ts` as a pure function.
- Lead row `images[0]` now always wins the cover slot; member and baked group
  shots follow, deduplicated by filename identity.
- `leadCoverWins: false` retained solely so the audit can diff old vs new.

## Blast radius (R7)

`bun run scripts/audit/family-cover-blast-radius.ts` — 85 family tiles,
**34 covers change**. Full list: `docs/receipts/family-cover-blast-radius.md`.
Reviewed before Publish; every change is the admin's own first photo winning.

## Tests

`tests/family-cover.test.ts` — 11 fixtures, including Hudson's exact shape,
the old-defect reproduction, no-live-lead fallback, dedup, and the
`updated_at` cache-version assertion from the image round-trip receipt.
Suite: 30/30 pass. `bun run rules:check`: all enforced rules pass.

## Verification

| Tile                                  | Type       | Result                                               |
| ------------------------------------- | ---------- | ---------------------------------------------------- |
| Hudson Rock Wall with Shelves         | family     | cover = `HUDSON_Render.png`; PDP order matches admin |
| Bellow 3'H White Corrugated Partition | family     | member photos intact, cover = lead's first           |
| Keaton Antique Floor Mirror           | non-family | unchanged                                            |

Screenshot: `docs/receipts/hudson-tile-after-2026-08-12.png`
