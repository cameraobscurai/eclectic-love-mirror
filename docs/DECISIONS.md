# Eclectic Hive — Project Decisions

This document is the acceptance bar for every future production pass. Read it before starting work; verify against it before declaring "done".

---

## Brand register

Editorial fashion / art direction, not event-rental marketing.

Reference set:
- **Prada** · **Casa Carta** · **Saol Display** (editorial feel) · **Aesence** (restrained visual systems)
- *Two parts luxe, one part regal, and a dash of edge.*

Eclectic Hive is **editorial restraint with image texture, detail, and edge** — not sterile minimalism.

Use white structure. Use strong type. Use real imagery. Use sensual detail crops. Use thin dividers. Use numbered sequences. Keep content truthful.

---

## Site IA — locked

```
HOME
ATELIER by THE HIVE
HIVE SIGNATURE COLLECTION
THE GALLERY
CONTACT
```

No new top-level routes. No nav renames. No inventory categories in the global nav.

## Brand hierarchy — locked

- **Eclectic Hive** = parent umbrella
- **Atelier by The Hive** = design + fabrication
- **The Hive Signature Collection** = inventory wing
- **The Gallery** = selected project proof

---

## Page roles — locked

| Page | Role | Don't make it do |
|------|------|------------------|
| Home | Single-screen brand entry. Intrigue. | Long brand story, stacked sections, fake video |
| Atelier | Operational proof: team, scope, studio, fabrication, warehouse | Services-page voice, fake roster, full FAQ |
| Collection | Working inventory archive | Cards, prices, cart language, decorative letterform hero, overview bands, category rail, right index |
| Gallery | Selected project proof — editorial portfolio | Dark template, masonry dump, fake projects, PDF imagery without rights |
| Contact | Conversion + FAQ home | Heavy cinematic behavior |

**Final principle:** *Homepage creates intrigue. Collection proves inventory. Atelier proves capability. Gallery proves taste. Contact converts. Don't make every page do every job.*

---

## Collection rule (verbatim)

> Collection is locked at the IA/data level, not exempt from UX hardening. Any future pass must preserve the working archive but still verify scroll, sticky, loading, filter, Quick View, mobile sheet, and accessibility behavior.

**Locked:**
- Public-ready count = **876**
- Broadway 32in remains excluded
- Auction-house archive model: left rail, central pure-white object grid, one utility row, mobile bottom sheet
- Quick View, Add to Inquiry, Load More
- Sort options: By Type / A-Z only

**Permitted future fixes** (no IA, no data, no visual redesign):
scroll restoration · results-top scroll timing · sticky offsets · image skeleton timing · mobile sheet scroll lock · Quick View scroll preservation · focus restoration · reduced-motion handling · accessibility bugs.

---

## Gallery rule (verbatim)

> Gallery layout first. Real project media later. No fake bridge content. The empty-state page must still feel designed — never use developer/admin language like "No projects found" or "Add projects".

**Empty-state copy (locked):** *"Selected projects are being prepared."*

**Forbidden until owner provides real assets:**
- fake project names
- fake image URLs
- fake `/gallery/$slug` subroutes
- PDF imagery used as production assets
- stock assets
- placeholder copy in production UI

When real entries arrive, populate the typed `PROJECTS` array in `src/routes/gallery.tsx`. Same array drives both the editorial section and a future index table.

---

## Atelier rule

Tagline locked: *Imagined. Refined. Crafted.*

If `TEAM` array is empty, the Team section renders no roster — only a short team-philosophy paragraph. **Never render fake "Name · Role" rows.**

If `SPACE_IMAGES` array is empty, the Creative Space section is text-only. **No stock photography.**

No FAQ on Atelier. Compact 3–4 question teaser allowed only if it does not interrupt the page.

---

## Homepage rule

Desktop must not vertically scroll. Locked to 100dvh, footer hidden on desktop home.

Hero may use a quiet looping muted video **only when owner-approved footage exists**. Until then, current still/atmosphere stays. **Never fake video.**

Mobile may scroll if needed.

---

## Contact rule

FAQ lives here, not on Atelier or Collection. Anchor: `/contact#faq`.

Items (condensed from owner's deck FAQ A–E):
1. What we offer
2. How to begin a proposal
3. Travel
4. Minimums

---

## Route safety

Old routes (`/faq`, `/process`) redirect rather than 404 to protect cached/external links:
- `/faq` → `/contact#faq`
- `/process` → `/atelier`

Do not delete routes that have inbound links (footer, nav, sitemap, prior deployments) without first replacing them with a redirect.

---

## Design tokens

Cream `#f5f2ed`, charcoal `#1a1a1a`, sand `#d4cdc4`. Cormorant Garamond (Saol stand-in) for display, Inter for body.

Archive-specific tokens live in `src/styles.css` under `--archive-*`. Change a token there and the whole archive page follows.

---

## Production readiness

**Brand alignment is not production readiness.** Production readiness means the beautiful pages and the working archive survive real user behavior without scroll jumps, fake content, broken links, or mobile traps.

Both must hold:
- Pages look right at desktop and mobile
- Interactions don't jump, clip, or trap the user
- No fake content, no broken inbound links
- All locked invariants above remain true

---

# Engineering rules

Added 2026-08-12. These existed only in chat until now, which is why they were
dropped from five plan rewrites in one day. Each has an id, a date, the rule,
and the receipt — the failure that caused it. Plans cite the id. Lint errors
cite the id. `bun run rules:check` enforces the mechanisable ones.

## R1 — No new bytes at a published image URL

**Rule.** Once an image URL is public, it never receives different bytes. A
changed image is a new path (content-hashed), and the row is repointed. Storage
writes in `scripts/**` and `src/**` may not pass `upsert: true` on an image
upload.

**Not covered:** pointer/metadata writes. The overlay snapshot
(`photos-admin.functions.ts`, `catalog/manifest.json`) is *supposed* to
overwrite — it is a pointer, not content. Allowlisted with a comment citing R1.

**Receipt.** 2026-08-11: the AI upscaler wrote greyish-backdrop covers over 633
live image URLs in place. Every cached copy, every CDN edge, every prior
screenshot became inconsistent, and the only way back was re-deriving from
`originals-backup/`. Nearly repeated at midnight on the normalize pass.

**Enforced by:** `bun run rules:check` (allowlist in `scripts/audit/rules-check.mjs`).

## R2 — The public browser never measures pixels

**Rule.** Public routes decide layout from baked numbers, never from a
`<canvas>` read of a decoded image. Measurement happens once, at ingest, on the
server. Once Frame Studio Phase 5 lands, nothing under `src/routes/collection*`
or `src/components/collection/*` may import `NormalizedProductImage`,
`categoryFit`, `useImageSilhouette`, or `productPhysicalScale`.

**Receipt.** Eight months of live solver tuning. Every fix moved the defect
somewhere else because the system was asked to make heterogeneous photos look
uniform, live, from inside the browser — a bet against its own inputs.

**Enforced by:** `bun run rules:check` in baseline mode. The current importer
count is frozen; it may fall, never rise. It becomes a hard ban at Phase 5.

## R3 — Derivatives are verifier-gated

**Rule.** No generated image reaches the public site without passing the
measurement verifier that produced it. A derivative that fails verification is
quarantined for review, never published as a best-effort.

**Receipt.** 2026-08-11: upscaled covers shipped straight to production and
introduced ~235-luminance backdrops on a pure-white grid. Nothing checked them
between generation and display.

## R4 — The studio composes; it never retouches

**Rule.** Testable line: if the operation changes *which pixels exist*, it is
retouching and out of scope. If it changes *where existing pixels land on the
canvas*, it is composition and in scope. Framing, scale, baseline, rotation are
in. Background removal by hand, colour, shadow, cloning, filters are out — a
cover needing those has a wrong source photo and gets replaced.

**Exception:** batch background removal at *ingest* is a framer step, not an
editor feature. Automated, verifier-gated (R3), never a hand tool.

**Receipt.** `docs/frame-studio-phase3-editor-amendment.md`. Two non-technical
users editing destructively with no undo stack is a support load, not a feature.

## R5 — Canvas aspect equals tile aspect

**Rule.** Baked cover canvas matches the aspect of the tile that renders it.
Object placement inside that canvas is the only free variable.

**Receipt.** Square 1536×1536 canvases into non-square tiles reintroduced the
per-shelf mass drift the canvas was built to remove.

## R6 — RMS owns RMS fields; humans own declared fields

**Rule.** `scripts/import.mjs` may never write `collection_slug`,
`category_slug`, `taxonomy_review`, or `images` on an existing row. New RMS
products insert with NULL taxonomy so they surface in the admin Unassigned
queue. RMS owns title, stock, dimensions, group.

**Receipt.** Unassigned products are out of nav. A routine re-import that
clobbered declared columns would pull live products off the site with no error
anywhere, and no one would notice for weeks.

**Enforced by:** `node scripts/audit/intake-loop-test.mjs --apply` — drives the
real importer against a synthetic two-row workbook. 13/13 as of 2026-08-12.

## R7 — Dry-run by default; no defect count before measurement

**Rule.** Every destructive or bulk script defaults to dry-run, emits a
prediction/manifest file, and verifies actuals against that prediction on
`--apply`. No plan states a defect count that has not been measured by a script
whose grading rules are written down.

**Receipt.** The cover audit reported 539 defects; measured properly it was 44
padded covers — `MEASURE_FAIL` was flagging valid tight crops. Three plans were
built on the wrong number.

## R8 — Publish is the only path from admin edit to live

**Rule.** Admin edits reach the public site through the published overlay
snapshot and nothing else. The merge cache TTL and manifest cache-buster define
the visible delay, and that delay is a written number with a test, not folklore.

**Receipt.** `docs/round-trip-receipt.md`. Overlay text fields were silently
dropped in the merge for existing products; the edit appeared to save and never
appeared live.

## R9 — A retired column is nulled, guarded, and dated

**Rule.** When a column stops being read, it gets all four in the same change:
its values nulled, its producers moved to `scripts/retired/`, a CI guard that
fails on any write to it, and a drop date in the deletion tracker
(`docs/taxonomy-open-questions.md`). Three of the four is how a dead column
stays alive for a year.

**Receipt.** `inventory_items.upscaled_cover_url`. Nothing had read it since
2026-08-11, yet 34 rows still carried it and two scripts could still write it —
the same machinery that put invented shadows on cutout photos. Nulled, retired,
guarded (R9 in `scripts/audit/rules-check.mjs`), drop dated 2026-08-21.
