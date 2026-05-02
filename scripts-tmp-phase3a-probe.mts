import Firecrawl from '@mendable/firecrawl-js'

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })

const url = 'https://www.eclectichive.com/lounge/adain-deconstructed-leather-wingback-chair'

const productSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Product title as displayed' },
    description: { type: 'string', description: 'Full product description text' },
    dimensions: { type: 'string', description: 'Dimensions text exactly as shown (e.g. "32W x 30D x 36H")' },
    stocked_quantity: { type: 'string', description: 'Stocked / inventory / qty available text if shown, else empty' },
    materials: { type: 'string', description: 'Material notes if shown' },
    colors: { type: 'string', description: 'Color notes if shown' },
    sizes: { type: 'string', description: 'Size options if shown' },
    notes: { type: 'string', description: 'Any other visible specs/notes' },
    breadcrumbs: { type: 'array', items: { type: 'string' } },
    image_urls: { type: 'array', items: { type: 'string' }, description: 'All product gallery image URLs in display order' },
    add_to_cart_present: { type: 'boolean' },
    quantity_selector_present: { type: 'boolean' },
    variant_selector_present: { type: 'boolean' },
    variants: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } } },
    related_product_urls: { type: 'array', items: { type: 'string' } },
    previous_product_url: { type: 'string' },
    next_product_url: { type: 'string' },
  },
  required: ['title'],
}

const t0 = Date.now()
const result = await fc.scrape(url, {
  formats: [
    'markdown',
    'links',
    { type: 'json', schema: productSchema, prompt: 'Extract product detail page fields. Preserve original strings; do not normalize.' },
  ],
  onlyMainContent: false,
})
const ms = Date.now() - t0

console.log('--- TIMING ---', ms, 'ms')
console.log('--- KEYS ---', Object.keys(result))
console.log('--- METADATA ---', JSON.stringify((result as any).metadata, null, 2))
console.log('--- JSON EXTRACTION ---')
console.log(JSON.stringify((result as any).json, null, 2))
console.log('--- LINKS COUNT ---', ((result as any).links || []).length)
console.log('--- MARKDOWN PREVIEW ---')
console.log(((result as any).markdown || '').slice(0, 800))
