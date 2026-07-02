const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1800 }
  });
  await page.goto('http://localhost:8080/collection?group=cocktail-bar', { waitUntil: 'networkidle' });
  // Wait a bit for images to load
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/mnt/documents/photo-audit/bars_grid.png', fullPage: false });
  await browser.close();
})();
