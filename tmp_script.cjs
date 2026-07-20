const { chromium } = require('playwright');
const fs = require('fs');

const routes = ['/collection/tableware','/collection/serveware','/collection/lighting','/collection/candlelight','/collection/chandeliers'];
const viewports = [{name:'desktop',width:1280,height:1800},{name:'mobile',width:390,height:844}];

(async () => {
  const browser = await chromium.launch({executablePath: '/nix/store/2zqa6kavc8znbgrac1l3pix9lwr3w5nj-playwright-chromium/chrome-linux/chrome', args:['--no-sandbox']});
  const report = {};
  for (const vp of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({viewport:{width:vp.width,height:vp.height}});
      try {
        await page.goto('http://localhost:8080'+route, {waitUntil:'networkidle', timeout:30000});
        await page.waitForTimeout(1000);
        const key = route+'|'+vp.name;
        const slug = route.split('/').pop();
        const fname = `/tmp/browser/tiles-B/${slug}-${vp.name}.png`;
        await page.screenshot({path: fname, fullPage:false});

        const data = await page.evaluate(() => {
          // find product tile links/cards
          const tiles = Array.from(document.querySelectorAll('a[href*="/product"], [class*="tile"], [class*="card"], [class*="grid"] > *'));
          const seen = new Set();
          const results = [];
          const candidates = Array.from(document.querySelectorAll('img'));
          candidates.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.width < 20 || rect.height < 20) return;
            let el = img.closest('a') || img.parentElement;
            const tileRect = el.getBoundingClientRect();
            let slugMatch = '';
            const a = img.closest('a');
            if (a) slugMatch = a.getAttribute('href') || '';
            results.push({
              src: img.currentSrc || img.src,
              alt: img.alt,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              renderedWidth: rect.width,
              renderedHeight: rect.height,
              tileWidth: tileRect.width,
              tileHeight: tileRect.height,
              href: slugMatch,
              top: rect.top
            });
          });
          return results;
        });
        report[key] = data;
      } catch(e) {
        report[route+'|'+vp.name] = {error: e.message};
      }
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync('/tmp/browser/tiles-B/report.json', JSON.stringify(report, null, 2));
  console.log('done');
})();
