// Smoke test: scrape 3 manifest URLs end-to-end into staging.
import Firecrawl from '@mendable/firecrawl-js'
import { createClient } from '@supabase/supabase-js'
import { parseProductPage } from '../src/server/phase3a-parser.ts'

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })

const URLS = [
  'https://www.eclectichive.com/lounge/cosette-sage-velvet-loveseat',
  'https://www.eclectichive.com/accents1/Adagio-Disco-Ball',
  'https://www.eclectichive.com/chairs-stools1/axel-bar-stool-co',
]

for (const url of URLS) {
  const res: any = await fc.scrape(url, { formats: ['markdown', 'links'], onlyMainContent: false })
  const md = res?.markdown ?? res?.data?.markdown ?? ''
  const links = res?.links ?? res?.data?.links ?? []
  const metadata = res?.metadata ?? res?.data?.metadata ?? null
  const parsed = parseProductPage({ url, markdown: md, metadata, links })
  console.log(`\n=== ${url}`)
  console.log(`  md_len=${md.length} links=${links.length} status=${metadata?.statusCode}`)
  console.log(`  title="${parsed.product.product_title_normalized}" dims="${parsed.product.dimensions}" qty="${parsed.product.stocked_quantity}"`)
  console.log(`  images=${parsed.images.length} confidence=${parsed.product.parse_confidence.toFixed(2)} reextract=${parsed.product.needs_llm_reextract} (${parsed.product.reextract_reason})`)
}
console.log('\nSmoke OK — ready for full run.')
