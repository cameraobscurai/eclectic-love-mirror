const { chromium } = require('playwright');

(async () => {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkIssues = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', resp => { if (resp.status() >= 400) networkIssues.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  if (storageKey && sessionJson) {
    await page.evaluate(({k,v}) => localStorage.setItem(k, v), { k: storageKey, v: sessionJson });
  }

  const log = (...a) => console.log(...a);

  // Find real inquiries route via sidebar click
  await page.goto('http://localhost:8080/admin', { waitUntil: 'networkidle' });
  await page.click('text=INQUIRIES & INSIGHTS').catch(e=>log('click inq err', e.message));
  await page.waitForTimeout(1500);
  log('INQUIRIES URL:', page.url());
  await page.screenshot({ path: '/tmp/browser/audit-c/05b-inquiries-real.png', fullPage: true });
  log('inquiries console errors', JSON.stringify(consoleErrors));
  log('inquiries network issues', JSON.stringify(networkIssues));

  // Products page - group filter, search
  consoleErrors.length = 0; networkIssues.length = 0;
  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Try group filter: Tableware
  const groupSelectors = ['select', '[role="combobox"]', 'button:has-text("Category")', 'button:has-text("Group")'];
  let filtered = false;
  for (const sel of groupSelectors) {
    const el = await page.$(sel);
    if (el) { log('found filter control:', sel); break; }
  }
  // try clicking a "Tableware" text/link if present as filter chip
  const tablewareChip = await page.$('text=Tableware');
  if (tablewareChip) {
    await tablewareChip.click().catch(()=>{});
    await page.waitForTimeout(1000);
    filtered = true;
  }
  log('URL after tableware click attempt:', page.url());
  await page.screenshot({ path: '/tmp/browser/audit-c/06-products-tableware-filter.png', fullPage: true });

  // Try URL param approach
  await page.goto('http://localhost:8080/admin/products?cat=tableware', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const rowCountTableware = await page.locator('table tbody tr, [data-testid="product-row"], .product-row').count().catch(()=>-1);
  log('rowCountTableware via url param:', rowCountTableware);
  await page.screenshot({ path: '/tmp/browser/audit-c/06b-products-tableware-url.png', fullPage: true });

  // Global search
  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  const searchInput = await page.$('input[type="search"], input[placeholder*="Search" i]');
  if (searchInput) {
    await searchInput.fill('chair');
    await page.waitForTimeout(1200);
    log('search results rowcount', await page.locator('table tbody tr, [data-testid="product-row"]').count().catch(()=>-1));
    await page.screenshot({ path: '/tmp/browser/audit-c/07-search-chair.png', fullPage: true });
  } else {
    log('NO SEARCH INPUT FOUND on products page');
  }
  log('products console errors', JSON.stringify(consoleErrors));
  log('products network issues', JSON.stringify(networkIssues));

  await browser.close();
})();
