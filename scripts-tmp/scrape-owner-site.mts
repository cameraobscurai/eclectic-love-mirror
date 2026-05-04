// Phase: scrape eclectichive.com to harvest {detail_url, title, cdn_image_urls[]}
// Step 1 of plan: collect detail URLs from 10 category pages.
// Step 2: scrape each detail page, extract H1 and squarespace-cdn image URLs.
// Output: scripts-tmp/owner-site-products.json
import Firecrawl from '@mendable/firecrawl-js'
import fs from 'node:fs'
import path from 'node:path'

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })

const CATEGORY_PATHS = [
  'lounge-seating',
  'lounge-tables',
  'cocktail-bar',
  'dining',
  'tableware',
  'lighting',
  'textiles',
  'rugs',
  'styling',
  'large-decor',
]

const BASE = 'https://www.eclectichive.com'
const OUT = path.resolve('scripts-tmp/owner-site-products.json')
const STATE = path.resolve('scripts-tmp/owner-site-state.json')

// Global rate limiter ~85 req/min
let MIN_INTERVAL_MS = 700
let nextSlot = 0
async function rateLimitedScrape(url: string, formats: any[] = ['html', 'links']) {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  return fc.scrape(url, { formats, onlyMainContent: false })
}

const IMG_RE = /https:\/\/images\.squarespace-cdn\.com\/content\/v1\/[^\s"'<>)]+/g
// Excludes logos/favicons by filtering common chrome filenames.
const EXCLUDE_NAME = /(favicon|LOGO_wSTROKES|sqs-logo|content-modules)/i

function extractCdnImages(html: string): string[] {
  const all = html.match(IMG_RE) ?? []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const u of all) {
    if (EXCLUDE_NAME.test(u)) continue
    // Strip the format query so dedupe works across thumbnails vs. full-size.
    const key = u.split('?')[0]
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(key) // store the canonical (no-query) form
  }
  return ordered
}

function extractTitle(html: string): string | null {
  // Prefer Squarespace product title h1 with class containing "ProductItem-details-title"
  const m = html.match(/<h1[^>]*ProductItem-details-title[^>]*>([\s\S]*?)<\/h1>/i)
                ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (!m) return null
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

type Product = {
  category_path: string
  detail_url: string
  slug: string
  title: string | null
  cdn_image_urls: string[]
  scraped_at: string
}

async function main() {
  // Load resume state
  let state: { detailUrls: Record<string, string[]>; products: Product[] } = { detailUrls: {}, products: [] }
  if (fs.existsSync(STATE)) {
    state = JSON.parse(fs.readFileSync(STATE, 'utf8'))
    console.log(`[resume] cats=${Object.keys(state.detailUrls).length} products=${state.products.length}`)
  }

  // 1. Collect detail URLs from each category page (skip if already collected)
  for (const cat of CATEGORY_PATHS) {
    if (state.detailUrls[cat]?.length) {
      console.log(`[cat] ${cat} cached: ${state.detailUrls[cat].length}`)
      continue
    }
    try {
      const url = `${BASE}/${cat}`
      console.log(`[cat] fetching ${url}`)
      const res: any = await rateLimitedScrape(url, ['links'])
      const links: string[] = res?.links ?? res?.data?.links ?? []
      const prefix = `${BASE}/${cat}/`
      const detail = [...new Set(links.filter((l) => typeof l === 'string' && l.startsWith(prefix)))]
      state.detailUrls[cat] = detail
      fs.writeFileSync(STATE, JSON.stringify(state, null, 2))
      console.log(`[cat] ${cat}: ${detail.length} detail URLs`)
    } catch (e: any) {
      console.error(`[cat] ${cat} failed: ${e?.message}`)
    }
  }

  // Flatten unique detail URLs (dedupe across categories — same product can appear in multiple)
  const allDetail = new Map<string, string>() // url -> first category seen
  for (const [cat, urls] of Object.entries(state.detailUrls)) {
    for (const u of urls) if (!allDetail.has(u)) allDetail.set(u, cat)
  }
  const done = new Set(state.products.map((p) => p.detail_url))
  const todo = [...allDetail.entries()].filter(([u]) => !done.has(u))
  console.log(`[detail] total=${allDetail.size} done=${done.size} todo=${todo.length}`)

  // 2. Scrape each detail page
  let i = 0
  for (const [url, cat] of todo) {
    i++
    try {
      const res: any = await rateLimitedScrape(url, ['html'])
      const html: string = res?.html ?? res?.data?.html ?? ''
      const title = extractTitle(html)
      const images = extractCdnImages(html)
      const slug = url.replace(`${BASE}/${cat}/`, '')
      const product: Product = {
        category_path: cat,
        detail_url: url,
        slug,
        title,
        cdn_image_urls: images,
        scraped_at: new Date().toISOString(),
      }
      state.products.push(product)
      if (i % 10 === 0 || i === todo.length) {
        fs.writeFileSync(STATE, JSON.stringify(state, null, 2))
        console.log(`[detail] ${i}/${todo.length} latest="${title}" imgs=${images.length}`)
      }
    } catch (e: any) {
      console.error(`[detail] ${url} failed: ${e?.message}`)
      const msg = String(e?.message ?? '')
      if (/rate limit/i.test(msg) || e?.statusCode === 429) {
        MIN_INTERVAL_MS = 1000
        console.log(`[backoff] interval -> ${MIN_INTERVAL_MS}ms`)
      }
    }
  }

  fs.writeFileSync(STATE, JSON.stringify(state, null, 2))
  fs.writeFileSync(OUT, JSON.stringify(state.products, null, 2))
  console.log(`\n[DONE] ${state.products.length} products written to ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
