# Gallery audit: pattern-based dedup + visual QA

## What we already know from the whack-a-mole

Three failure modes have shown up repeatedly:

1. **Byte-identical duplicates** — same file uploaded twice under different slot names (`01-image-asset.png` ≡ `02-NAME_0.png`). Already solved by the SHA1 bulk dedup pass — 56 images dropped from 36 items.
2. **Visually identical, byte-different** — same photo re-encoded or resized (Alumina, Akoya: first ≡ last). SHA1 misses these.
3. **Broken / corrupt mid-gallery image** — Bellissa had a torn render in the middle.

Hash-based dedup can't catch #2 or #3. We need a perceptual scan + a human eyeball pass.

## Plan

### 1. Perceptual hash pass (catches "looks the same")

Script `scripts/audit-gallery.mjs`:

- Pull all 281 multi-image, non-draft items.
- For each image URL, fetch bytes once, compute:
  - **dHash** (8x8 difference hash, 64-bit) — robust to resize/recompress.
  - **HTTP status + content-length** — flag 404, 0-byte, or `<2KB` images as broken.
  - **Decoded dimensions** — flag failures to decode (corrupt).
- Within each item, compare every pair of dHashes; Hamming distance ≤ 5 = duplicate candidate.
- Output `/tmp/gallery-audit.json` with per-item findings: `{rms_id, slug, duplicates: [[i,j,distance]], broken: [i], decode_failed: [i]}`.

Concurrency: 24-worker pool, same shape as the SHA1 pass. ~5–10 min for 281 items.

### 2. Auto-fix the unambiguous cases

A second script reads the manifest and emits one migration:

- **Drop perceptual duplicates** (distance ≤ 3, very confident) — keep the first occurrence.
- **Drop broken images** (HTTP 4xx/5xx, 0-byte, decode-failed).
- Leave distance 4–5 cases for human review (could be intentional similar shots).

Dry-run first → review counts → apply → re-bake catalog. Same workflow as before.

### 3. QA grid for the residual "feels off" cases

Build a temporary admin route `/admin/gallery-qa`:

- One row per item that still has >1 image after auto-fix.
- Renders all images at small size side-by-side with index numbers.
- Highlights suspected near-duplicates (distance 4–5) and any item where image 1 and image N are visually similar.
- Buttons: **Drop image N** / **Mark OK** — writes back to `inventory_items.images`.
- Default sort: most-suspicious first, so the eyeball pass terminates quickly.

This is where the "verify with your eyes" step happens — not by me scrolling 281 product pages, but by you triaging a dense grid sorted by suspicion score in a few minutes per page.

### 4. Re-bake catalog

`node scripts/bake-catalog.mjs` after each batch of QA decisions.

## Why not just have me eyeball it now

Reading 281 product galleries one at a time through the browser tool would burn enormous time and miss subtle dupes. The dHash pass surfaces every suspect in one pass; the QA grid lets you confirm/dismiss in seconds per item. Pattern recognition + your eyes, not mine doing both badly.

## Deliverables

- `scripts/audit-gallery.mjs` — perceptual scan
- `scripts/apply-gallery-audit.mjs` — generate UPDATE migration from manifest
- `src/routes/admin.gallery-qa.tsx` — QA grid (admin-gated, deletes after cleanup)
- One migration with the auto-fix UPDATEs
- Updated `current_catalog.json`

## Open question before I build

Want me to:
- **(a)** run the perceptual scan + auto-fix only (fastest, ~80% solution), or
- **(b)** also build the QA grid for full visual triage (one extra step, catches the rest)?
