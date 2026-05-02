// Phase 3A driver — RESUME with global rate limiter.
// Concurrency 1, global min interval 700ms (target ~85 req/min, under the 100 req/min cap).
// Auto-backoff to 1000ms on 429. Stops if 429s persist after backoff.
import Firecrawl from '@mendable/firecrawl-js'
import { createClient } from '@supabase/supabase-js'
import { parseProductPage } from '../src/server/phase3a-parser.ts'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const FC_KEY = process.env.FIRECRAWL_API_KEY!

const sb = createClient(SUPABASE_URL, SR, { auth: { persistSession: false } })
const fc = new Firecrawl({ apiKey: FC_KEY })

const PHASE = 'phase3a_markdown'
let MIN_INTERVAL_MS = 700           // global floor between Firecrawl requests
const BACKOFF_INTERVAL_MS = 1000    // bumped floor after first 429
const STOP_AFTER_CONSECUTIVE_429 = 8 // give up if backoff doesn't help

// True global limiter: a single Promise chain that gates every Firecrawl call.
let nextSlot = 0
async function rateLimitedScrape(url: string) {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  return fc.scrape(url, { formats: ['markdown', 'links'], onlyMainContent: false })
}

async function main() {
  // 1. Manifest
  const { data: manifest, error: mErr } = await sb
    .from('phase3_scrape_manifest')
    .select('url, category_slug, product_slug')
    .eq('classification', 'scrape_phase3a_main_inventory')
  if (mErr) throw mErr

  // 2. Skip URLs already scraped
  const { data: existing } = await sb
    .from('scraped_product_pages_markdown')
    .select('url')
  const done = new Set((existing ?? []).map((r) => r.url))
  const todo = manifest!.filter((m) => !done.has(m.url))
  console.log(`[manifest] total=${manifest!.length} already_scraped=${done.size} todo=${todo.length}`)
  if (todo.length === 0) { console.log('Nothing to do.'); return }

  // 3. Run row
  const { data: runRow, error: rErr } = await sb
    .from('scrape_runs')
    .insert({
      phase: PHASE,
      status: 'running',
      source_url: 'https://www.eclectichive.com',
      items_total: todo.length,
      credits_estimated: todo.length,
      notes: `Phase 3A resume — global limiter ${MIN_INTERVAL_MS}ms`,
    })
    .select('id').single()
  if (rErr) throw rErr
  const runId = runRow.id as string
  console.log(`[run] ${runId}`)

  let completed = 0, credits = 0, parsed_ok = 0, parsed_low = 0, errors = 0
  let rate429 = 0, consecutive429 = 0, backed_off = false

  for (const item of todo) {
    try {
      const res: any = await rateLimitedScrape(item.url)
      const markdown: string = res?.markdown ?? res?.data?.markdown ?? ''
      const links: string[] = res?.links ?? res?.data?.links ?? []
      const metadata = res?.metadata ?? res?.data?.metadata ?? null
      const httpStatus = metadata?.statusCode ?? metadata?.status ?? null
      credits += 1
      consecutive429 = 0

      await sb.from('scraped_product_pages_markdown').insert({
        run_id: runId, url: item.url,
        category_slug: item.category_slug, product_slug: item.product_slug,
        markdown, links, metadata, http_status: httpStatus, credits_used: 1,
      })

      const parsed = parseProductPage({ url: item.url, markdown, metadata, links })
      const p = parsed.product
      const { data: prod, error: pErr } = await sb
        .from('scraped_products')
        .insert({
          run_id: runId, phase: PHASE, url: item.url,
          slug: p.product_slug ?? item.product_slug ?? item.url,
          title: p.product_title_normalized ?? p.product_title_original ?? '(unknown)',
          category_slug: p.category_slug ?? item.category_slug,
          product_title_original: p.product_title_original,
          product_title_normalized: p.product_title_normalized,
          is_custom_order_co: p.is_custom_order_co,
          description: p.description,
          dimensions: p.dimensions, stocked_quantity: p.stocked_quantity,
          material_notes: p.material_notes, color_notes: p.color_notes,
          size_notes: p.size_notes, generic_notes: p.generic_notes,
          add_to_cart_present: p.add_to_cart_present,
          quantity_selector_present: p.quantity_selector_present,
          variant_selector_present: p.variant_selector_present,
          previous_product_url: p.previous_product_url,
          next_product_url: p.next_product_url,
          related_product_urls: p.related_product_urls,
          breadcrumb: p.breadcrumb, parse_confidence: p.parse_confidence,
          missing_fields: p.missing_fields, ambiguity_flags: p.ambiguity_flags,
          warnings: p.warnings, needs_llm_reextract: p.needs_llm_reextract,
          reextract_reason: p.reextract_reason,
          hero_image_url: parsed.images[0]?.image_url ?? null,
          raw: { firecrawl_metadata: metadata },
        }).select('id').single()
      if (pErr) throw pErr

      if (parsed.images.length) {
        await sb.from('scraped_product_images').insert(
          parsed.images.map((img) => ({
            scraped_product_id: prod.id,
            image_url: img.image_url, position: img.position, is_hero: img.is_hero,
            inferred_filename: img.inferred_filename, alt_text: img.alt_text,
            source_page_url: img.source_page_url,
          })))
      }

      if (p.needs_llm_reextract) {
        parsed_low++
        await sb.from('llm_reextract_candidates').insert({
          run_id: runId, url: item.url,
          category_slug: p.category_slug, product_slug: p.product_slug,
          reason: p.reextract_reason ?? 'unknown',
          missing_fields: p.missing_fields, ambiguity_flags: p.ambiguity_flags,
          parse_confidence: p.parse_confidence,
        })
      } else parsed_ok++
    } catch (e: any) {
      errors++
      const httpStatus = e?.statusCode ?? e?.status ?? null
      const is429 = httpStatus === 429 || /rate limit/i.test(String(e?.message ?? ''))
      if (is429) {
        rate429++
        consecutive429++
        if (!backed_off) {
          MIN_INTERVAL_MS = BACKOFF_INTERVAL_MS
          backed_off = true
          console.log(`[backoff] 429 detected — bumping global interval to ${MIN_INTERVAL_MS}ms`)
        }
      }
      await sb.from('scrape_errors').insert({
        run_id: runId, phase: PHASE, url: item.url,
        error_type: is429 ? 'RateLimit429' : (e?.name ?? 'ScrapeError'),
        error_message: String(e?.message ?? e).slice(0, 4000),
        http_status: httpStatus,
        raw: { stack: String(e?.stack ?? '').slice(0, 4000) },
      })
      if (consecutive429 >= STOP_AFTER_CONSECUTIVE_429) {
        console.log(`[STOP] ${consecutive429} consecutive 429s after backoff — aborting run`)
        break
      }
    } finally {
      completed++
      if (completed % 25 === 0 || completed === todo.length) {
        console.log(`[progress] ${completed}/${todo.length} ok=${parsed_ok} low=${parsed_low} err=${errors} 429=${rate429} credits=${credits}`)
        await sb.from('scrape_runs')
          .update({ items_completed: completed, credits_used: credits })
          .eq('id', runId)
      }
    }
  }

  await sb.from('scrape_runs').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    items_completed: completed, credits_used: credits,
    notes: `Resume done. ok=${parsed_ok} low=${parsed_low} err=${errors} 429=${rate429} backed_off=${backed_off}`,
  }).eq('id', runId)

  console.log(`\n[DONE] run=${runId} attempted=${completed} ok=${parsed_ok} low=${parsed_low} err=${errors} 429=${rate429} credits=${credits}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
