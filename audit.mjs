import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const dir = '/mnt/documents/covers-audit';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const viewports = [
    { name: 'desktop', width: 1280, height: 1800 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:8080/collection', { waitUntil: 'networkidle' });
    
    // Wait for images to load
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: path.join(dir, `full-${vp.name}.png`), fullPage: true });

    if (vp.name === 'desktop') {
      const tiles = await page.evaluate(() => {
        const grid = document.querySelector('[data-tonal-grid]');
        if (!grid) return [];
        const buttons = Array.from(grid.querySelectorAll('button'));
        return buttons.map(btn => {
          const img = btn.querySelector('img');
          const label = btn.querySelector('span')?.innerText;
          const rect = btn.getBoundingClientRect();
          const imgRect = img ? img.getBoundingClientRect() : null;
          const computedStyle = window.getComputedStyle(btn);
          const imgStyle = img ? window.getComputedStyle(img) : null;
          
          return {
            label,
            tileWidth: rect.width,
            tileHeight: rect.height,
            imgWidth: imgRect ? imgRect.width : 0,
            imgHeight: imgRect ? imgRect.height : 0,
            naturalWidth: img ? img.naturalWidth : 0,
            naturalHeight: img ? img.naturalHeight : 0,
            padding: imgStyle ? imgStyle.padding : 'N/A',
            objectFit: imgStyle ? imgStyle.objectFit : 'N/A',
            src: img ? img.src : null
          };
        });
      });
      console.log('TILES_JSON_START');
      console.log(JSON.stringify(tiles, null, 2));
      console.log('TILES_JSON_END');
    }
    await page.close();
  }

  await browser.close();
})();
