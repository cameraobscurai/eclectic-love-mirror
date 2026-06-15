const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 }
  });
  const page = await context.newPage();
  const baseUrl = 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app';
  const paths = ['', '/atelier', '/contact', '/gallery'];

  for (const path of paths) {
    console.log(`Navigating to ${baseUrl}${path}...`);
    try {
        await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
        const filename = path === '' ? 'index' : path.substring(1);
        await page.screenshot({ path: `/tmp/browser/conv/${filename}.png`, fullPage: true });
        console.log(`Saved /tmp/browser/conv/${filename}.png`);
    } catch (e) {
        console.error(`Failed to capture ${path}: ${e.message}`);
    }
  }

  await browser.close();
})();
