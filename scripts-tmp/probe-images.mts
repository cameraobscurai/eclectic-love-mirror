import Firecrawl from '@mendable/firecrawl-js'
const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! })
const url = 'https://www.eclectichive.com/tables1/alexey-white-acrylic-highboy-co'
const res: any = await fc.scrape(url, { formats: ['markdown', 'links'], onlyMainContent: false })
const re = /!\[([^\]]*)\]\(([^)\s]+)/g
let m
console.log('All ![...](...) image URLs in markdown:')
while ((m = re.exec(res.markdown)) !== null) {
  console.log(' -', m[2].slice(0, 140))
}
