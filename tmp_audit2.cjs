const { chromium } = require('playwright');
const BASE = 'http://localhost:8080';
const OUT = '/tmp/browser/audit-a';

async function go(page, path) {
  try { await page.goto(BASE+path, { waitUntil: 'load', timeout: 20000 }); } catch(e) { console.log('goto err', e.message); }
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1280,height:1800} });
  const page = await ctx.newPage();
  page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE ERR:', m.text()); });
  page.on('response', r=>{ if(r.status()>=400) console.log('NET ERR:', r.status(), r.url()); });
  await go(page, '/collection');
  await page.screenshot({ path: `${OUT}/collection-desktop2.png`, fullPage: true });

  const html = await page.content();
  require('fs').writeFileSync('/tmp/collection.html', html);

  const anchors = await page.$$eval('a', as => as.map(a=>a.getAttribute('href')).filter(Boolean));
  console.log('All anchors count:', anchors.length);
  console.log(JSON.stringify(anchors.filter(h=>h.includes('collection')).slice(0,20)));

  await browser.close();
})();
