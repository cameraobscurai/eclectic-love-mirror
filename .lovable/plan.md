## Goal

Re-order Collection items so each category flows in a curated tonal progression — darkest → lightest with chromatic items woven in by hue — backed by AI-tagged color data per product. Bulletproof = reproducible, reviewable, and overridable at every step. Nothing irreversible, nothing taste-dependent without a human gate.

## Architecture

```text
hero image  ─►  AI vision tag  ─►  pixel sampler verify  ─►  inventory_items.color_*
                                                                      │
                                            owner override (admin UI) ┤
                                                                      ▼
                                                          bake-catalog.mjs
                                                                      ▼
                                                  current_catalog.json (tonalRank)
                                                                      ▼
                                                      Collection "Tonal" sort
```

Two independent signals (AI + pixel math) cross-check each other. Owner override always wins.

## Step 1 — Schema (migration)

Add to `inventory_items`:

- `color_hex text` — primary dominant hex
- `color_hex_secondary text` — second dominant (for patterned items)
- `color_lightness numeric` — CIELAB L*, 0–100
- `color_hue numeric` — 0–360, null for neutrals (chroma < 8)
- `color_chroma numeric` — 0–130
- `color_family text` — enum-ish: `black|charcoal|brown|tan|cream|white|grey|red|orange|yellow|green|blue|purple|pink|metallic-warm|metallic-cool|multi`
- `color_temperature text` — `warm|neutral|cool`
- `color_confidence numeric` — 0–1, model self-reported
- `color_source text` — `ai-vision|pixel-extract|manual|merged`
- `color_tagged_at timestamptz`
- `color_locked boolean default false` — owner-set; tagger skips locked rows
- `color_notes text` — free-text override reason

Trigger: when `images[1]` changes, set `color_tagged_at = NULL` (unless `color_locked`) so the next tagger run re-processes it. RLS unchanged.

## Step 2 — Two-signal tagging pipeline

`scripts/tag-colors.mjs` runs in three phases per product:

**2a. Pixel extract (cheap, deterministic).** Download hero image, run k-means on pixels with edge/background masking (drop pixels within 8px of frame, drop pixels matching corner-sample background within ΔE<5). Returns top 3 clusters with weights. Library: `sharp` is Worker-incompatible but this script runs in Node (sandbox), so `sharp` + `node-vibrant` or `colorthief` is fine. **Decision: use `sharp` for resize + `colorthief` for palette.** This gives us a ground-truth swatch independent of the AI.

**2b. AI vision call.** Send same hero to `google/gemini-3-flash-preview` via Lovable AI Gateway with structured tool-calling. Prompt:

> "You are a textile and furniture stylist tagging items for a tonal merchandising grid. Identify the *material color* of the primary object — the upholstery, wood, ceramic, or metal a designer would key off when styling. Ignore: background, props, shadows, reflections, packaging. Return CIELAB lightness (0=black, 100=white), hue 0–360 (null if chroma<8), chroma 0–130, color family from the fixed list, temperature warm/neutral/cool, and confidence 0–1. If the item is patterned or multi-color, return the dominant tone and set family=multi only if no single tone covers >50% of the object."

Tool schema enforces shape; no JSON parsing of free text.

**2c. Reconcile.** Compare AI hex vs pixel-extract top cluster in CIELAB ΔE:
- ΔE < 10 → trust AI, source=`merged`, confidence stays
- ΔE 10–25 → trust AI but flag `needs_review`, confidence × 0.7
- ΔE > 25 → write both, mark `needs_review=true`, source=`ai-vision`, confidence × 0.4

Concurrency 4, 1.2 req/sec to stay under rate limits. Auto-retry 429 with exp backoff. Cost ≈ 828 Gemini Flash vision calls for backfill, well under free tier.

**2d. Dry-run mandatory.** Script writes `/tmp/color-tag-manifest.json` with every proposed row + both signals + ΔE. Owner reviews via `/admin/colors` (Step 4) before any DB write. `--apply` flag required for the second pass.

## Step 3 — Catalog bake

Update `scripts/bake-catalog.mjs`:

- Select new color columns.
- Pass through to each product.
- Compute `tonalRank` server-side (so client does no math):

```text
tonalRank = familyBucket * 1000 + lightness * 10 + hueOffset
```

Where `familyBucket` orders `black → charcoal → brown → tan → cream → white` for neutrals (0–5), then chromatic families woven in by lightness band (warm reds/oranges grouped with browns, cool blues/greens grouped with charcoals). `hueOffset` is a small ROYGBIV nudge within a lightness band so red→orange→yellow→green→blue→purple flows naturally.

Add to `CollectionProduct`: `colorHex`, `colorLightness`, `colorHue`, `colorFamily`, `colorTemperature`, `tonalRank`, `colorNeedsReview`.

## Step 4 — `/admin/colors` QA grid (the bulletproofing layer)

New route. Required before Tonal sort goes live. Features:

- Grid of every product: thumbnail, detected swatch chip, family label, lightness number, confidence, ΔE flag.
- Filters: `needs_review`, `family=...`, `low confidence`, `untagged`.
- Click row → side panel with:
  - Both signals visible (AI hex + pixel hex)
  - Color picker for manual override (writes `color_source=manual`, `color_locked=true`)
  - Quick-pick swatches for the 16 families
  - "Re-tag" button (single-row AI re-run)
- Bulk actions: "lock selected", "re-tag selected", "mark family for selected".
- Live preview strip: shows the active category sorted by current tonal data, so the owner sees the gradient updating as they edit.

Server functions for all writes use `requireSupabaseAuth` + `has_role(uid,'admin')`. No bulk write without the manifest review pattern.

## Step 5 — Sort mode rollout (staged)

Phase A — preview only:
- Add `"tonal"` to `SortMode` in `collection-sort-intelligence.ts`.
- Add comparator: `tonalRank ASC`, tie-break on `ownerSiteRank` then `title`.
- Add "Tonal (preview)" option to the sort dropdown. Default stays "By Type".

Phase B — owner approves:
- Owner reviews ≥100 items in `/admin/colors`, locks any she wants frozen.
- Re-bake.
- Switch default sort to Tonal per category (or globally — owner decision).
- Drop "(preview)" label.

Phase C — drift protection:
- DB trigger nulls `color_tagged_at` when hero changes (already in Step 1).
- Cron-style server function (manual trigger from `/admin`) re-tags any row with `color_tagged_at IS NULL AND NOT color_locked`. Keeps gradient accurate as new inventory lands.

## Edge cases handled

| Case | Mitigation |
|---|---|
| Styled scene shot (rug under chair) | Pixel sampler + AI cross-check; ΔE>25 flags for review |
| Patterned pillow / rug | Dominant + secondary stored; `color_family=multi` if no >50% tone; sorts by dominant lightness |
| Brass / metallics | Dedicated families `metallic-warm` / `metallic-cool`, slot between cream and white |
| Cutout on white background | Background masker drops corner-matched pixels before k-means |
| Same hex two different materials | Owner override + `color_notes` for the stylist's reason |
| New item added later | Trigger nulls tag, incremental tagger picks it up, locked rows skipped |
| AI hallucinates color | Pixel signal contradicts → flagged; owner sees both in QA grid |
| Owner disagrees with AI | Manual override locks the row permanently |

## Cost / risk ledger

- Tagging cost: ~828 Gemini Flash vision calls, one-time + small incrementals. Within free tier.
- Reversibility: every column nullable; drop-and-rerun safe; sort default toggle is a single line.
- Destructive ops: zero. All writes are additive, dry-run gated, owner-reviewable.
- Performance: client does no color math; sort key pre-computed at bake time. Zero runtime cost on Collection page.

## Deliverables

1. Migration adding 11 color columns + image-change trigger.
2. `scripts/tag-colors.mjs` with `--dry-run` (default) and `--apply` modes, two-signal reconcile.
3. Updated `scripts/bake-catalog.mjs` carrying color fields + computed `tonalRank`.
4. Updated `CollectionProduct` type + `tonal` sort comparator in `collection-sort-intelligence.ts`.
5. `/admin/colors` route: QA grid, side panel override, bulk actions, live preview strip.
6. Server functions for tag/retag/lock/override (admin-gated).
7. Sort dropdown gets "Tonal (preview)" → owner approves → becomes default.

## Out of scope (explicitly deferred)

- Per-image multi-color gradient sort (treating one tile as several).
- Cross-category whole-grid ribbon (each category still sorts independently in v1).
- Automatic seasonal palette themes (winter vs summer reorder).
