import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:8080';
const SLUGS = [
  { cat: 'seating', slug: 'adelaide-antique-arm-chair-2970' },
  { cat: 'seating', slug: 'alora-botanical-sculptural-chair-3709' },
  { cat: 'tables', slug: 'aaron-matte-black-plank-coffee-table-2861' },
  { cat: 'tables', slug: 'abigale-dark-side-table-2994' },
  { cat: 'bars', slug: 'amisa-midnight-bar-3146' },
  { cat: 'bars', slug: 'arcus-bevin-12-slatted-bar-2816' },
  { cat: 'lighting', slug: 'amitola-led-corner-light' },
  { cat: 'lighting', slug: 'annu-40-walnut-hoop-chandelier-4046' },
  { cat: 'chandeliers', slug: 'amina-15-pendant-lantern-3452' },
  { cat: 'rugs', slug: 'atlas-8x10-turkish-rug-1630' },
  { cat: 'rugs', slug: 'byron-7x7-black-hide-rug-394' },
  { cat: 'tableware', slug: 'adonis-glassware' },
  { cat: 'tableware', slug: 'akoya' },
  { cat: 'serveware', slug: 'alexander-decanter-590' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 1800 },
  { name: 'mobile', width: 390, height: 844 },
];

const results = [];

const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });

function luminance([r,g,b]){
  const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function parseRgb(str){
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(s=>parseFloat(s.trim()));
  return parts;
}
function contrastRatio(c1, c2){
  const l1 = luminance(c1)+0.05;
  const l2 = luminance(c2)+0.05;
  return l1>l2 ? l1/l2 : l2/l1;
}

for (const { cat, slug } of SLUGS) {
  for (const vp of VIEWPORTS) {
    for (const mode of ['quickview', 'pdp']) {
      const url = mode === 'quickview' ? `${BASE}/collection?view=${slug}` : `${BASE}/collection/${slug}`;
      const entry = { cat, slug, vp: vp.name, mode, url, console: [], network: [], notes: [] };
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.on('console', msg => { if (msg.type() === 'error') entry.console.push(msg.text().slice(0,300)); });
      page.on('response', res => { if (res.status() >= 400) entry.network.push(`${res.status()} ${res.url().slice(0,150)}`); });
      page.on('pageerror', err => entry.console.push('PAGEERROR: ' + String(err).slice(0,300)));
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      } catch (e) {
        entry.notes.push('goto timeout/error: ' + e.message.slice(0,200));
      }
      await page.waitForTimeout(1200);

      // body scroll lock check (only for quickview)
      if (mode === 'quickview') {
        const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow + '/' + getComputedStyle(document.documentElement).overflow);
        entry.bodyOverflow = bodyOverflow;
        // check modal presence
        const modalSel = '[role="dialog"], [data-quickview], .quickview, [aria-modal="true"]';
        const modalCount = await page.locator(modalSel).count();
        entry.modalFound = modalCount;
        if (modalCount === 0) entry.notes.push('NO MODAL/DIALOG ELEMENT FOUND for quickview URL');

        // Escape test
        if (modalCount > 0) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          const stillOpen = await page.locator(modalSel).count();
          entry.escapeCloses = stillOpen === 0;
          // reload for further checks
          await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(()=>{});
          await page.waitForTimeout(1000);
        }

        // focus trap: tab many times, check focus stays within dialog
        const dialog = page.locator(modalSel).first();
        if (await dialog.count() > 0) {
          const focusInDialog = await page.evaluate(() => {
            const dlg = document.querySelector('[role="dialog"], [aria-modal="true"]');
            if (!dlg) return null;
            let outside = 0;
            const active0 = document.activeElement;
            return null;
          });
          for (let i=0;i<15;i++){ await page.keyboard.press('Tab'); }
          const afterTabInside = await page.evaluate(() => {
            const dlg = document.querySelector('[role="dialog"], [aria-modal="true"]');
            if (!dlg) return null;
            return dlg.contains(document.activeElement);
          });
          entry.focusTrapHoldsAfter15Tabs = afterTabInside;
        }
      }

      // image clipping in stage: find main product image container
      const imgSel = mode === 'quickview'
        ? '[role="dialog"] img, [aria-modal="true"] img'
        : 'main img, article img';
      const imgs = await page.locator(imgSel).all();
      let heroBox = null, heroNatural = null;
      if (imgs.length > 0) {
        try {
          heroBox = await imgs[0].boundingBox();
          heroNatural = await imgs[0].evaluate(el => ({ nw: el.naturalWidth, nh: el.naturalHeight, ow: el.offsetWidth, oh: el.offsetHeight, objFit: getComputedStyle(el).objectFit, bg: getComputedStyle(el.parentElement).backgroundColor }));
        } catch {}
      }
      entry.heroBox = heroBox;
      entry.heroNatural = heroNatural;
      entry.imgCount = imgs.length;

      // mat color check: sample stage background vs a known white/grey
      const stageSel = mode === 'quickview' ? '[role="dialog"]' : 'main';
      const stageBg = await page.locator(stageSel).first().evaluate(el => {
        let node = el;
        while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement;
        return node ? getComputedStyle(node).backgroundColor : null;
      }).catch(() => null);
      entry.stageBg = stageBg;

      // text contrast: scan all text nodes' parent elements visible in viewport, compute contrast
      const contrastIssues = await page.evaluate(() => {
        function luminance([r,g,b]){
          const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
          return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
        }
        function parseRgb(str){
          const m = str.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          return m[1].split(',').map(s=>parseFloat(s.trim()));
        }
        function bgOf(el){
          let node = el;
          while (node) {
            const c = getComputedStyle(node).backgroundColor;
            const p = parseRgb(c);
            if (p && (p[3] === undefined || p[3] > 0.5)) return p;
            node = node.parentElement;
          }
          return [255,255,255];
        }
        const root = document.querySelector('[role="dialog"], [aria-modal="true"]') || document.querySelector('main') || document.body;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        const issues = [];
        let n = 0;
        while (walker.nextNode() && n < 4000) {
          n++;
          const el = walker.currentNode;
          if (!el.textContent || !el.textContent.trim()) continue;
          const hasDirectText = Array.from(el.childNodes).some(c => c.nodeType === 3 && c.textContent.trim());
          if (!hasDirectText) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          const opacity = parseFloat(style.opacity);
          const fg = parseRgb(style.color);
          if (!fg) continue;
          const bg = bgOf(el);
          const l1 = luminance(fg)+0.05, l2 = luminance(bg)+0.05;
          let ratio = l1>l2?l1/l2:l2/l1;
          if (opacity < 1) ratio = 1 + (ratio-1)*opacity;
          const fontSize = parseFloat(style.fontSize);
          const isLarge = fontSize >= 18.66 || (fontSize >= 14 && parseFloat(style.fontWeight) >= 700);
          const threshold = isLarge ? 3 : 4.5;
          if (ratio < threshold) {
            issues.push({ text: el.textContent.trim().slice(0,60), color: style.color, bg: `rgb(${bg.join(',')})`, ratio: ratio.toFixed(2), fontSize, opacity, tag: el.tagName });
          }
        }
        return issues.slice(0, 20);
      });
      entry.contrastIssues = contrastIssues;

      // specs presence (PDP): look for dimension text
      if (mode === 'pdp') {
        const bodyText = await page.evaluate(() => document.body.innerText);
        entry.hasDimensions = /\d+["'′″]|\bW x\b|\bWx\b|dimensions/i.test(bodyText);
        entry.title404 = /not in the archive|404/i.test(bodyText);
        // breadcrumb / back nav
        const backLinks = await page.locator('a[href="/collection"], a:has-text("Back"), nav[aria-label*="readcrumb"]').count();
        entry.backNavCount = backLinks;
      }

      // thumbnail strip alignment (both modes potentially)
      const thumbSel = mode === 'quickview' ? '[role="dialog"] [class*="thumb" i], [aria-modal="true"] [class*="thumb" i]' : '[class*="thumb" i]';
      const thumbCount = await page.locator(thumbSel).count();
      entry.thumbCount = thumbCount;
      if (thumbCount > 1) {
        const boxes = [];
        const thumbs = await page.locator(thumbSel).all();
        for (const t of thumbs.slice(0, 8)) {
          const b = await t.boundingBox();
          if (b) boxes.push(b.y);
        }
        const uniqueY = new Set(boxes.map(y => Math.round(y)));
        entry.thumbMisaligned = uniqueY.size > 1;
        entry.thumbYs = boxes;
      }

      // screenshot
      const shotName = `/tmp/browser/${mode}-${vp.name}-${slug}.png`.replace(/\s+/g,'-');
      try {
        await page.screenshot({ path: shotName });
        entry.screenshot = shotName;
      } catch (e) { entry.notes.push('screenshot failed: ' + e.message); }

      results.push(entry);
      await context.close();
    }
  }
}

await browser.close();
fs.writeFileSync('/tmp/browser/audit-results.json', JSON.stringify(results, null, 2));
console.log('DONE', results.length);
