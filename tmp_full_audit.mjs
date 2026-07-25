import { chromium } from 'playwright';
import fs from 'fs';

const routes = ['/atelier','/gallery','/contact','/stylebrief','/faq','/privacy'];
const results = [];

async function auditPage(browser, viewport, name, url) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const netErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', res => { if (res.status() >= 400) netErrors.push(res.status()+' '+res.url()); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: '+err.message));
  try {
    await page.goto('http://localhost:8080'+url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(()=>{});
  } catch(e) { consoleErrors.push('NAV ERROR: '+e.message); }
  await page.waitForTimeout(1500);
  let title='ERR', meta={}, brokenImgs=[];
  try { title = await page.title(); } catch(e){}
  try {
    meta = await page.evaluate(() => {
      const get = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
      return {
        description: get('meta[name="description"]'),
        ogTitle: get('meta[property="og:title"]'),
        ogImage: get('meta[property="og:image"]'),
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
      };
    });
  } catch(e) { meta = {error: e.message}; }
  try {
    brokenImgs = await page.evaluate(() => {
      return Array.from(document.images).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
    });
  } catch(e) { brokenImgs = ['eval error: '+e.message]; }
  const fname = `/tmp/browser/audit-b/${name}.png`;
  try { await page.screenshot({ path: fname, fullPage: true, timeout: 15000 }); }
  catch(e) { consoleErrors.push('SCREENSHOT ERR: '+e.message); }
  results.push({ url, viewport: viewport.width+'x'+viewport.height, title, meta, consoleErrors, netErrors, brokenImgs, screenshot: fname });
  await ctx.close();
}

const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });

const desktop = { width: 1280, height: 1800 };
const mobile = { width: 390, height: 844 };

for (const r of routes) {
  const safe = r.replace(/\//g,'_') || 'home';
  try { await auditPage(browser, desktop, 'desktop'+safe, r); } catch(e) { console.log('FAIL desktop', r, e.message); }
  try { await auditPage(browser, mobile, 'mobile'+safe, r); } catch(e) { console.log('FAIL mobile', r, e.message); }
}

// gallery project detail pages
let uniqueLinks = [];
try {
  const ctx = await browser.newContext({ viewport: desktop });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8080/gallery', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/gallery/"]')).map(a=>a.getAttribute('href')).filter(Boolean);
  });
  uniqueLinks = [...new Set(links)].slice(0,3);
  await ctx.close();
} catch(e) { console.log('gallery link discovery failed', e.message); }
console.log('gallery detail links found:', uniqueLinks);

for (const link of uniqueLinks) {
  const safe = 'detail'+link.replace(/\//g,'_');
  try { await auditPage(browser, desktop, 'desktop_'+safe, link); } catch(e) { console.log('FAIL', link, e.message); }
  try { await auditPage(browser, mobile, 'mobile_'+safe, link); } catch(e) { console.log('FAIL', link, e.message); }
}

await browser.close();
fs.writeFileSync('/tmp/browser/audit-b/results.json', JSON.stringify(results, null, 2));
console.log('DONE');
