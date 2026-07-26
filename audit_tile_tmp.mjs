import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'chrome'});
const page = await browser.newPage({ viewport: { width: 1380, height: 900 } });
await page.goto('http://localhost:8080/collection?group=lounge-seating&subcategory=sofas-loveseats&q=&sort=type&layout=grid&view=', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/grid.png', fullPage: false });

const data = await page.evaluate(() => {
  const tiles = Array.from(document.querySelectorAll('li'));
  return tiles.slice(0, 12).map(li => {
    const title = li.querySelector('p')?.textContent || '';
    const img = li.querySelector('img');
    const media = li.querySelector('.product-tile-media');
    if (!img || !media) return { title, none: true };
    const mRect = media.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    return {
      title,
      mediaW: mRect.width, mediaH: mRect.height,
      transform: getComputedStyle(img).transform,
      imgNaturalW: img.naturalWidth, imgNaturalH: img.naturalHeight,
      imgRectW: iRect.width, imgRectH: iRect.height,
    };
  });
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
