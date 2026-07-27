import { chromium } from 'playwright';
const KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
(async () => {
  const browser = await chromium.launch({executablePath:'/nix/store/2zqa6kavc8znbgrac1l3pix9lwr3w5nj-playwright-chromium/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await browser.newContext();
  await ctx.addInitScript(([k,v]) => { window.localStorage.setItem(k, v); }, [KEY, SESSION]);
  const page = await ctx.newPage();
  const netCounts = {};
  page.on('request', r => { const u=r.url(); if(u.includes('serverFn')||u.includes('supabase')){ netCounts[u]=(netCounts[u]||0)+1; } });
  const consoleErrs = [];
  page.on('console', m => { if (m.type()==='error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => consoleErrs.push('PAGEERROR: '+e.message));

  await page.goto('http://localhost:8080/admin/products', { waitUntil: 'networkidle', timeout: 45000 });
  console.log('URL1:', page.url());
  await page.screenshot({ path: '/tmp/1-products.png' });

  await page.fill('input[placeholder*="Search title"]', 'chair').catch(e=>console.log('fill err', e.message));
  await page.click('button[type=submit]').catch(e=>console.log('click err', e.message));
  await page.waitForTimeout(1200);
  console.log('URL2 (after search):', page.url());
  await page.screenshot({ path: '/tmp/2-search.png' });

  // test back button syncing search box
  await page.goBack();
  await page.waitForTimeout(800);
  const inputVal = await page.locator('input[placeholder*="Search title"]').inputValue().catch(()=>null);
  console.log('URL after back:', page.url(), 'input value still shows:', inputVal);

  await page.goForward();
  await page.waitForTimeout(800);

  const row = page.locator('tbody tr').first();
  await row.click({timeout:10000}).catch(e=>console.log('row click err', e.message));
  await page.waitForTimeout(1200);
  console.log('URL after row click:', page.url());
  await page.screenshot({ path: '/tmp/3-drawer.png' });

  // toggle a field then try closing via Escape to test unsaved warning
  const titleInput = page.locator('#f-title');
  if (await titleInput.count()) {
    await titleInput.fill('TEST EDIT XYZ');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/4-discard-confirm.png' });
    console.log('discard dialog visible?', await page.locator('text=unsaved change').isVisible().catch(()=>false));
  }

  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrs.slice(0,15)));
  console.log('DUPLICATE FETCH CHECK:', Object.entries(netCounts).filter(([,c])=>c>1));

  await browser.close();
})();
