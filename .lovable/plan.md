# Phase 3 Final Export Checkpoint

Freeze the clean Phase 3A + 3B canonical staging into a downloadable, reviewable artifact set. **No inventory writes. No reconciliation. No image assignment. No raw history deletion.**

## Source of truth (already exists, read-only)

- `public.scraped_products_final_canonical` — 877 rows, avg `final_confidence` 0.933, 876 with hero image, 18 categories, 45 LLM-repaired
- `public.scraped_product_images_final_canonical` — 1,129 image rows
- `public.llm_reextract_candidates_canonical` — 45 rows
- `public.scraped_product_pages_markdown` — raw markdown (kept untouched)

## Outputs

All written to `/mnt/documents/phase3_final_exports/` and surfaced as `<lov-artifact>` tags so you can download each.

### 1. `phase3_final_products.csv` (877 rows)
From `scraped_products_final_canonical`. Columns per spec. Mappings:
- `title` → `COALESCE(product_title_normalized, product_title_original, '(unknown)')`
- `extraction_method` → from view (`markdown` / `markdown+llm_repair`)
- `repaired_by_llm`, `final_confidence` → from view
- `missing_fields` → `still_missing_fields` (post-repair)
- `ambiguity_flags`, `warnings` → from underlying `scraped_products` joined on URL
- `needs_manual_review` → `true` if any of: `hero_image_url IS NULL`, `final_confidence < 0.70`, `product_title_normalized IS NULL`, URL is the known 404, or `still_missing_fields` non-empty after repair

### 2. `phase3_final_images.csv` (1,129 rows)
From `scraped_product_images_final_canonical` joined to canonical products for `product_url`, `category_slug`, `product_slug`. `image_source` already on view (`markdown` / `llm_repair`).

### 3. `phase3_manual_review_queue.csv`
Union of:
- The Broadway 32in 404 (`issue_type=source_404`)
- `final_confidence < 0.70` (`issue_type=low_confidence`)
- `hero_image_url IS NULL` (`issue_type=no_images`)
- Title still null (`issue_type=missing_title`)
- Non-empty `still_missing_fields` or warnings flagged for human (`issue_type=parse_warning`)

Deduped by URL, with one primary `issue_type` and an aggregated `issue_reason`. `recommended_action` is rule-based per issue type (e.g. "manual title entry", "exclude — source page removed", "manual image upload during reconciliation").

### 4. `phase3_category_summary.csv` (18 rows)
Aggregated from `scraped_products_final_canonical` grouped by `category_slug`:
counts for total, with/without images, with dimensions, with stocked qty, custom-order, avg confidence, manual review count.

### 5. `phase3_extraction_report.md`
Human-readable summary covering:
- Phase 3A markdown scrape (877/877 URLs, 989 Firecrawl credits, ~77% savings vs JSON)
- Phase 3B LLM repair (45/45 success, model `google/gemini-3-flash-preview`)
- Final counts (877 products, 1,129 images, 18 categories)
- Confidence distribution (buckets: ≥0.95, 0.85–0.95, 0.70–0.85, <0.70)
- Unresolved 404 (`/cocktail-bar/broadway-32in`)
- "Safe to trust" vs "needs manual review" boundaries
- Next recommended step: **reconciliation preview only** (dry-run match against `inventory_items` + RMS CSV + storage manifest, no writes)

## Implementation

Single Node script `scripts-tmp/phase3-final-export.mts`:
1. Use service-role Supabase client.
2. Pull each view in pages of 1000 (default Supabase cap) until exhausted.
3. Build CSVs in-memory with proper quoting (commas, quotes, newlines, array → `;`-joined).
4. Compute review queue + category summary in JS from already-fetched rows (avoids extra queries).
5. Write all 5 files into `/mnt/documents/phase3_final_exports/`.
6. Print final terminal summary block.

Run with `bun run scripts-tmp/phase3-final-export.mts`.

## Guardrails (explicit no-ops)

- No `INSERT` / `UPDATE` / `DELETE` against `inventory_items`, `product_images`, storage, `reconciliation_matches`, or any final tables.
- No new Firecrawl calls. No new LLM calls.
- No migrations. No schema changes. Views remain as-is.
- Raw `scraped_product_pages_markdown` preserved.

## Final terminal summary (printed at end)

- export path: `/mnt/documents/phase3_final_exports/`
- product count: 877
- image count: 1,129
- category count: 18
- manual review count: (computed)
- unresolved/404 count: 1
- average confidence: 0.933
- inventory writes performed: 0

## After approval

I'll switch to default mode, write the export script, run it, verify each CSV opens cleanly (header + sample rows), emit the 5 artifact tags, and stop. **Reconciliation is the next conversation, not this one.**
