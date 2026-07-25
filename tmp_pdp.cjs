const { chromium } = require('playwright');
const OUT = '/tmp/browser/audit-a';
(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1280,height:1800} });
  const page = await ctx.newPage();
  const errs=[];
  page.on('response', r=>{ if(r.status()>=400) errs.push(r.status()+' '+r.url()); });
  page.on('console', m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text()); });

  await page.goto('http://localhost:8080/collection/nathalie-black-spindle-dining-table-2788', { waitUntil:'load', timeout:20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/pdp-nathalie-1.png`, fullPage: true });

  // hero image size before/after thumb click
  const heroBox1 = await page.evaluate(() => {
    const img = document.querySelector('main img, [class*="hero"] img, [class*="gallery"] img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { w: r.width, h: r.height, src: img.src };
  });
  console.log('Hero box before:', JSON.stringify(heroBox1));

  const thumbs = await page.$$('[class*="thumb"] img, [class*="thumbnail"] img, aside img, [role="tablist"] img');
  console.log('Thumb count:', thumbs.length);
  if (thumbs.length > 1) {
    await thumbs[1].click().catch(()=>{});
    await page.waitForTimeout(600);
    const heroBox2 = await page.evaluate(() => {
      const img = document.querySelector('main img, [class*="hero"] img, [class*="gallery"] img');
      if (!img) return null;
      const r = img.getBoundingClientRect();
      return { w: r.width, h: r.height, src: img.src };
    });
    console.log('Hero box after click:', JSON.stringify(heroBox2));
    await page.screenshot({ path: `${OUT}/pdp-nathalie-2-afterthumb.png`, fullPage: true });
  }

  // back button test
  await page.goto('http://localhost:8080/collection?group=dining', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const linkSel = 'a[href*="nathalie"]';
  const link = await page.$(linkSel);
  if (link) { await link.click(); await page.waitForTimeout(1500); }
  await page.goBack({ waitUntil: 'load' }).catch(e=>console.log('goBack err', e.message));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/back-button-result.png`, fullPage: true });
  console.log('URL after back:', page.url());

  console.log('ERRORS overall:', JSON.stringify(errs.slice(0,20)));
  await browser.close();
})();
