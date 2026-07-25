const { chromium } = require('playwright');
const BASE = 'http://localhost:8080';
const OUT = '/tmp/browser/audit-a';

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1280,height:1800} });
  const page = await ctx.newPage();
  const net400 = [];
  page.on('response', r=>{ if(r.status()>=400) net400.push(r.status()+' '+r.url()); });
  page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE:', m.text()); });

  await page.goto(BASE+'/collection?group=dining&subcategory=all&q=&sort=type&layout=grid&view=', { waitUntil:'load', timeout:20000 }).catch(e=>console.log(e.message));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/collection-dining.png`, fullPage: true });
  console.log('NET ERRORS:', JSON.stringify(net400));

  const productLinks = await page.$$eval('a', as => as.map(a=>a.getAttribute('href')).filter(h=>h && /\/collection\/[a-z0-9-]+-\d+/.test(h)));
  console.log('Product links:', JSON.stringify([...new Set(productLinks)]));

  await browser.close();
})();
