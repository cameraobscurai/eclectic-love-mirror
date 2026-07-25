const { chromium } = require('playwright');

(async () => {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  if (cookiesJson) {
    try {
      const cookies = JSON.parse(cookiesJson);
      await context.addCookies(cookies);
    } catch (e) { console.log('cookie parse err', e.message); }
  }

  const page = await context.newPage();
  const consoleErrors = [];
  const networkIssues = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', resp => {
    const status = resp.status();
    if (status >= 400) networkIssues.push(`${status} ${resp.request().method()} ${resp.url()}`);
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  // Go to base first to set localStorage
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' }).catch(e=>console.log('nav err', e.message));

  if (storageKey && sessionJson) {
    await page.evaluate(({k,v}) => {
      try { localStorage.setItem(k, v); } catch(e) {}
    }, { k: storageKey, v: sessionJson });
  }

  const results = {};

  async function visit(route, name) {
    consoleErrors.length = 0;
    networkIssues.length = 0;
    try {
      await page.goto(`http://localhost:8080${route}`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      console.log(`nav timeout ${route}: ${e.message}`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/browser/audit-c/${name}.png`, fullPage: true }).catch(()=>{});
    results[route] = {
      consoleErrors: [...consoleErrors],
      networkIssues: [...networkIssues],
      url: page.url(),
      title: await page.title().catch(()=>''),
    };
  }

  await visit('/admin', '01-admin-dashboard');
  await visit('/admin/products', '02-admin-products');
  await visit('/admin/photos', '03-admin-photos');
  await visit('/admin/gallery', '04-admin-gallery');
  await visit('/admin/inquiries', '05-admin-inquiries');

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
