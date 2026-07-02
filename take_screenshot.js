const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('http://localhost:8080/collection?group=serveware', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/mnt/documents/serveware_grid.png', fullPage: true });
  await browser.close();
})();
