const { chromium } = require('playwright');
const routes = ['/collection/pillows-throws','/collection/rugs','/collection/furs-pelts'];
const viewports = [{name:'desktop',width:1280,height:1800},{name:'mobile',width:390,height:844}];
(async () => {
  const browser = await chromium.launch({executablePath:'/nix/store/2zqa6kavc8znbgrac1l3pix9lwr3w5nj-playwright-chromium/chrome-linux/chrome', args:['--no-sandbox']});
  for (const route of routes) {
    for (const vp of viewports) {
      const page = await browser.newPage({viewport:{width:vp.width,height:vp.height}});
      await page.goto('http://localhost:8080'+route, {waitUntil:'networkidle'});
      await page.waitForTimeout(1200);
      const slug = route.split('/').pop();
      const results = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.slice(0,30).map(img => {
          let el = img;
          for (let i=0;i<4 && el.parentElement;i++) el = el.parentElement;
          const r = el.getBoundingClientRect();
          const ir = img.getBoundingClientRect();
          return {
            tileW:r.width, tileH:r.height,
            imgW:ir.width, imgH:ir.height,
            naturalW: img.naturalWidth, naturalH: img.naturalHeight,
            src: (img.currentSrc||img.src||'').slice(-70),
            alt: img.alt
          };
        });
      });
      require('fs').writeFileSync(`/tmp/browser/tiles-C/${slug}-${vp.name}.json`, JSON.stringify(results,null,2));
      await page.close();
    }
  }
  await browser.close();
  console.log('done2');
})();
