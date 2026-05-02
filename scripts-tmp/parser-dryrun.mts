import Firecrawl from '@mendable/firecrawl-js'
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs'
import { parseProductPage } from '../src/server/phase3a-parser'

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })
mkdirSync('/tmp/fc-cache', { recursive: true })

const urls = [
  'https://www.eclectichive.com/lounge/adain-deconstructed-leather-wingback-chair',
  'https://www.eclectichive.com/tables1/alexey-white-acrylic-highboy-co',
  'https://www.eclectichive.com/accents1/Adagio-Disco-Ball',
  'https://www.eclectichive.com/textiles/alpaca-linear-grey-black-throw',
  'https://www.eclectichive.com/tableware/adonis-glassware',
  'https://www.eclectichive.com/light/alabaster-votive',
  'https://www.eclectichive.com/cocktail-bar/amisa-midnight-bar',
  'https://www.eclectichive.com/rugs/atlas',
  'https://www.eclectichive.com/pillows-throws1/Pillow1',
  'https://www.eclectichive.com/styling/agatha-rustic-mini-vases',
]

let totalCredits = 0, fromCache = 0, needReextract = 0, avgConf = 0
const lowConf: any[] = []

for (const url of urls) {
  const cacheKey = url.replace(/[^a-z0-9]+/gi, '_')
  const cachePath = `/tmp/fc-cache/${cacheKey}.json`
  let res: any
  if (existsSync(cachePath)) {
    res = JSON.parse(readFileSync(cachePath, 'utf-8'))
    fromCache++
  } else {
    res = await fc.scrape(url, { formats: ['markdown', 'links'], onlyMainContent: false })
    writeFileSync(cachePath, JSON.stringify({ markdown: res.markdown, metadata: res.metadata, links: res.links }))
    totalCredits += res.metadata?.creditsUsed || 0
  }
  const parsed = parseProductPage({ url, markdown: res.markdown || '', metadata: res.metadata || null, links: res.links || null })
  const p = parsed.product
  avgConf += p.parse_confidence
  if (p.needs_llm_reextract) needReextract++
  if (p.parse_confidence < 0.85) lowConf.push({ url, conf: p.parse_confidence, missing: p.missing_fields })
  console.log(
    `[${p.parse_confidence.toFixed(2)}] ${url.replace('https://www.eclectichive.com', '')}\n` +
    `  title="${p.product_title_normalized}" co=${p.is_custom_order_co} dim="${p.dimensions}" qty="${p.stocked_quantity}" imgs=${parsed.images.length}\n` +
    `  files=${JSON.stringify(parsed.images.slice(0, 6).map(i => i.inferred_filename?.replace(/\?.*/, '')))}\n` +
    `  missing=${JSON.stringify(p.missing_fields)} reextract=${p.needs_llm_reextract}(${p.reextract_reason || ''})`
  )
}

console.log('\n=== SUMMARY ===')
console.log(`credits this run: ${totalCredits} | from cache: ${fromCache}/${urls.length}`)
console.log('avg confidence:', (avgConf / urls.length).toFixed(2))
console.log('needs reextract:', `${needReextract}/${urls.length} (${Math.round(needReextract / urls.length * 100)}%)`)
console.log('low-conf samples:', JSON.stringify(lowConf, null, 2))
console.log('\nProjection for 877 pages:')
const reExtRate = needReextract / urls.length
console.log(`  base credits @ 1/page: 877`)
console.log(`  est. reextract pool: ${Math.round(reExtRate * 877)} pages`)
console.log(`  est. reextract credits @ 5/page: ${Math.round(reExtRate * 877 * 5)}`)
console.log(`  est. TOTAL credits: ${877 + Math.round(reExtRate * 877 * 5)}`)
