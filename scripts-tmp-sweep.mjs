import { chromium } from 'playwright';

const PARENTS = ["lounge-seating","lounge-tables","cocktail-bar","dining","tableware","lighting","textiles","rugs","styling","large-decor"];
const BASE = "http://localhost:8080";

const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const results = {};

for (const parent of PARENTS) {
  const url = `${BASE}/collection?group=${parent}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
  // scroll to trigger lazy load / load-more batches
  for (let i=0;i<8;i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  const tiles = await page.$$eval('img', imgs => imgs
    .filter(img => img.closest('[data-collection-main]') || true)
    .map(img => img.currentSrc || img.src)
    .filter(Boolean));
  results[parent] = tiles;
  console.log(parent, tiles.length);
}
await browser.close();
process.stdout.write("\n===JSON===\n" + JSON.stringify(results));
