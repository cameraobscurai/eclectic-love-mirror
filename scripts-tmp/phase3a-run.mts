// Phase 3A driver: markdown-only Firecrawl scrape of 877 manifest URLs,
// parse with src/server/phase3a-parser.ts, write to staging tables.
// One-shot, idempotent per URL via on-conflict skip on (run_id, url).
import Firecrawl from '@mendable/firecrawl-js'
import { createClient } from '@supabase/supabase-js'
import { parseProductPage } from '../src/server/phase3a-parser.ts'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const FC_KEY = process.env.FIRECRAWL_API_KEY!

const sb = createClient(SUPABASE_URL, SR, { auth: { persistSession: false } })
const fc = new Firecrawl({ apiKey: FC_KEY })

const CONCURRENCY = 6
const PHASE = 'phase3a_markdown'

async function main() {
  // 1. Fetch manifest
  const { data: manifest, error: mErr } = await sb
    .from('phase3_scrape_manifest')
    .select('url, category_slug, product_slug')
    .eq('classification', 'scrape_phase3a_main_inventory')
  if (mErr) throw mErr
  if (!manifest?.length) throw new Error('Empty manifest')
  console.log(`[manifest] ${manifest.length} URLs`)

  // 2. Create run
  const { data: runRow, error: rErr } = await sb
    .from('scrape_runs')
    .insert({
      phase: PHASE,
      status: 'running',
      source_url: 'https://www.eclectichive.com',
      items_total: manifest.length,
      credits_estimated: manifest.length, // 1cr/page markdown
      notes: 'Phase 3A markdown-only batch (877 main inventory URLs)',
    })
    .select('id')
    .single()
  if (rErr) throw rErr
  const runId = runRow.id as string
  console.log(`[run] ${runId}`)

  // 3. Skip URLs already scraped successfully on a prior run for resumability
  const { data: existing } = await sb
    .from('scraped_product_pages_markdown')
    .select('url')
    .in('url', manifest.map((m) => m.url))
  const done = new Set((existing ?? []).map((r) => r.url))
  const todo = manifest.filter((m) => !done.has(m.url))
  console.log(`[resume] already-have=${done.size} todo=${todo.length}`)

  let completed = 0
  let credits = 0
  let parsed_ok = 0
  let parsed_low = 0
  let errors = 0

  async function worker(idx: number) {
    while (true) {
      const i = next++
      if (i >= todo.length) return
      const item = todo[i]
      try {
        const res: any = await fc.scrape(item.url, {
          formats: ['markdown', 'links'],
          onlyMainContent: false,
        })
        const markdown: string = res?.markdown ?? res?.data?.markdown ?? ''
        const links: string[] = res?.links ?? res?.data?.links ?? []
        const metadata = res?.metadata ?? res?.data?.metadata ?? null
        const httpStatus = metadata?.statusCode ?? metadata?.status ?? null
        credits += 1

        // Insert raw markdown evidence
        await sb.from('scraped_product_pages_markdown').insert({
          run_id: runId,
          url: item.url,
          category_slug: item.category_slug,
          product_slug: item.product_slug,
          markdown,
          links,
          metadata,
          http_status: httpStatus,
          credits_used: 1,
        })

        // Parse + insert structured row
        const parsed = parseProductPage({ url: item.url, markdown, metadata, links })
        const p = parsed.product
        const { data: prod, error: pErr } = await sb
          .from('scraped_products')
          .insert({
            run_id: runId,
            phase: PHASE,
            url: item.url,
            slug: p.product_slug ?? item.product_slug ?? item.url,
            title: p.product_title_normalized ?? p.product_title_original ?? '(unknown)',
            category_slug: p.category_slug ?? item.category_slug,
            product_title_original: p.product_title_original,
            product_title_normalized: p.product_title_normalized,
            is_custom_order_co: p.is_custom_order_co,
            description: p.description,
            dimensions: p.dimensions,
            stocked_quantity: p.stocked_quantity,
            material_notes: p.material_notes,
            color_notes: p.color_notes,
            size_notes: p.size_notes,
            generic_notes: p.generic_notes,
            add_to_cart_present: p.add_to_cart_present,
            quantity_selector_present: p.quantity_selector_present,
            variant_selector_present: p.variant_selector_present,
            previous_product_url: p.previous_product_url,
            next_product_url: p.next_product_url,
            related_product_urls: p.related_product_urls,
            breadcrumb: p.breadcrumb,
            parse_confidence: p.parse_confidence,
            missing_fields: p.missing_fields,
            ambiguity_flags: p.ambiguity_flags,
            warnings: p.warnings,
            needs_llm_reextract: p.needs_llm_reextract,
            reextract_reason: p.reextract_reason,
            hero_image_url: parsed.images[0]?.image_url ?? null,
            raw: { firecrawl_metadata: metadata },
          })
          .select('id')
          .single()
        if (pErr) throw pErr

        if (parsed.images.length) {
          await sb.from('scraped_product_images').insert(
            parsed.images.map((img) => ({
              scraped_product_id: prod.id,
              image_url: img.image_url,
              position: img.position,
              is_hero: img.is_hero,
              inferred_filename: img.inferred_filename,
              alt_text: img.alt_text,
              source_page_url: img.source_page_url,
            }))
          )
        }

        if (p.needs_llm_reextract) {
          parsed_low++
          await sb.from('llm_reextract_candidates').insert({
            run_id: runId,
            url: item.url,
            category_slug: p.category_slug,
            product_slug: p.product_slug,
            reason: p.reextract_reason ?? 'unknown',
            missing_fields: p.missing_fields,
            ambiguity_flags: p.ambiguity_flags,
            parse_confidence: p.parse_confidence,
          })
        } else {
          parsed_ok++
        }
      } catch (e: any) {
        errors++
        const httpStatus = e?.statusCode ?? e?.status ?? null
        await sb.from('scrape_errors').insert({
          run_id: runId,
          phase: PHASE,
          url: item.url,
          error_type: e?.name ?? 'ScrapeError',
          error_message: String(e?.message ?? e).slice(0, 4000),
          http_status: httpStatus,
          raw: { stack: String(e?.stack ?? '').slice(0, 4000) },
        })
      } finally {
        completed++
        if (completed % 25 === 0 || completed === todo.length) {
          console.log(`[progress] ${completed}/${todo.length} ok=${parsed_ok} low=${parsed_low} err=${errors} credits=${credits}`)
          await sb
            .from('scrape_runs')
            .update({ items_completed: completed, credits_used: credits })
            .eq('id', runId)
        }
      }
    }
  }

  let next = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)))

  await sb
    .from('scrape_runs')
    .update({
      status: errors === todo.length ? 'failed' : 'completed',
      finished_at: new Date().toISOString(),
      items_completed: completed,
      credits_used: credits,
      notes: `Phase 3A done. ok=${parsed_ok} low_confidence=${parsed_low} errors=${errors} credits=${credits}`,
    })
    .eq('id', runId)

  console.log(`\n[DONE] run=${runId} ok=${parsed_ok} low=${parsed_low} err=${errors} credits=${credits}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
