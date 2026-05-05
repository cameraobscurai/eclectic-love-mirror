import Firecrawl from '@mendable/firecrawl-js'
const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })
const res: any = await fc.scrape('https://www.eclectichive.com/lounge-seating', { formats: ['links','html','markdown'], onlyMainContent: false })
const links: string[] = res?.links ?? []
console.log('all links:'); links.forEach(l => console.log(' ', l))
console.log('\n--- markdown excerpt ---')
console.log((res.markdown ?? '').slice(0, 2000))
