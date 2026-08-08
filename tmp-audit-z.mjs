import { chromium } from 'playwright';

const groups = ['bars','lighting','chandeliers','candlelight','tableware','serveware','large-decor','styling','storage'];
const viewports = [{name:'desktop',width:1280,height:1800},{name:'mobile',width:390,height:844}];

const b = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });

const results = {};

for (const vp of viewports) {
  for (const g of groups) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const url = `http://localhost:8080/collection?group=${g}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch(e) {}
    await page.waitForTimeout(1500);
    // scroll to force lazy load
    await page.evaluate(async () => {
      const step = 400;
      let y = 0;
      const max = document.body.scrollHeight;
      while (y < max) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
        y += step;
      }
      window.scrollTo(0,0);
    });
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle').catch(()=>{});

    // gather tile info: find img elements in what looks like product tiles
    const data = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => {
        const r = img.getBoundingClientRect();
        const container = img.closest('a,[data-slot],[class*="tile"],[class*="card"]');
        let slug = null;
        if (container) {
          const a = container.tagName === 'A' ? container : container.querySelector('a');
          if (a && a.href) slug = a.href;
        }
        return {
          src: img.currentSrc || img.src,
          alt: img.alt,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          slug,
        };
      }).filter(d => d.rect.w > 40 && d.rect.h > 40);
    });

    results[`${g}__${vp.name}`] = { url, data };
    console.log(`${g} (${vp.name}): ${data.length} images`);
    await ctx.close();
  }
}

await b.close();
await import('fs').then(fs => fs.writeFileSync('/tmp/browser/tile-data.json', JSON.stringify(results, null, 2)));
