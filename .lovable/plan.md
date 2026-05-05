## Goal

Use Squarespace's `?format=json-pretty` feed on every eclectichive.com category page to (1) fill the **99 remaining imageless products** and (2) upgrade single-image products to full **galleries** — in one dry-run-then-apply pass.

## Why this works

JSON feed returns the full collection per category — no lazy-load, no pagination, no HTML parsing. Each `items[]` entry exposes `title`, `urlId`, `assetUrl` (hero), and `items[].assetUrl` (gallery). Confirmed on `/textiles?category=Pillows` → 117 items vs 44 visible in HTML.

## Imageless inventory we're filling

```
pillows-throws  73   (already dry-run, 41 HIGH ready)
tableware       13
chandeliers      5
large-decor      4
styling          2
tables           2
                ── 99 total
```

## Feeds to fetch

```
/textiles?format=json-pretty                    → pillows-throws + furs-pelts
/textiles?format=json-pretty&category=Pillows
/textiles?format=json-pretty&category=Throws
/light?format=json-pretty                       → lighting + chandeliers + candlelight
/light?format=json-pretty&category=Chandeliers
/light?format=json-pretty&category=Candlelight
/tableware?format=json-pretty                   → tableware + serveware
/large-decor?format=json-pretty                 → large-decor + storage
/styling?format=json-pretty                     → styling
/lounge-tables?format=json-pretty               → tables (lounge)
/dining?format=json-pretty                      → tables (dining)
/cocktail-bar?format=json-pretty                → bars
/rugs?format=json-pretty                        → rugs
/lounge-seating?format=json-pretty              → seating (for gallery upgrades)
```

Dedupe items across feeds by `urlId`.

## Pipeline

```text
1. fetch        → /tmp/feeds/<slug>.json   (curl, 14 files)
2. normalize    → items[] = {title, urlId, hero, gallery[], categories[], tags[]}
3. dry-run      → scripts-tmp/site-json-rebind.json
                  • blanks    : matches for 99 imageless DB rows
                  • galleries : extra gallery URLs for products that already have a hero
4. review       → counts by category × bucket (HIGH ≥3 / MED 2 / TIE / NONE)
5. apply        → SQL UPDATE inventory_items SET images=<hero+gallery>
                  ONLY for HIGH (≥3) + non-tied
6. rebake       → bun scripts/bake-catalog.mjs
```

## Match rules (same as last pass, proven)

- Tokenize title, drop STOP words (`pillow`, `lumbar`, `oversize`, `set`, `with`, etc.)
- Score = count of shared distinctive tokens
- HIGH = score ≥3 AND no tie at top → apply
- MED / TIE / NONE → leave for owner review
- Gallery upgrade: when a product already has 1 image and the matched site item has more, append new URLs (dedupe, keep current image as position 0)

## Apply guardrails

- Single SQL transaction per category, one UPDATE per `rms_id`
- Never overwrite a non-Squarespace URL that's already in `images[0]`
- Dry-run JSON committed to `scripts-tmp/` first; you greenlight before any write
- No deletes, no DB schema changes

## Expected yield (rough)

| Category | Blanks filled | Gallery upgrades |
|---|---|---|
| pillows-throws | ~40 | ~30 |
| tableware | ~10 | ~80 |
| chandeliers | ~4 | ~10 |
| large-decor | ~3 | ~15 |
| styling | ~2 | ~40 |
| tables | ~2 | ~30 |
| (already-imaged: bars, seating, rugs, etc.) | — | ~150 |
| **Total** | **~60 blanks** | **~350 gallery URLs** |

## Deliverables

1. `scripts-tmp/site-json-rebind.json` — full dry-run by category × bucket
2. `scripts-tmp/site-json-summary.txt` — human-readable counts + sample matches
3. After your approval: SQL apply + rebake → live on Collection page
4. Memory updated to record JSON-feed pattern for future harvests

## Out of scope

- MED / TIE / NONE buckets — surfaced for you, not auto-applied
- Mirroring CDN URLs into our Storage bucket (they stay hot-linked from Squarespace, same as the existing `_squarespace/...` heroes)
- Per-product detail page scrape — only needed if JSON feed `additionalImages` is empty for a category, otherwise skipped
