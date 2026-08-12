# Image round-trip receipt — cover change, admin → publish → live

Date: 2026-08-12 (UTC timestamps below are from the run log)
Row: `Darnell Color-Mixing LED Uplight` — rms_id `1625`, collection `lighting`,
`cover_framed_url` NULL (deliberately unframed; see "Framed rows" below).
Path: real admin UI in a browser session, same clicks Adrienne makes.

## Why this receipt exists

The earlier round-trip receipt proved **text** fields survive admin → publish →
live. Nobody had receipt-proven an **image** change end to end. Adrienne's
"photos don't stay changed" complaint had three suspects, all already convicted
and fixed (frozen cache-buster, overlay merge dropping fields, upscaler
injection). This run tests current health rather than re-diagnosing.

## Run 1 — found one live defect

| Time (UTC) | Step | Observed |
|---|---|---|
| 08:29:52 | Live PDP before | cover = `DARNELL LED Uplight 1.png?v=1786482743` |
| 08:30:10 | Admin: "Set as cover" on image 2, autosaved | row `updated_at` → 08:30:09 |
| 08:30:14 | Live PDP, saved but NOT published | cover unchanged — publish gate holds (R8) |
| 08:30:31 | Publish clicked, completed | overlay blob written |
| 08:30:37 | Live PDP after | cover = `DARNELL Uplight 2.png?v=1786482743` |

Cover swap: PASS. Publish gating: PASS.
**Defect:** `?v=` did not move. The buster came from the baked catalog's
`imagesVersion` (frozen at bake time); the published overlay carried no edit
timestamp. Harmless when the new cover is a different filename — fatal when a
photo is **replaced at the same storage URL**, because the CDN keeps serving the
old bytes. That is a live mechanism for "the photo reverted."

## Fix

- `publishCatalogOverlay` now snapshots `updated_at` as `images_version`
  (epoch seconds) per row.
- The catalog merge uses `max(live.images_version, baked.imagesVersion)` for the
  `?v=` stamp; the paginated fallback query carries it too.

## Run 2 — verification after the fix

| Time (UTC) | Step | Observed |
|---|---|---|
| 08:34:08 | Live PDP before | `DARNELL LED Uplight 1.png?v=1786482743` |
| 08:34:25 | Admin cover swap, autosaved | row `updated_at` → 08:34:22 |
| 08:34:30 | Live PDP, saved not published | unchanged — gate holds |
| 08:34:38 | Publish completed | new overlay blob |
| 08:35:50 | Live PDP after | `DARNELL Uplight 2.png?v=1786523662` |

New URL **and** new version stamp (`1786523662` = the row's live `updated_at`).
PASS.

Screenshots: `/tmp/browser/receipt/shots/E1_before.png`,
`E2_saved_not_published.png`, `E3_after_publish.png`.

## Notes for whoever reads this in a month

- **Propagation is up to ~60s.** The overlay manifest pointer is fetched with a
  minute-bucketed cache key. A publish is visible on the next minute boundary,
  not instantly. Run 1's "after" read landed inside the same bucket and briefly
  showed the pre-publish pointer — that is the cache doing its job, not a bug.
- **Framed rows are expected to lag.** If a row already has a
  `cover_framed_url` derivative, swapping `images[0]` will NOT change the tile:
  the derivative was composed from the old source and does not regenerate on
  Publish. That is the known re-frame-on-source-change loop owned by Frame
  Studio Phase 3 — not the reverting bug. This receipt deliberately used an
  unframed row.
- **Family rollups have no own PDP.** The first candidate (`GIDEON`, rms 2464)
  is rolled into a family lead in the baked catalog, so `/collection/<its slug>`
  is a 404 by design. Pick a row whose slug exists in `current_catalog.json`.

## State after the run

Both test rows were restored to their original cover order through the same
admin path and republished:

- 1625 → `DARNELL LED Uplight 1.png` (original)
- 2464 → `GIDEON Medium.png` (original)

## Verdict

Adrienne's "photos won't stay changed" complaint is **historical**, caused by
three now-fixed mechanisms (upscaler injection, overlay merge dropping fields,
frozen cache-buster — the last one closed by this receipt). The current admin →
publish → live image path works, with timestamps.
