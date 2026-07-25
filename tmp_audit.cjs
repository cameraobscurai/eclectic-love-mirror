const { chromium } = require('playwright');

const BASE = 'http://localhost:8080';
const OUT = '/tmp/browser/audit-a';

async function auditPage(browser, path, viewport, tag) {
  const ctx = await browser.newContext({ viewport, executablePath: undefined });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const netErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', res => { if (res.status() >= 400) netErrors.push(`${res.status()} ${res.url()}`); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  const url = BASE + path;
  let navErr = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) { navErr = e.message; }
  await page.waitForTimeout(1500);
  const shotPath = `${OUT}/${tag}.png`;
  try { await page.screenshot({ path: shotPath, fullPage: true }); } catch(e) {}

  console.log(`\n=== ${tag} (${path}) [${viewport.width}x${viewport.height}] ===`);
  if (navErr) console.log('NAV ERROR:', navErr);
  if (consoleErrors.length) console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0,20)));
  if (netErrors.length) console.log('NETWORK ERRORS:', JSON.stringify(netErrors.slice(0,20)));

  return { page, ctx, consoleErrors, netErrors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });

  // 1. Home desktop
  let r = await auditPage(browser, '/', { width:1280, height:1800 }, 'home-desktop');
  let page = r.page;
  // check hero video
  const videoInfo = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return null;
    return { paused: v.paused, readyState: v.readyState, currentTime: v.currentTime, src: v.currentSrc, w: v.videoWidth, h: v.videoHeight };
  });
  console.log('HERO VIDEO:', JSON.stringify(videoInfo));
  await page.waitForTimeout(2000);
  const videoInfo2 = await page.evaluate(() => {
    const v = document.querySelector('video');
    return v ? v.currentTime : null;
  });
  console.log('HERO VIDEO currentTime after 2s:', videoInfo2);

  // filmstrip - look for horizontal scroll galleries
  const filmstripEls = await page.$$eval('[class*="filmstrip"], [class*="carousel"], [class*="scroll"]', els => els.map(e => e.className).slice(0,10));
  console.log('Filmstrip-like elements:', JSON.stringify(filmstripEls));

  // category grid tiles alignment
  const tileInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('[class*="tile"], [class*="category"], a[href*="/collection"]'));
    return tiles.slice(0,20).map(t => {
      const r = t.getBoundingClientRect();
      return { tag: t.tagName, cls: t.className.slice(0,60), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    });
  });
  console.log('Tiles sample:', JSON.stringify(tileInfo));

  // nav hover glitch check - hover each nav link
  const navLinks = await page.$$('nav a');
  console.log('Nav link count:', navLinks.length);
  for (let i=0;i<Math.min(navLinks.length,6);i++) {
    try {
      await navLinks[i].hover();
      await page.waitForTimeout(200);
    } catch(e) {}
  }
  await page.screenshot({ path: `${OUT}/home-desktop-nav-hover.png` });

  // contrast scan (basic heuristic): find elements with very light text on light bg
  const contrastIssues = await page.evaluate(() => {
    function luminance(rgb) {
      const m = rgb.match(/\d+/g);
      if (!m) return null;
      const [r,g,b] = m.map(Number);
      return 0.2126*r+0.7152*g+0.0722*b;
    }
    const issues = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.children.length > 0) return;
      const text = el.textContent.trim();
      if (!text || text.length < 2) return;
      const style = getComputedStyle(el);
      const color = style.color;
      let bg = style.backgroundColor;
      let parent = el;
      while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && parent.parentElement) {
        parent = parent.parentElement;
        bg = getComputedStyle(parent).backgroundColor;
      }
      const lc = luminance(color);
      const lb = luminance(bg);
      if (lc !== null && lb !== null && Math.abs(lc-lb) < 40) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          issues.push({ text: text.slice(0,40), color, bg, tag: el.tagName, cls: (el.className+'').slice(0,50) });
        }
      }
    });
    return issues.slice(0, 15);
  });
  console.log('CONTRAST ISSUES (heuristic):', JSON.stringify(contrastIssues, null, 1));

  await r.ctx.close();

  // 2. Home mobile
  r = await auditPage(browser, '/', { width:390, height:844 }, 'home-mobile');
  await r.ctx.close();

  // 3. Collection desktop
  r = await auditPage(browser, '/collection', { width:1280, height:1800 }, 'collection-desktop');
  page = r.page;
  // grab PDP links
  const pdpLinks = await page.$$eval('a[href*="/collection/"]', as => Array.from(new Set(as.map(a=>a.getAttribute('href')))).filter(h=>h && h.split('/').length>2));
  console.log('PDP links found:', JSON.stringify(pdpLinks.slice(0,10)));
  // tile sizing consistency in grid
  const gridTiles = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a[href*="/collection/"]'));
    return cards.map(c => {
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  console.log('Collection grid tile sizes:', JSON.stringify(gridTiles));
  // try quickview - look for quickview buttons
  const qvBtn = await page.$('[class*="quick" i], button:has-text("Quick"), [aria-label*="Quick" i]');
  if (qvBtn) {
    await qvBtn.click().catch(()=>{});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/collection-quickview.png` });
    const modalVisible = await page.$('[role="dialog"], [class*="modal" i]');
    console.log('Quickview modal opened:', !!modalVisible);
  } else {
    console.log('No quickview button found on collection page');
  }
  await r.ctx.close();

  fsWritePdpLinks(pdpLinks);

  await browser.close();
})();

function fsWritePdpLinks(links) {
  require('fs').writeFileSync('/tmp/pdp-links.json', JSON.stringify(links));
}
