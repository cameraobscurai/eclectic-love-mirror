const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1800 });

  const routes = ['', 'collection', 'atelier', 'gallery', 'contact'];
  const baseUrl = 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/';

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const fileName = route === '' ? 'home' : route;
    await page.screenshot({ path: `/tmp/browser/brand/${fileName}.png`, fullPage: false });
  }

  await browser.close();
})();
