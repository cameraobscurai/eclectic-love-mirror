import Firecrawl from '@mendable/firecrawl-js'
import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = 'https://eclectichive.com'

function urlToPath(url: string): string {
  try {
    const u = new URL(url)
    const p = u.pathname.replace(/\/+$/, '') || '/'
    return p.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

async function main() {
  const FC_KEY = process.env.FIRECRAWL_API_KEY!
  const SB_URL = process.env.SUPABASE_URL!
  const SB_SR = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const admin = createClient(SB_URL, SB_SR, { auth: { persistSession: false } })

  const { data: run, error: runErr } = await admin
    .from('scrape_runs')
    .insert({
      phase: 'map',
      status: 'running',
      source_url: SOURCE_URL,
      credits_estimated: 1,
      notes: 'Phase 1 map — sandbox one-shot',
    })
    .select()
    .single()
  if (runErr || !run) throw new Error(`scrape_runs insert: ${runErr?.message}`)
  console.log(`scrape_runs id: ${run.id}`)

  try {
    const fc = new Firecrawl({ apiKey: FC_KEY })
    console.log(`Calling Firecrawl map on ${SOURCE_URL}...`)
    const result = await fc.map(SOURCE_URL, { limit: 5000, includeSubdomains: false })

    const rawLinks = (result as { links?: Array<string | { url?: string }> }).links ?? []
    const links: string[] = rawLinks
      .map((l) => (typeof l === 'string' ? l : l?.url))
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
    console.log(`Firecrawl returned ${links.length} links (raw)`)

    const seen = new Set<string>()
    const rows = links
      .filter((u) => {
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
      .map((url) => ({ run_id: run.id, url, path: urlToPath(url) }))
    console.log(`After dedupe: ${rows.length} unique URLs`)

    if (rows.length === 0) {
      await admin
        .from('scrape_runs')
        .update({ status: 'failed', error_message: 'Map returned 0 links', finished_at: new Date().toISOString() })
        .eq('id', run.id)
      console.log('FAILED: 0 links')
      return
    }

    const chunkSize = 500
    let inserted = 0
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error: insErr } = await admin.from('scraped_urls').insert(chunk)
      if (insErr) throw new Error(`Insert chunk ${i}: ${insErr.message}`)
      inserted += chunk.length
      console.log(`Inserted ${inserted}/${rows.length}`)
    }

    await admin
      .from('scrape_runs')
      .update({
        status: 'succeeded',
        items_total: inserted,
        items_completed: inserted,
        credits_used: 1,
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)
    console.log(`DONE — runId=${run.id} urls=${inserted}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await admin
      .from('scrape_runs')
      .update({ status: 'failed', error_message: msg, finished_at: new Date().toISOString() })
      .eq('id', run.id)
    console.error('FAILED:', msg)
    process.exit(1)
  }
}

main()
