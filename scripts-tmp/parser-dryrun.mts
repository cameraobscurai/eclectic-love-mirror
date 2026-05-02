import Firecrawl from '@mendable/firecrawl-js'
import { parseProductPage } from '../src/server/phase3a-parser'

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })

const urls = [
  'https://www.eclectichive.com/lounge/adain-deconstructed-leather-wingback-chair',
  'https://www.eclectichive.com/tables1/alexey-white-acrylic-highboy-co',
  'https://www.eclectichive.com/accents1/Adagio-Disco-Ball',
]

for (const url of urls) {
  const t0 = Date.now()
  const res: any = await fc.scrape(url, { formats: ['markdown', 'links'], onlyMainContent: false })
  const ms = Date.now() - t0
  const parsed = parseProductPage({
    url,
    markdown: res.markdown || '',
    metadata: res.metadata || null,
    links: res.links || null,
  })
  console.log('\n========', url)
  console.log('credits_used:', res.metadata?.creditsUsed, 'time_ms:', ms, 'md_len:', (res.markdown || '').length)
  console.log('TITLE:', parsed.product.product_title_normalized, '| original:', parsed.product.product_title_original)
  console.log('CO:', parsed.product.is_custom_order_co, '| DIM:', parsed.product.dimensions, '| QTY:', parsed.product.stocked_quantity)
  console.log('IMAGES:', parsed.images.length, parsed.images.slice(0, 3).map(i => i.inferred_filename))
  console.log('UI:', { atc: parsed.product.add_to_cart_present, qty: parsed.product.quantity_selector_present, var: parsed.product.variant_selector_present })
  console.log('CONFIDENCE:', parsed.product.parse_confidence, '| missing:', parsed.product.missing_fields, '| ambig:', parsed.product.ambiguity_flags)
  console.log('NEEDS_REEXTRACT:', parsed.product.needs_llm_reextract, parsed.product.reextract_reason)
  console.log('RELATED:', parsed.product.related_product_urls.length)
}
