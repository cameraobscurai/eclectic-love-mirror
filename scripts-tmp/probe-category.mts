import Firecrawl from '@mendable/firecrawl-js'
const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })
const url = 'https://www.eclectichive.com/cocktail-bar'
const res: any = await fc.scrape(url, { formats: ['html', 'links'], onlyMainContent: false })
const html: string = res?.html ?? res?.data?.html ?? ''
console.log('HTML length:', html.length)
// Find product detail links
const links: string[] = res?.links ?? res?.data?.links ?? []
const detailLinks = [...new Set(links.filter(l => l.startsWith('https://www.eclectichive.com/cocktail-bar/')))]
console.log('Detail links:', detailLinks.length)
console.log(detailLinks.slice(0, 5))
// Find all squarespace cdn image URLs in HTML
const imgRe = /https:\/\/images\.squarespace-cdn\.com\/[^\s"'<>)]+/g
const cdn = [...new Set(html.match(imgRe) ?? [])]
console.log('CDN images on page:', cdn.length)
console.log(cdn.slice(0, 5))
