const { chromium } = require('playwright');

const routes = ['/collection/pillows-throws','/collection/rugs','/collection/furs-pelts'];
const viewports = [{name:'desktop',width:1280,height:1800},{name:'mobile',width:390,height:844}];

(async () => {
  const browser = await chromium.launch();
  for (const route of routes) {
    for (const vp of viewports) {
      const page = await browser.newPage({viewport:{width:vp.width,height:vp.height}});
      await page.goto('http://localhost:8080'+route, {waitUntil:'networkidle'});
      await page.waitForTimeout(1000);
      const slug = route.split('/').pop();
      await page.screenshot({path:`/tmp/browser/tiles-C/${slug}-${vp.name}-top.png`});

      // scroll mid for pillows-throws
      const data = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('[class*="tile"], a[href*="/product/"], [class*="card"], [class*="grid"] > *')).filter(el=>el.querySelector('img'));
        return null;
      });

      // more robust: find product links containing image
      const results = await page.evaluate(() => {
        function getTiles() {
          const links = Array.from(document.querySelectorAll('a')).filter(a => a.querySelector('img'));
          return links;
        }
        const links = getTiles();
        return links.slice(0,40).map(a => {
          const img = a.querySelector('img');
          const r = a.getBoundingClientRect();
          const ir = img.getBoundingClientRect();
          return {
            href: a.getAttribute('href'),
            tileW: r.width, tileH: r.height,
            imgW: ir.width, imgH: ir.height,
            naturalW: img.naturalWidth, naturalH: img.naturalHeight,
            src: img.currentSrc || img.src
          };
        });
      });
      require('fs').writeFileSync(`/tmp/browser/tiles-C/${slug}-${vp.name}.json`, JSON.stringify(results,null,2));

      if (slug === 'pillows-throws') {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.4));
        await page.waitForTimeout(1000);
        await page.screenshot({path:`/tmp/browser/tiles-C/${slug}-${vp.name}-mid.png`});
        const midResults = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a')).filter(a => a.querySelector('img'));
          const viewportLinks = links.filter(a => {
            const r = a.getBoundingClientRect();
            return r.top > -50 && r.top < window.innerHeight;
          });
          return viewportLinks.map(a => {
            const img = a.querySelector('img');
            const r = a.getBoundingClientRect();
            return {
              href: a.getAttribute('href'),
              tileW: r.width, tileH: r.height,
              imgW: img.getBoundingClientRect().width, imgH: img.getBoundingClientRect().height,
              naturalW: img.naturalWidth, naturalH: img.naturalHeight,
              src: img.currentSrc || img.src
            };
          });
        });
        require('fs').writeFileSync(`/tmp/browser/tiles-C/${slug}-${vp.name}-mid.json`, JSON.stringify(midResults,null,2));
      }

      await page.close();
    }
  }
  await browser.close();
  console.log('done');
})();
