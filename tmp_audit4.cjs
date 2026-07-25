const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const page = await (await browser.newContext()).newPage();
  const reqs = [];
  page.on('response', r => reqs.push(r.status()+' '+r.url()));
  await page.goto('http://localhost:8080/collection?group=dining', { waitUntil: 'load', timeout: 20000 }).catch(e=>console.log(e.message));
  await page.waitForTimeout(3000);
  console.log(reqs.filter(r => r.includes('supabase') || r.includes('catalog')).join('\n'));
  await browser.close();
})();
