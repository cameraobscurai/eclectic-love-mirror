// TEMPORARY one-shot endpoint to run Phase 1 (Firecrawl map) without auth.
// Protected by a shared secret so it's not openly callable.
// DELETE THIS FILE after Phase 1 is complete.

import { createFileRoute } from '@tanstack/react-router'
import Firecrawl from '@mendable/firecrawl-js'
import { getServiceSupabase, requireFirecrawlKey, urlToPath } from '@/server/migration.server'

const SOURCE_URL = 'https://eclectichive.com'
// Hard-coded one-shot guard. Caller must pass this in the x-oneshot-key header.
// This route is temporary and will be deleted immediately after use.
const ONE_SHOT_KEY = 'phase1-eclectichive-map-2026'

export const Route = createFileRoute('/api/public/migration-map-oneshot')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-oneshot-key')
        if (provided !== ONE_SHOT_KEY) {
          return new Response('Forbidden', { status: 403 })
        }

        const admin = getServiceSupabase()

        const { data: run, error: runErr } = await admin
          .from('scrape_runs')
          .insert({
            phase: 'map',
            status: 'running',
            source_url: SOURCE_URL,
            credits_estimated: 1,
            notes: 'Triggered via one-shot route (pre-auth). Phase 1 only.',
          })
          .select()
          .single()
        if (runErr || !run) {
          return Response.json(
            { error: `Failed to create scrape_runs row: ${runErr?.message}` },
            { status: 500 },
          )
        }

        try {
          const firecrawl = new Firecrawl({ apiKey: requireFirecrawlKey() })
          const result = await firecrawl.map(SOURCE_URL, {
            limit: 5000,
            includeSubdomains: false,
          })

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
            return Response.json({ runId: run.id, urlsDiscovered: 0, error: 'Map returned 0 links' })
          }

          const seen = new Set<string>()
          const rows = links
            .filter((u) => {
              if (seen.has(u)) return false
              seen.add(u)
              return true
            })
            .map((url) => ({ run_id: run.id, url, path: urlToPath(url) }))

          const chunkSize = 500
          let inserted = 0
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize)
            const { error: insErr } = await admin.from('scraped_urls').insert(chunk)
            if (insErr) throw new Error(`Insert failed at chunk ${i}: ${insErr.message}`)
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

          return Response.json({ runId: run.id, urlsDiscovered: inserted })
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
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
