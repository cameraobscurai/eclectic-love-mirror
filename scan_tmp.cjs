const { chromium } = require('playwright');

const pages = [
  '/collection/large-decor',
  '/collection/styling',
  '/collection/storage',
  '/collection',
];
const viewports = [
  { name: 'desktop', width: 1280, height: 1800 },
  { name: 'mobile', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    for (const path of pages) {
      const url = `http://localhost:8080${path}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        console.log(`ERROR loading ${url}: ${e.message}`);
        continue;
      }
      await page.waitForTimeout(800);
      const slug = path.replace(/\//g, '_') || '_root';
      const shotPath = `/tmp/browser/tiles-D/${slug}__${vp.name}.png`;
      await page.screenshot({ path: shotPath, fullPage: false });

      // measure tiles - try common selectors
      const data = await page.evaluate(() => {
        function guessTiles() {
          const candidates = [
            '[class*="tile"]', '[class*="card"]', 'a[href*="/product/"]',
            'a[href*="/collection/"]', '[data-testid*="tile"]', '[class*="grid"] > a', '[class*="grid"] > div'
          ];
          let best = [];
          for (const sel of candidates) {
            const els = Array.from(document.querySelectorAll(sel));
            if (els.length > best.length && els.length < 200) best = els;
          }
          return best;
        }
        const tiles = guessTiles();
        const results = [];
        for (const t of tiles.slice(0, 40)) {
          const rect = t.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) continue;
          const img = t.querySelector('img');
          let imgData = null;
          if (img) {
            const irect = img.getBoundingClientRect();
            imgData = {
              src: img.currentSrc || img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              renderedWidth: irect.width,
              renderedHeight: irect.height,
              objectFit: getComputedStyle(img).objectFit,
            };
          }
          results.push({
            tag: t.tagName,
            cls: t.className && t.className.toString().slice(0, 80),
            href: t.getAttribute('href'),
            bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            img: imgData,
          });
        }
        return results;
      });
      console.log(`\n=== ${path} [${vp.name}] === tiles found: ${data.length}`);
      console.log(JSON.stringify(data, null, 1));
    }
    await context.close();
  }
  await browser.close();
})();
