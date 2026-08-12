# Frame Studio 2.4 — batch bake (`scripts/bake-frames.mjs`)

One new script. It renders, verifies, uploads, and writes rows for a whole
collection at a time, then stops. Nothing it does reaches the public site.

Scheduling stands: this is an afternoon task, not a pre-meeting one. Bake this
afternoon, review the sheet tonight, Publish tomorrow morning.

## What it is

`bun run scripts/bake-frames.ts --collection lighting [--category chandeliers]
[--limit N] [--force] [--apply]`

Dry run by default (R7). Same modules as `frame-one`: `frame-render` for
pixels, `frame-hash` for identity, `frame-engine` for the rules. No new
composition logic — if the two ever disagreed, a path could mean two different
images, which is the failure R1 exists to prevent.

## The four pre-flight items, as behaviour

**1. Source selection is stated, not assumed.** The framer composes the photo
the site is actually showing. It resolves the cover through the same precedence
the runtime merge uses — live row images win when non-empty, baked catalog is
the fallback, empty/null never blanks a tile — and for family rows it applies
the same lead-row/group-shot ordering, so a family tile is framed from its joint
cover rather than a variant's single shot. Every image edit Adrienne has
published is therefore in the derivative. Rows whose resolved cover is empty are
skipped and listed as `NO_SOURCE`.

**2. The bake never publishes (R8).** `--apply` renders, verifies, uploads both
sizes at the hashed path, and writes `cover_framed_url` + `cover_framed_meta`.
It does not touch the overlay and does not call publish. Final line of output,
verbatim: `applied N rows; NOT LIVE until a human clicks Publish`. For the trust
slice that makes lighting go live as one deliberate event.

**3. Advisories record, failures queue, the queue is a file.** `SRC_UPSCALED`
and `TIGHT_CROP` are written into `cover_framed_meta.advisories` and the run
continues. Verifier FAILs produce no bytes and no row write; they land in
`docs/frame-queue-{collection}.md` — dated, one row per product, columns:
title · rms_id · category · failure codes · measure method · source URL ·
suggested action (`replace source photo` for V4, `manual frame` for V1/V2/V3).
Written on both dry and applied runs so the list survives the terminal and
Phase 3's studio can read it later.

**4. A failure rate in lighting is the point.** Lighting is 45 rows, 29 of them
carrying an upscaled cover — the opaque-background, invented-shadow inputs. Some
will fail V4 and queue for source replacement instead of being framed. That is
the verifier refusing to publish the hallucinated shadows, not the bake
underperforming. The queue is the receipt.

## Run report

Console summary plus `docs/receipts/bake-{collection}-{date}.md`:
totals, pass / queued / skipped / deduped, advisory histogram, and a contact
sheet — a plain HTML page of every framed 600w derivative at tile size in
editorial order, so the review is a picture, not a table.

## Safety

- Idempotent: a row whose `cover_framed_meta.hash16` already matches the
  recomputed hash is skipped as `UNCHANGED` unless `--force`.
- Uploads keep `upsert:false`; a 409 is dedup success, not an error (R1).
- Concurrency capped (4), source fetches retried once, one failed row never
  aborts the run.
- No writes to `images`, `upscaled_cover_url`, taxonomy, or the overlay.

## Done when

`--collection lighting` dry-runs clean end to end, `--apply` writes rows,
`docs/frame-queue-lighting.md` exists with the real failures in it, the contact
sheet renders, and `/collection?group=lighting` looks unchanged until Publish.

## Not in this task

2.5's trust slice (Cinsere and Hacier at matched scale, screenshot in
`docs/receipts/`), the studio UI, and any change to `categoryFit.ts`,
`productFit.ts`, `productPhysicalScale.ts`, or `NormalizedProductImage.tsx` —
the Phase 5 freeze holds.
