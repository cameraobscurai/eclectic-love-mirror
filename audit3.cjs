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

  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });

  // Proper search: fill + click Search button
  await page.fill('input[placeholder*="Search"]', 'chair');
  await page.click('button:has-text("Search")');
  await page.waitForTimeout(1200);
  const rows = await page.locator('table tbody tr').allTextContents();
  const nonChair = rows.filter(r => !/chair/i.test(r));
  log('SEARCH TEST: total rows', rows.length, 'non-matching rows:', nonChair.length);
  await page.screenshot({ path: '/tmp/browser/audit-c/07b-search-proper.png', fullPage: true });

  // Category filter dropdown - select Tableware
  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  const catSelect = await page.$('select');
  const options = await page.$$eval('select option', opts => opts.map(o => ({value:o.value, text:o.textContent})));
  log('CATEGORY OPTIONS:', JSON.stringify(options));
  const tablewareOpt = options.find(o => /tableware/i.test(o.text));
  if (tablewareOpt) {
    await page.selectOption('select', tablewareOpt.value);
    await page.waitForTimeout(1200);
    const rows2 = await page.locator('table tbody tr').allTextContents();
    log('TABLEWARE FILTER: rows returned:', rows2.length, 'sample:', rows2.slice(0,3));
    await page.screenshot({ path: '/tmp/browser/audit-c/08-tableware-filter.png', fullPage: true });
  } else {
    log('NO TABLEWARE OPTION FOUND');
  }

  // Open a product drawer
  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  await page.click('table tbody tr:first-child');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/browser/audit-c/09-drawer-open.png', fullPage: true });
  log('drawer open url', page.url());
  log('console errors after opening drawer', JSON.stringify(consoleErrors));

  await browser.close();
})();
