import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
await page.goto('http://localhost:8080/collection?group=lighting&subcategory=candlelight', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
for (let i=0;i<10;i++){ await page.evaluate(() => window.scrollBy(0, 900)); await page.waitForTimeout(300); }
const info = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('a')).filter(a => a.querySelector('img'));
  return { count: cards.length, sample: cards.slice(0,3).map(c => ({tag: c.tagName, cls: c.className, html: c.outerHTML.slice(0,200)})) };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
