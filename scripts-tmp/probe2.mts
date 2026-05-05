import Firecrawl from '@mendable/firecrawl-js'
const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })
for (const cat of ['lounge-seating', 'lighting']) {
  const res: any = await fc.scrape(`https://www.eclectichive.com/${cat}`, { formats: ['links','html'], onlyMainContent: false })
  const links: string[] = res?.links ?? res?.data?.links ?? []
  const html: string = res?.html ?? res?.data?.html ?? ''
  console.log(cat, 'links:', links.length, 'html:', html.length)
  // Look for any /CAT/ links
  const matching = links.filter(l => l.includes(`/${cat}/`)).slice(0, 5)
  console.log(' sample matching:', matching)
  // Look for hrefs in html
  const hrefs = [...html.matchAll(new RegExp(`href="(/${cat}/[^"]+)"`, 'g'))].slice(0, 5).map(m => m[1])
  console.log(' html hrefs:', hrefs)
  // Maybe site uses different slugs - look for any product-looking links
  const allHrefs = [...html.matchAll(/href="(\/[^"#?]+)"/g)].map(m => m[1])
  const uniq = [...new Set(allHrefs)].filter(h => h.split('/').length === 3 && !h.startsWith('/config'))
  console.log(' all 2-segment hrefs sample:', uniq.slice(0,15))
}
