const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1800 });

  const routes = ['', 'collection', 'atelier', 'gallery', 'contact'];
  const baseUrl = 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/';

  for (const route of routes) {
    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      const fileName = route === '' ? 'home' : route;
      await page.screenshot({ path: `/tmp/browser/brand/${fileName}.png`, fullPage: false });
    } catch (e) {
      console.error(`Failed to screenshot ${route}:`, e);
    }
  }

  await browser.close();
})();
