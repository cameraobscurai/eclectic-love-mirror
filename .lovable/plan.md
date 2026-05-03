## Goal

Inside every category, products should appear in the same order the owner has curated on eclectichive.com — her "stars" at the top, the rest following her years-old composition. Cross-category order (sofas before tables before lighting, etc.) is already correct via owner browse-groups; we are only fixing **within-category** order.

This is a soft mirror, not a lock. We capture her order, use it as the primary in-category sort key, and let unmatched products fall to the tail by current keyword rank. If her site changes later, we just re-run the capture.

## Approach

```text
eclectichive.com/{category}     →  Firecrawl scrape (markdown)
                                       │
                                       ▼
                               parse titles in DOM order
                                       │
                                       ▼
              src/data/phase3/owner_site_order.json  (committed)
                                       │
                                       ▼
        scripts/build-phase3-catalog.mjs joins by normalized title
                                       │
                                       ▼
           phase3_catalog.json gains  ownerSiteRank: number | null
                                       │
                                       ▼
   sortProductsForCollection: ownerBrowseGroup → ownerSiteRank
                              → keyword type-rank (fallback) → title
```

Matched items sort by `ownerSiteRank` ascending. Unmatched items get `ownerSiteRank = null` and tail by the existing `getOriginalSiteTypeRank` keyword logic — exactly the current behavior, just demoted.

## Steps

**1. Capture script — `scripts/capture-owner-site-order.mjs` (new)**

- Iterates the 10 live category URLs:
  `/lounge`, `/lounge-tables`, `/cocktail-bar`, `/dining`, `/tableware`, `/light`, `/textiles`, `/rugs`, `/styling`, `/large-decor`
- Calls Firecrawl `scrape` (markdown format) per URL via the connector gateway.
- Parses headings (`# Product Title`) in document order — that's the grid order on Squarespace.
- Writes `src/data/phase3/owner_site_order.json`:
  ```json
  {
    "capturedAt": "2026-05-03T...",
    "categories": {
      "lounge": ["Indiwin Black Leather Sofa", "Brooklyn Plush Charcoal Sofa", ...],
      "lounge-tables": [...],
      ...
    }
  }
  ```
- Run on demand (not during build). Owner can ask "re-pull her order" anytime.

**2. Title normalization — small, deterministic**

- Lowercase, strip punctuation, collapse whitespace, drop trailing material words ("sofa", "chair") only when needed for fallback matching.
- First pass: exact normalized match. Covers the vast majority.
- Second pass: token-set match for minor wording differences.
- Anything still unmatched → reported in build output, gets `ownerSiteRank: null`.

**3. Bake `ownerSiteRank` into the catalog — `scripts/build-phase3-catalog.mjs`**

- Load `owner_site_order.json` if present (graceful: if missing, all items get `null` and current behavior holds).
- For each product: find its position in the live-site list for its category, write `ownerSiteRank` (0-indexed).
- Print summary: `lounge: 41/47 matched, 6 unmatched (titles listed)` so we can spot-check.

**4. Sort wiring — `src/lib/collection-sort-intelligence.ts`**

- Add `ownerSiteRank?: number | null` to the `CollectionProduct` interface (in `src/lib/phase3-catalog.ts` too).
- New compositeBy-Type rank:
  ```
  ownerBrowseGroup * 1e12
    + (ownerSiteRank ?? UNMATCHED_SENTINEL) * 1e6
    + keywordTypeRank * 1e3
    + scrapedOrder
  ```
  `UNMATCHED_SENTINEL` = a value larger than any real `ownerSiteRank` so unmatched items naturally tail matched ones.
- "By Type" stays the public sort label — its meaning just becomes "as the owner has it." Keyword type-rank survives as the fallback inside the unmatched tail (so e.g. unmatched sofas still come before unmatched chairs).

**5. Quick manual verification**

- Spot-check 2 categories in preview: Lounge and Lighting. First 6 cards on our `/collection?group=…` page should match the first 6 on her site.

## What this does NOT change

- Catalog count stays 876. No items are added, removed, or hidden.
- Owner browse-group order (Sofas first → Styling last) is untouched.
- A-Z / Newest / Oldest sorts are untouched.
- Category covers, image logic, reveal animation — all untouched.
- No DB migration, no admin UI. Pure data + sort change.

## Tooling needs

- **Firecrawl connector**: needs to be linked to the project before the capture script runs. I'll call `standard_connectors--connect` with `firecrawl` when we start. ~10 scrape calls, well under any free-tier limit.
- No Gemini, no Perplexity, no LLM. Title matching is deterministic with a printed unmatched list — better than LLM guesses for this.

## Files changed

- new: `scripts/capture-owner-site-order.mjs`
- new: `src/data/phase3/owner_site_order.json` (data, committed)
- edited: `scripts/build-phase3-catalog.mjs` (join + bake)
- edited: `src/data/phase3/phase3_catalog.json` (regenerated output)
- edited: `src/lib/phase3-catalog.ts` (interface field)
- edited: `src/lib/collection-sort-intelligence.ts` (sort key + rank composition)

## Acceptance check

Open `/collection?group=lounge` — first 6 tiles match the first 6 product titles on `eclectichive.com/lounge`. Same for `/cocktail-bar`, `/light`, `/styling`. Unmatched items still appear, just lower in their category. Console log from build confirms match rates per category.