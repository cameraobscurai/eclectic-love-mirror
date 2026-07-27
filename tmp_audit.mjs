import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({executablePath:'/nix/store/2zqa6kavc8znbgrac1l3pix9lwr3w5nj-playwright-chromium/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await browser.newContext({ storageState: process.env.PLAYWRIGHT_AUTH || undefined });
  const page = await ctx.newPage();
  const netlog = [];
  page.on('request', r => { if (r.url().includes('supabase') || r.url().includes('_serverFn')) netlog.push(r.method()+' '+r.url()); });
  const consoleErrs = [];
  page.on('console', m => { if (m.type()==='error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => consoleErrs.push('PAGEERROR: '+e.message));

  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/1-products.png' });
  console.log('URL after load:', page.url());

  // search
  await page.fill('input[placeholder*="Search title"]', 'chair');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/2-search.png' });
  console.log('URL after search:', page.url());

  // category filter
  const catSelect = page.locator('select').first();
  const opts = await catSelect.locator('option').allTextContents();
  console.log('categories:', opts.slice(0,5));
  if (opts.length > 1) {
    await catSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: '/tmp/3-catfilter.png' });
  console.log('URL after cat filter:', page.url());

  // click a row to open drawer
  const row = page.locator('tbody tr').first();
  await row.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/4-drawer.png' });
  console.log('drawer open, url:', page.url());

  console.log('CONSOLE ERRORS:', consoleErrs.slice(0,20));
  console.log('NET COUNT:', netlog.length);
  console.log(netlog.slice(0,30));

  await browser.close();
})();
