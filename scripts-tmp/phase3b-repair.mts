// Phase 3B — targeted LLM JSON re-extraction for 45 canonical low-confidence URLs.
// Reads the already-stored markdown + links from scraped_product_pages_markdown
// (no new Firecrawl scrape) and asks the Lovable AI Gateway to extract structured fields.
// Writes results to public.scraped_product_llm_repairs.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY!
const MODEL = 'google/gemini-3-flash-preview'

const sb = createClient(SUPABASE_URL, SR, { auth: { persistSession: false } })

const SYSTEM = `You repair scraped product pages for an event-rental furniture site (Eclectic Hive).
Pages are Squarespace product pages. Many are image-only (no text body), especially pillows and throws.
Be conservative: only return fields you can actually justify from the inputs.
If a field is not visible, return null and add it to still_missing_fields.`

const TOOL = {
  type: 'function' as const,
  function: {
    name: 'repair_product',
    description: 'Return structured product fields extracted from the page.',
    parameters: {
      type: 'object',
      properties: {
        product_title_original: { type: ['string', 'null'] },
        product_title_normalized: { type: ['string', 'null'], description: 'Title with site suffix (— Event Design & Decor | Eclectic Hive) stripped.' },
        description: { type: ['string', 'null'] },
        dimensions: { type: ['string', 'null'], description: 'e.g. 18"W x 18"H. null if not visible.' },
        stocked_quantity: { type: ['string', 'null'], description: 'e.g. "12" or "*". null if not visible.' },
        image_urls: { type: 'array', items: { type: 'string' }, description: 'Product image URLs in display order. Only Squarespace CDN images. Exclude logos/footer chrome.' },
        primary_image_url: { type: ['string', 'null'] },
        inferred_filenames: { type: 'array', items: { type: 'string' } },
        alt_texts: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number', description: '0-1 self-assessed confidence in the extraction.' },
        repaired_fields: { type: 'array', items: { type: 'string' }, description: 'Field names you successfully extracted.' },
        still_missing_fields: { type: 'array', items: { type: 'string' } },
        repair_notes: { type: ['string', 'null'] },
      },
      required: ['image_urls', 'inferred_filenames', 'alt_texts', 'confidence', 'repaired_fields', 'still_missing_fields'],
      additionalProperties: false,
    },
  },
}

function inferFilename(u: string): string | null {
  try {
    const last = new URL(u).pathname.split('/').pop() || ''
    return decodeURIComponent(last) || null
  } catch { return null }
}

function pruneMarkdown(md: string): string {
  // Squarespace markdown can be huge with footer chrome. Cut at Instagram footer.
  const cut = md.search(/Hive_Script[+\s]+Follow[+\s]+Along/i)
  if (cut > 0) md = md.slice(0, cut)
  if (md.length > 12000) md = md.slice(0, 12000) + '\n[truncated]'
  return md
}

async function callAI(messages: any[]): Promise<any> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'repair_product' } },
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`AI ${res.status}: ${t.slice(0, 500)}`)
  }
  return res.json()
}

async function main() {
  const { data: cands, error } = await sb
    .from('llm_reextract_candidates_canonical')
    .select('url, category_slug, product_slug, reason, missing_fields, parse_confidence')
  if (error) throw error
  console.log(`[candidates] ${cands!.length}`)

  // Create a run row
  const { data: runRow, error: rErr } = await sb
    .from('scrape_runs')
    .insert({
      phase: 'phase3a_markdown',
      status: 'running',
      source_url: 'https://www.eclectichive.com',
      items_total: cands!.length,
      notes: `Phase 3B LLM repair — model=${MODEL}`,
    }).select('id').single()
  if (rErr) throw rErr
  const runId = runRow.id as string

  let ok = 0, fail = 0
  for (const c of cands!) {
    try {
      // Pull stored markdown for this URL (most recent)
      const { data: pages } = await sb
        .from('scraped_product_pages_markdown')
        .select('markdown, links, metadata')
        .eq('url', c.url)
        .order('scraped_at', { ascending: false })
        .limit(1)

      const page = pages?.[0]
      const md = page?.markdown ? pruneMarkdown(page.markdown) : ''
      const links: string[] = (page?.links ?? []).slice(0, 80)
      const meta = page?.metadata ?? {}

      const userPrompt = [
        `URL: ${c.url}`,
        `category_slug: ${c.category_slug ?? ''}`,
        `product_slug: ${c.product_slug ?? ''}`,
        `Markdown parse missing: ${(c.missing_fields ?? []).join(', ') || '(none)'}`,
        `og:title: ${meta?.['og:title'] ?? meta?.title ?? ''}`,
        `og:description: ${meta?.['og:description'] ?? meta?.description ?? ''}`,
        `og:image: ${meta?.['og:image'] ?? ''}`,
        ``,
        `--- MARKDOWN (truncated) ---`,
        md || '(empty)',
        ``,
        `--- LINKS (sample) ---`,
        links.join('\n'),
      ].join('\n')

      const resp = await callAI([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ])

      const toolCall = resp?.choices?.[0]?.message?.tool_calls?.[0]
      if (!toolCall) throw new Error('no tool_call returned')
      const args = JSON.parse(toolCall.function.arguments)

      // Normalize image URLs and filenames
      const image_urls: string[] = Array.isArray(args.image_urls) ? args.image_urls.filter(Boolean) : []
      const inferred_filenames: string[] = image_urls.map(inferFilename).map((s) => s ?? '')
      const alt_texts: string[] = Array.isArray(args.alt_texts) ? args.alt_texts.slice(0, image_urls.length) : []
      while (alt_texts.length < image_urls.length) alt_texts.push('')

      const primary = args.primary_image_url || image_urls[0] || null

      const { error: insErr } = await sb.from('scraped_product_llm_repairs').insert({
        run_id: runId,
        source_url: c.url,
        category_slug: c.category_slug,
        product_slug: c.product_slug,
        product_title_original: args.product_title_original ?? null,
        product_title_normalized: args.product_title_normalized ?? null,
        description: args.description ?? null,
        dimensions: args.dimensions ?? null,
        stocked_quantity: args.stocked_quantity ?? null,
        image_urls,
        primary_image_url: primary,
        inferred_filenames,
        alt_texts,
        confidence: typeof args.confidence === 'number' ? args.confidence : null,
        repaired_fields: args.repaired_fields ?? [],
        still_missing_fields: args.still_missing_fields ?? [],
        repair_notes: args.repair_notes ?? null,
        raw_response: { args },
        model: MODEL,
        status: 'success',
      })
      if (insErr) throw insErr
      ok++
    } catch (e: any) {
      fail++
      await sb.from('scraped_product_llm_repairs').insert({
        run_id: runId,
        source_url: c.url,
        category_slug: c.category_slug,
        product_slug: c.product_slug,
        status: 'failed',
        error_message: String(e?.message ?? e).slice(0, 2000),
        model: MODEL,
        confidence: 0,
      })
    }
    if ((ok + fail) % 5 === 0) console.log(`[progress] ${ok + fail}/${cands!.length} ok=${ok} fail=${fail}`)
  }

  await sb.from('scrape_runs').update({
    status: 'succeeded',
    finished_at: new Date().toISOString(),
    items_completed: ok + fail,
    notes: `Phase 3B LLM repair done. ok=${ok} fail=${fail} model=${MODEL}`,
  }).eq('id', runId)

  console.log(`[DONE] run=${runId} ok=${ok} fail=${fail}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
