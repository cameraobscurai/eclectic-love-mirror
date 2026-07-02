const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1000 });
  try {
    await page.goto('http://localhost:8080/collection?group=serveware', { waitUntil: 'networkidle', timeout: 30000 });
    // Wait a bit more for images to load just in case
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/documents/serveware_grid.png', fullPage: false });
  } catch (e) {
    console.error('Error taking screenshot:', e);
  } finally {
    await browser.close();
  }
})();
