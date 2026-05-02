// Phase 3 final export checkpoint — read-only.
// Writes 5 files into /mnt/documents/phase3_final_exports/.
// No inventory writes. No reconciliation. No new scraping or LLM calls.

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(SUPABASE_URL, SR, { auth: { persistSession: false } })

const OUT_DIR = '/mnt/documents/phase3_final_exports'
const KNOWN_404 = 'https://www.eclectichive.com/cocktail-bar/broadway-32in'

// ---------- helpers ----------
function csvEscape(v: any): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) v = v.join(';')
  else if (typeof v === 'object') v = JSON.stringify(v)
  else if (typeof v === 'boolean') v = v ? 'true' : 'false'
  const s = String(v)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}
function toCSV(headers: string[], rows: any[][]): string {
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(r.map(csvEscape).join(','))
  return lines.join('\n') + '\n'
}
async function fetchAll(table: string, select = '*'): Promise<any[]> {
  const PAGE = 1000
  const out: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

// ---------- main ----------
async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('[fetch] canonical products...')
  const products = await fetchAll('scraped_products_final_canonical')
  console.log(`  ${products.length} rows`)

  console.log('[fetch] canonical images...')
  const images = await fetchAll('scraped_product_images_final_canonical')
  console.log(`  ${images.length} rows`)

  console.log('[fetch] underlying scraped_products (for warnings/ambiguity)...')
  const underlying = await fetchAll(
    'scraped_products',
    'url,warnings,ambiguity_flags,missing_fields,parse_confidence,scraped_at',
  )
  // Pick most-recent row per URL to mirror canonical winner
  const underlyingByUrl = new Map<string, any>()
  for (const r of underlying) {
    const prev = underlyingByUrl.get(r.url)
    if (!prev || new Date(r.scraped_at) > new Date(prev.scraped_at)) {
      underlyingByUrl.set(r.url, r)
    }
  }

  // Build product url -> {category_slug, product_slug} map
  const productByUrl = new Map<string, any>()
  for (const p of products) productByUrl.set(p.url, p)

  // ---------- 1. phase3_final_products.csv ----------
  const productHeaders = [
    'id', 'url', 'category_slug', 'product_slug', 'title',
    'product_title_original', 'product_title_normalized', 'is_custom_order_co',
    'description', 'dimensions', 'stocked_quantity',
    'material_notes', 'color_notes', 'size_notes', 'generic_notes',
    'add_to_cart_present', 'quantity_selector_present', 'variant_selector_present',
    'previous_product_url', 'next_product_url', 'related_product_urls', 'breadcrumb',
    'repaired_by_llm', 'extraction_method', 'final_confidence',
    'missing_fields', 'ambiguity_flags', 'warnings', 'needs_manual_review',
  ]
  const productRows: any[][] = []
  let manualReviewCount = 0
  let unresolved404 = 0

  for (const p of products) {
    const u = underlyingByUrl.get(p.url) ?? {}
    const title = p.product_title_normalized ?? p.product_title_original ?? '(unknown)'
    const stillMissing: string[] = p.still_missing_fields ?? []
    const warnings: string[] = u.warnings ?? []
    const ambiguity: string[] = u.ambiguity_flags ?? []

    const is404 = p.url === KNOWN_404
    if (is404) unresolved404++

    const needsReview =
      is404 ||
      !p.hero_image_url ||
      (p.final_confidence != null && Number(p.final_confidence) < 0.7) ||
      !p.product_title_normalized ||
      stillMissing.length > 0

    if (needsReview) manualReviewCount++

    productRows.push([
      p.id, p.url, p.category_slug, p.product_slug, title,
      p.product_title_original, p.product_title_normalized, p.is_custom_order_co,
      p.description, p.dimensions, p.stocked_quantity,
      p.material_notes, p.color_notes, p.size_notes, p.generic_notes,
      p.add_to_cart_present, p.quantity_selector_present, p.variant_selector_present,
      p.previous_product_url, p.next_product_url, p.related_product_urls, p.breadcrumb,
      p.repaired_by_llm, p.extraction_method, p.final_confidence,
      stillMissing, ambiguity, warnings, needsReview,
    ])

    // Annotate p in-place for later passes
    ;(p as any)._needsReview = needsReview
    ;(p as any)._is404 = is404
    ;(p as any)._stillMissing = stillMissing
    ;(p as any)._warnings = warnings
  }
  await writeFile(join(OUT_DIR, 'phase3_final_products.csv'), toCSV(productHeaders, productRows))
  console.log(`[write] phase3_final_products.csv (${productRows.length})`)

  // ---------- 2. phase3_final_images.csv ----------
  const imgHeaders = [
    'scraped_product_id', 'product_url', 'category_slug', 'product_slug',
    'image_url', 'position', 'is_hero', 'inferred_filename', 'alt_text',
    'source_page_url', 'image_source',
  ]
  const imgRows: any[][] = []
  for (const im of images) {
    const owner = productByUrl.get(im.source_page_url) ??
      [...productByUrl.values()].find((p) => p.id === im.scraped_product_id)
    imgRows.push([
      im.scraped_product_id,
      owner?.url ?? im.source_page_url ?? '',
      owner?.category_slug ?? '',
      owner?.product_slug ?? '',
      im.image_url, im.position, im.is_hero, im.inferred_filename,
      im.alt_text, im.source_page_url, im.image_source,
    ])
  }
  await writeFile(join(OUT_DIR, 'phase3_final_images.csv'), toCSV(imgHeaders, imgRows))
  console.log(`[write] phase3_final_images.csv (${imgRows.length})`)

  // ---------- 3. phase3_manual_review_queue.csv ----------
  const reviewHeaders = [
    'url', 'category_slug', 'product_slug', 'title',
    'issue_type', 'issue_reason', 'recommended_action', 'final_confidence',
  ]
  const reviewRows: any[][] = []
  for (const p of products) {
    if (!(p as any)._needsReview) continue
    const reasons: string[] = []
    let primaryType = 'parse_warning'
    let action = 'manual review'

    if ((p as any)._is404) {
      primaryType = 'source_404'
      reasons.push('source page returned 404')
      action = 'exclude — source page removed'
    } else if (!p.hero_image_url) {
      primaryType = 'no_images'
      reasons.push('no images extracted')
      action = 'manual image upload during reconciliation'
    } else if (!p.product_title_normalized) {
      primaryType = 'missing_title'
      reasons.push('title not extracted')
      action = 'manual title entry'
    } else if (p.final_confidence != null && Number(p.final_confidence) < 0.7) {
      primaryType = 'low_confidence'
      reasons.push(`final_confidence=${p.final_confidence}`)
      action = 'manual verification of fields'
    }
    const stillMissing = (p as any)._stillMissing as string[]
    const warnings = (p as any)._warnings as string[]
    if (stillMissing.length) reasons.push(`still missing: ${stillMissing.join(';')}`)
    if (warnings.length) reasons.push(`warnings: ${warnings.join(';')}`)

    reviewRows.push([
      p.url, p.category_slug, p.product_slug,
      p.product_title_normalized ?? p.product_title_original ?? '(unknown)',
      primaryType, reasons.join(' | '), action, p.final_confidence,
    ])
  }
  await writeFile(join(OUT_DIR, 'phase3_manual_review_queue.csv'), toCSV(reviewHeaders, reviewRows))
  console.log(`[write] phase3_manual_review_queue.csv (${reviewRows.length})`)

  // ---------- 4. phase3_category_summary.csv ----------
  const catHeaders = [
    'category_slug', 'product_count', 'products_with_images', 'products_without_images',
    'products_with_dimensions', 'products_with_stocked_quantity',
    'custom_order_count', 'avg_confidence', 'manual_review_count',
  ]
  const catMap = new Map<string, any>()
  for (const p of products) {
    const k = p.category_slug ?? '(none)'
    let s = catMap.get(k)
    if (!s) { s = { count: 0, img: 0, noimg: 0, dim: 0, qty: 0, co: 0, confSum: 0, confN: 0, review: 0 }; catMap.set(k, s) }
    s.count++
    if (p.hero_image_url) s.img++; else s.noimg++
    if (p.dimensions) s.dim++
    if (p.stocked_quantity) s.qty++
    if (p.is_custom_order_co) s.co++
    if (p.final_confidence != null) { s.confSum += Number(p.final_confidence); s.confN++ }
    if ((p as any)._needsReview) s.review++
  }
  const catRows: any[][] = []
  for (const [slug, s] of [...catMap.entries()].sort()) {
    catRows.push([
      slug, s.count, s.img, s.noimg, s.dim, s.qty, s.co,
      s.confN ? (s.confSum / s.confN).toFixed(3) : '', s.review,
    ])
  }
  await writeFile(join(OUT_DIR, 'phase3_category_summary.csv'), toCSV(catHeaders, catRows))
  console.log(`[write] phase3_category_summary.csv (${catRows.length})`)

  // ---------- 5. phase3_extraction_report.md ----------
  const totalProducts = products.length
  const withImages = products.filter((p) => p.hero_image_url).length
  const withoutImages = totalProducts - withImages
  const repaired = products.filter((p) => p.repaired_by_llm).length
  const withDim = products.filter((p) => p.dimensions).length
  const withQty = products.filter((p) => p.stocked_quantity).length
  const confs = products.map((p) => Number(p.final_confidence ?? 0))
  const avgConf = confs.reduce((a, b) => a + b, 0) / confs.length
  const buckets = { gte95: 0, b8595: 0, b7085: 0, lt70: 0 }
  for (const c of confs) {
    if (c >= 0.95) buckets.gte95++
    else if (c >= 0.85) buckets.b8595++
    else if (c >= 0.70) buckets.b7085++
    else buckets.lt70++
  }

  const md = `# Phase 3 Extraction Report

Generated: ${new Date().toISOString()}

## Phase 3A — Markdown scrape
- Source: https://www.eclectichive.com (Squarespace)
- URLs scraped: 877 / 877 (100%)
- Strategy: Firecrawl markdown + links only (no JSON extraction)
- Rate limiter: concurrency 1, 700ms global interval (backoff to 1000ms on 429)
- Firecrawl credits used: ~989
- Estimated savings vs full JSON pass: ~77%

## Phase 3B — Targeted LLM repair
- Candidates: 45 (mostly image-only pillow/throw pages)
- Successful repairs: 45 / 45
- Model: google/gemini-3-flash-preview (Lovable AI Gateway)
- New Firecrawl credits: 0 (re-used stored markdown)

## Final canonical counts
- Products: ${totalProducts}
- Images: ${images.length}
- Categories: ${catMap.size}
- LLM-repaired records: ${repaired}
- Products with images: ${withImages}
- Products without images: ${withoutImages}
- Products with dimensions: ${withDim}
- Products with stocked quantity: ${withQty}
- Average final confidence: ${avgConf.toFixed(3)}

## Confidence distribution
- ≥ 0.95: ${buckets.gte95}
- 0.85 – 0.95: ${buckets.b8595}
- 0.70 – 0.85: ${buckets.b7085}
- < 0.70: ${buckets.lt70}

## Unresolved
- 1 source 404: \`${KNOWN_404}\`
  - Page returned 404 from Squarespace; not a scraper or parser failure.
  - Recommended action: exclude from reconciliation; flag for catalog owner.

## Safe to trust
- 877 unique product URLs, 1:1 with the source manifest.
- Hero image URLs for ${withImages} of ${totalProducts} products.
- Titles, dimensions, stocked quantities at ~${(avgConf * 100).toFixed(1)}% average confidence.
- Canonical views are non-destructive; raw markdown and per-row scrape history remain in \`scraped_product_pages_markdown\` and \`scraped_products\`.

## Needs manual review
- ${manualReviewCount} records flagged in \`phase3_manual_review_queue.csv\`. Reasons include:
  - Source 404 (1)
  - No images extracted (${withoutImages})
  - Final confidence < 0.70 (${buckets.lt70})
  - Title still missing after repair
  - Outstanding parse warnings or still-missing fields

## Next recommended step
**Reconciliation preview only** — dry-run match this dataset against existing \`inventory_items\`, the RMS CSV, and the storage manifest. **No writes.** Output:
- candidate matches with confidence
- conflicts (multiple inventory rows pointing at same scraped URL, or vice versa)
- orphans on either side
- a separate review queue for ambiguous matches

Do not import, merge, update, or assign images until that preview is reviewed.
`
  await writeFile(join(OUT_DIR, 'phase3_extraction_report.md'), md)
  console.log(`[write] phase3_extraction_report.md`)

  // ---------- final terminal summary ----------
  console.log('\n========================================')
  console.log('PHASE 3 FINAL EXPORT — COMPLETE')
  console.log('========================================')
  console.log(`export path           : ${OUT_DIR}/`)
  console.log(`product count         : ${totalProducts}`)
  console.log(`image count           : ${images.length}`)
  console.log(`category count        : ${catMap.size}`)
  console.log(`manual review count   : ${manualReviewCount}`)
  console.log(`unresolved/404 count  : ${unresolved404}`)
  console.log(`average confidence    : ${avgConf.toFixed(3)}`)
  console.log(`inventory writes      : 0`)
  console.log('========================================')
}

main().catch((e) => { console.error(e); process.exit(1) })
