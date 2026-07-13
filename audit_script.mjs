import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/bin/chromium',
    args: ['--no-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 }
  });

  const routes = ['faq', 'privacy', 'process', 'this-route-does-not-exist-xyz'];
  const results = {};

  for (const route of routes) {
    const page = await context.newPage();
    const url = `http://localhost:8080/${route}`;
    
    const errors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && 
          !text.includes('React DevTools') && 
          !text.includes('[vite]') && 
          !text.includes('hydration') && 
          !text.includes('non-static position') && 
          !text.includes('google-analytics') && 
          !text.includes('googletagmanager')) {
        errors.push(`Console: ${text}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`PageError: ${err.message}`);
    });

    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        if (route === 'this-route-does-not-exist-xyz' && status === 404) return;
        networkErrors.push(`${status} ${response.url()}`);
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
      const content = await page.innerText('body');
      
      const screenshotPath = `/tmp/browser/audit-secondary/${route.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: screenshotPath });

      let specialCheck = null;
      if (route === 'this-route-does-not-exist-xyz') {
        const bg = await page.evaluate(() => {
          const el = document.querySelector('main') || document.body.firstElementChild || document.body;
          return window.getComputedStyle(el).backgroundColor;
        });
        const has404 = await page.isVisible('text=404');
        const goHome = await page.locator('text=GO HOME');
        const goHomeVisible = await goHome.isVisible();
        let goHomeWorks = false;
        if (goHomeVisible) {
          await goHome.click();
          await page.waitForTimeout(1000);
          goHomeWorks = page.url() === 'http://localhost:8080/' || page.url() === 'http://localhost:8080';
        }
        specialCheck = { bg, has404, goHomeVisible, goHomeWorks };
      }

      results[route] = {
        title,
        description,
        errors,
        networkErrors,
        contentLength: content.length,
        specialCheck
      };
    } catch (e) {
      results[route] = { error: e.message };
    }
    await page.close();
  }

  process.stdout.write(JSON.stringify(results, null, 2));
  await browser.close();
})();
