// Server-only helpers for the inventory migration pipeline.
// Never import this file from client code (the *.server.ts naming blocks it).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export function getServiceSupabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function requireFirecrawlKey() {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY is not configured')
  return key
}

/** Normalize a URL to a path for classification (strip origin + trailing slash, lowercase). */
export function urlToPath(url: string): string {
  try {
    const u = new URL(url)
    const p = u.pathname.replace(/\/+$/, '') || '/'
    return p.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}
