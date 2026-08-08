import { chromium } from 'playwright';
import fs from 'fs';

const base = 'http://localhost:8080/collection?group=';
const groups = ['pillows-throws','rugs','furs-pelts'];
const viewports = [{w:1280,h:1800,tag:'desktop'},{w:390,h:844,tag:'mobile'}];

const b = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });

function extractInPage() {
  const imgs = Array.from(document.querySelectorAll('img'));
  return imgs.map(img => {
    const rect = img.getBoundingClientRect();
    const anchor = img.closest('a');
    return {
      slug: img.alt || anchor?.getAttribute('href') || '',
      href: anchor?.getAttribute('href') || '',
      src: img.currentSrc || img.src,
      rect: {w: rect.width, h: rect.height, top: rect.top, left: rect.left},
      naturalW: img.naturalWidth, naturalH: img.naturalHeight,
      complete: img.complete
    };
  }).filter(x => x.rect.w > 20 && x.rect.h > 20);
}

const allData = {};

for (const g of groups) {
  allData[g] = {};
  for (const vp of viewports) {
    const page = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(base+g, { waitUntil: 'networkidle', timeout: 30000 });
    let prevHeight = 0;
    for (let i=0;i<30;i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight*0.8));
      await page.waitForTimeout(300);
      const h = await page.evaluate(() => document.body.scrollHeight);
      if (h === prevHeight) {
        await page.waitForTimeout(500);
        const h2 = await page.evaluate(() => document.body.scrollHeight);
        if (h2 === h) break;
      }
      prevHeight = h;
    }
    await page.evaluate(() => window.scrollTo(0,0));
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; setTimeout(res, 3000); })));
    });
    let data = [];
    try {
      data = await page.evaluate(extractInPage);
      await page.screenshot({ path: `/tmp/browser/${g}-${vp.tag}.png`, fullPage: true }).catch(()=>{});
    } catch(e) {
      console.log(`ERROR ${g} ${vp.tag}: ${e.message}`);
    }
    allData[g][vp.tag] = data;
    await page.close();
    console.log(`Done ${g} ${vp.tag}: ${data.length} tiles`);
  }
}

await b.close();
fs.writeFileSync('/tmp/browser/audit-raw.json', JSON.stringify(allData, null, 2));
console.log('WROTE DATA');
