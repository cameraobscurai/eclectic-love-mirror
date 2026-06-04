import { createServerFn } from '@tanstack/react-start'
import Firecrawl from '@mendable/firecrawl-js'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { getServiceSupabase, requireFirecrawlKey, urlToPath } from './migration.server'

const SOURCE_URL = 'https://eclectichive.com'

/**
 * Phase 1 — Map the live site.
 * Discovers every URL Firecrawl can find, writes them to scraped_urls (kind='unclassified').
 * Cheap (~1 credit). Read-only output: classification happens in Phase 2.
 */
export const runFirecrawlMap = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context

    // Admin gate
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleRow) {
      throw new Response('Forbidden: admin role required', { status: 403 })
    }

    const admin = getServiceSupabase()

    // Create scrape_runs row
    const { data: run, error: runErr } = await admin
      .from('scrape_runs')
      .insert({
        phase: 'map',
        status: 'running',
        source_url: SOURCE_URL,
        credits_estimated: 1,
      })
      .select()
      .single()
    if (runErr || !run) {
      throw new Response(`Failed to create scrape_runs row: ${runErr?.message}`, { status: 500 })
    }

    try {
      const firecrawl = new Firecrawl({ apiKey: requireFirecrawlKey() })
      const result = await firecrawl.map(SOURCE_URL, {
        limit: 5000,
        includeSubdomains: false,
      })

      // SDK v2: result.links is SearchResultWeb[] (objects with .url) — extract URL strings
      const rawLinks = (result as { links?: Array<string | { url?: string }> }).links ?? []
      const links: string[] = rawLinks
        .map((l) => (typeof l === 'string' ? l : l?.url))
        .filter((u): u is string => typeof u === 'string' && u.length > 0)

      if (links.length === 0) {
        await admin
          .from('scrape_runs')
          .update({
            status: 'failed',
            error_message: 'Firecrawl map returned 0 links',
            finished_at: new Date().toISOString(),
          })
          .eq('id', run.id)
        return { runId: run.id, urlsDiscovered: 0, error: 'Map returned 0 links' }
      }

      // Dedupe + insert
      const seen = new Set<string>()
      const rows = links
        .filter((u) => {
          if (typeof u !== 'string' || !u) return false
          if (seen.has(u)) return false
          seen.add(u)
          return true
        })
        .map((url) => ({
          run_id: run.id,
          url,
          path: urlToPath(url),
        }))

      // Insert in chunks of 500 to stay friendly
      const chunkSize = 500
      let inserted = 0
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const { error: insErr } = await admin.from('scraped_urls').insert(chunk)
        if (insErr) {
          throw new Error(`Insert failed at chunk ${i}: ${insErr.message}`)
        }
        inserted += chunk.length
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

      return { runId: run.id, urlsDiscovered: inserted }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await admin
        .from('scrape_runs')
        .update({
          status: 'failed',
          error_message: message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', run.id)
      throw new Response(`Firecrawl map failed: ${message}`, { status: 500 })
    }
  })
