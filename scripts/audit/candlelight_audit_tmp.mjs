import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto('http://localhost:8080/collection?group=lighting&subcategory=candlelight', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
for (let i=0;i<10;i++){
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1000);

const tiles = await page.evaluate(async () => {
  async function loadImageData(url, nw, nh) {
    const resp = await fetch(url, { mode: 'cors' });
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0,0,bitmap.width,bitmap.height);
  }
  const cards = Array.from(document.querySelectorAll('li')).filter(a => a.querySelector('img'));
  const results = [];
  const seen = new Set();
  for (const card of cards) {
    const img = card.querySelector('img');
    const rect = img.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 80) continue;
    if (seen.has(img.src)) continue;
    const title = card.querySelector('[class*="title" i], h3, h4')?.textContent?.trim() || card.textContent.trim().slice(0,60);
    let imgData;
    try { imgData = await loadImageData(img.src); } catch(e) { results.push({title, error: String(e)}); continue; }
    seen.add(img.src);
    const { width: nw, height: nh, data } = imgData;
    let minX=nw, minY=nh, maxX=-1, maxY=-1;
    for (let y=0;y<nh;y+=2) {
      for (let x=0;x<nw;x+=2) {
        const idx = (y*nw+x)*4;
        const r=data[idx],g=data[idx+1],b=data[idx+2],a=data[idx+3];
        if (a>12 && !(r>250&&g>250&&b>250)) {
          if (x<minX)minX=x; if (x>maxX)maxX=x;
          if (y<minY)minY=y; if (y>maxY)maxY=y;
        }
      }
    }
    if (maxX<0) { results.push({title, empty:true}); continue; }
    const scale = Math.min(rect.width/nw, rect.height/nh);
    const dispW = nw*scale, dispH = nh*scale;
    const offX = rect.left + (rect.width-dispW)/2;
    const offY = rect.top + (rect.height-dispH)/2;
    const pageTop = offY + minY*scale + window.scrollY;
    const pageBottom = offY + maxY*scale + window.scrollY;
    const w = (maxX-minX)*scale;
    const h = (maxY-minY)*scale;
    results.push({ title, w, h, top: pageTop, bottom: pageBottom, left: rect.left+window.scrollX, natW: nw, natH: nh });
  }
  return results;
});

console.log(JSON.stringify(tiles, null, 2));
console.log('ERRORS:', JSON.stringify(errors));
await page.screenshot({ path: '/tmp/browser/candlelight.png', fullPage: true });
await browser.close();
