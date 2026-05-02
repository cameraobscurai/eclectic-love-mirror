// Phase 3A markdown parser — pure functions, no IO.
// Input: { url, markdown, metadata (firecrawl page metadata), links }
// Output: parsed product record + images + variants + quality flags.

export type ParsedProduct = {
  url: string
  category_slug: string | null
  product_slug: string | null
  product_title_original: string | null
  product_title_normalized: string | null
  is_custom_order_co: boolean
  description: string | null
  dimensions: string | null
  stocked_quantity: string | null
  material_notes: string | null
  color_notes: string | null
  size_notes: string | null
  generic_notes: string | null
  add_to_cart_present: boolean | null
  quantity_selector_present: boolean | null
  variant_selector_present: boolean | null
  previous_product_url: string | null
  next_product_url: string | null
  related_product_urls: string[]
  breadcrumb: string[]
  parse_confidence: number
  missing_fields: string[]
  ambiguity_flags: string[]
  warnings: string[]
  needs_llm_reextract: boolean
  reextract_reason: string | null
}

export type ParsedImage = {
  image_url: string
  position: number
  is_hero: boolean
  inferred_filename: string | null
  alt_text: string | null
  source_page_url: string
}

export type ParsedVariant = {
  kind: string
  label: string | null
  value: string | null
  position: number
}

export type ParseInput = {
  url: string
  markdown: string
  metadata?: Record<string, any> | null
  links?: string[] | null
}

export type ParseOutput = {
  product: ParsedProduct
  images: ParsedImage[]
  variants: ParsedVariant[]
}

function urlPath(u: string): string {
  try { return new URL(u).pathname } catch { return u }
}

function inferCategoryAndSlug(u: string): { category: string | null; slug: string | null } {
  const p = urlPath(u).replace(/\/+$/, '')
  const segs = p.split('/').filter(Boolean)
  if (segs.length >= 2) return { category: segs[segs.length - 2], slug: segs[segs.length - 1] }
  if (segs.length === 1) return { category: null, slug: segs[0] }
  return { category: null, slug: null }
}

function normalizeTitle(title: string): string {
  // Strip "— Event Design & Decor | Eclectic Hive" etc.
  return title
    .split(/[—|]/)[0]
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFilenameFromUrl(u: string): string | null {
  try {
    const path = new URL(u).pathname
    const last = path.split('/').pop() || ''
    // Squarespace CDN: filename is usually the last segment, sometimes URL-encoded
    return decodeURIComponent(last) || null
  } catch {
    return null
  }
}

// Detect dimensions like: 32"W x 30"D x 36"H, 32W x 30D x 36H, 32” W x 30” D x 36” H.
// Must start with the first measurement (anchored on whitespace/punctuation) so we don't
// truncate to the middle of a longer dimension string.
const DIM_RE = /(?:^|[\s,;:>(])(\d{1,3}(?:[.,]\d+)?\s*[”"']?\s*[WwDdHhLl](?:\s*x\s*x?\s*\d{1,3}(?:[.,]\d+)?\s*[”"']?\s*[WwDdHhLl]){1,3})/

// Detect stocked quantity statements
const STOCKED_RE = /Stocked\s*(?:Quantity|Qty)\s*[:\-]?\s*(\d+|\*+|N\/A|See description|inquire|TBD)/i

// Material/color/size labels
const LABELED_RE = (label: string) => new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i')

const SQUARESPACE_IMG_HOSTS = ['images.squarespace-cdn.com', 'static1.squarespace.com']

// Filenames that appear on every product page (site chrome) and must be excluded.
const CHROME_FILENAME_PATTERNS = [
  /^logo[_\-]?/i,
  /^favicon/i,
  /^sprite/i,
  /^image-asset\./i,            // Squarespace generic placeholder
  /^hive[_\-]?script/i,         // "Hive_Script Follow Along" footer banner
  /follow[_\-+]?along/i,
  /^uc$/i,                       // 1-byte placeholder
  /^uc\./i,
  /banner|header|footer/i,
]

function isChromeFilename(filename: string | null): boolean {
  if (!filename) return false
  const f = filename.replace(/\?.*$/, '')
  return CHROME_FILENAME_PATTERNS.some((re) => re.test(f))
}

function isProductImageUrl(u: string): boolean {
  try {
    const url = new URL(u)
    if (!SQUARESPACE_IMG_HOSTS.includes(url.hostname)) return false
    const lastSeg = decodeURIComponent(url.pathname.split('/').pop() || '').toLowerCase()
    if (isChromeFilename(lastSeg)) return false
    return /\.(png|jpe?g|webp|gif|avif)/i.test(lastSeg) || url.searchParams.has('format')
  } catch {
    return false
  }
}

function dedupeKeepOrder<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const x of arr) {
    const k = keyFn(x)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

// Extract image URLs from markdown ![alt](url) and metadata fallbacks
function extractImages(markdown: string, metadata: Record<string, any> | null | undefined, sourceUrl: string): ParsedImage[] {
  const out: ParsedImage[] = []
  const re = /!\[([^\]]*)\]\(([^)\s]+)/g
  let m: RegExpExecArray | null
  let pos = 0
  while ((m = re.exec(markdown)) !== null) {
    const alt = m[1]?.trim() || null
    const rawUrl = m[2]
    if (!isProductImageUrl(rawUrl)) continue
    out.push({
      image_url: rawUrl,
      position: pos++,
      is_hero: false,
      inferred_filename: extractFilenameFromUrl(rawUrl),
      alt_text: alt,
      source_page_url: sourceUrl,
    })
  }

  // Fallback: og:image / thumbnailUrl from metadata
  const ogImage = metadata?.['og:image'] || metadata?.thumbnailUrl
  if (out.length === 0 && typeof ogImage === 'string' && isProductImageUrl(ogImage)) {
    out.push({
      image_url: ogImage,
      position: 0,
      is_hero: true,
      inferred_filename: extractFilenameFromUrl(ogImage),
      alt_text: null,
      source_page_url: sourceUrl,
    })
  }

  // Dedupe by filename stem (Squarespace serves the same image at multiple ?format= sizes)
  const deduped = dedupeKeepOrder(out, (img) => {
    const fn = img.inferred_filename || img.image_url
    return fn.replace(/\?.*$/, '').toLowerCase()
  })

  // Mark first image as hero
  if (deduped.length > 0) deduped[0].is_hero = true
  // Reassign positions after dedupe
  deduped.forEach((img, i) => { img.position = i })
  return deduped
}

// Find prev/next product nav. Squarespace renders these as plain links in markdown nav.
function findPrevNext(links: string[] | null | undefined, currentUrl: string, categorySlug: string | null): { prev: string | null; next: string | null } {
  // We can't reliably know prev/next without page structure. Conservative: leave null and flag as ambiguous.
  // (Firecrawl `links` is just all links on the page.)
  return { prev: null, next: null }
}

function extractRelatedProductUrls(links: string[] | null | undefined, currentUrl: string, categorySlug: string | null): string[] {
  if (!links || !categorySlug) return []
  const cur = urlPath(currentUrl)
  const set = new Set<string>()
  for (const l of links) {
    try {
      const u = new URL(l)
      if (!u.hostname.endsWith('eclectichive.com')) continue
      const segs = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
      if (segs.length !== 2) continue
      if (segs[0] !== categorySlug) continue
      if (urlPath(l) === cur) continue
      set.add(`${u.origin}${u.pathname}`)
    } catch { /* skip */ }
  }
  return Array.from(set).slice(0, 12)
}

export function parseProductPage(input: ParseInput): ParseOutput {
  const { url, markdown, metadata, links } = input
  const md = markdown || ''
  const { category, slug } = inferCategoryAndSlug(url)

  // Title
  const metaTitle = (metadata?.['og:title'] || metadata?.title || '').toString().trim() || null
  const h1Match = md.match(/^#\s+(.+)$/m)
  const title_original = metaTitle || (h1Match?.[1]?.trim() ?? null)
  const title_normalized = title_original ? normalizeTitle(title_original) : null

  // -co flag (from product slug)
  const is_co = !!slug && slug.toLowerCase().endsWith('-co')

  // Dimensions
  const dimMatch = md.match(DIM_RE) || (metadata?.description || '').toString().match(DIM_RE)
  const dimensions = dimMatch?.[1]?.trim() || null

  // Stocked quantity
  const stockMatch = md.match(STOCKED_RE) || (metadata?.description || '').toString().match(STOCKED_RE)
  const stocked_quantity = stockMatch?.[1]?.trim() || null

  // Materials / colors / sizes / notes (best effort)
  const materials = md.match(LABELED_RE('Material(?:s)?'))?.[1]?.trim() || null
  const colors = md.match(LABELED_RE('Color(?:s)?'))?.[1]?.trim() || null
  const sizes = md.match(LABELED_RE('Size(?:s)?'))?.[1]?.trim() || null
  const notes = md.match(LABELED_RE('Note(?:s)?'))?.[1]?.trim() || null

  // Description: take first paragraph after the title that is not a nav block (heuristic)
  // Use og:description as a sane fallback.
  const ogDesc = (metadata?.['og:description'] || metadata?.description || '').toString().trim() || null

  // UI behavior heuristics
  const add_to_cart_present = /add to cart/i.test(md) || null
  const quantity_selector_present = /\bQuantity\b/.test(md) || null
  const variant_selector_present = /\bVariant\b|\bChoose\b/i.test(md) || null

  // Images
  const images = extractImages(md, metadata ?? null, url)

  // Prev/Next (conservative — leave null; flag as ambiguous so re-extract can recover)
  const { prev, next } = findPrevNext(links ?? null, url, category)

  // Related
  const related = extractRelatedProductUrls(links ?? null, url, category)

  // Variants — empty for now; flag if variant_selector_present
  const variants: ParsedVariant[] = []

  // Quality scoring
  const missing: string[] = []
  const ambig: string[] = []
  const warnings: string[] = []
  if (!title_normalized) missing.push('title')
  if (!dimensions) missing.push('dimensions')
  if (!stocked_quantity) missing.push('stocked_quantity')
  if (images.length === 0) missing.push('images')
  if (variant_selector_present && variants.length === 0) ambig.push('variants_present_but_unparsed')
  if (md.length < 500) ambig.push('markdown_short')
  if (prev === null && next === null) ambig.push('prev_next_unparsed')

  // Confidence: weighted score
  let score = 1.0
  if (!title_normalized) score -= 0.5
  if (images.length === 0) score -= 0.3
  if (!dimensions) score -= 0.1
  if (!stocked_quantity) score -= 0.05
  if (md.length < 500) score -= 0.1
  if (variant_selector_present && variants.length === 0) score -= 0.1
  score = Math.max(0, Math.min(1, score))

  // Re-extract decision
  let needs_reextract = false
  let reason: string | null = null
  if (!title_normalized) { needs_reextract = true; reason = 'title_unparsed' }
  else if (images.length === 0) { needs_reextract = true; reason = 'no_images' }
  else if (variant_selector_present && variants.length === 0) { needs_reextract = true; reason = 'variants_present_but_unparsed' }
  else if (score < 0.55) { needs_reextract = true; reason = 'low_confidence' }

  return {
    product: {
      url,
      category_slug: category,
      product_slug: slug,
      product_title_original: title_original,
      product_title_normalized: title_normalized,
      is_custom_order_co: is_co,
      description: ogDesc,
      dimensions,
      stocked_quantity,
      material_notes: materials,
      color_notes: colors,
      size_notes: sizes,
      generic_notes: notes,
      add_to_cart_present,
      quantity_selector_present,
      variant_selector_present,
      previous_product_url: prev,
      next_product_url: next,
      related_product_urls: related,
      breadcrumb: [],
      parse_confidence: score,
      missing_fields: missing,
      ambiguity_flags: ambig,
      warnings,
      needs_llm_reextract: needs_reextract,
      reextract_reason: reason,
    },
    images,
    variants,
  }
}
