import { chromium } from 'playwright';
const EXECUTABLE = '/bin/chromium';
const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

const url = 'http://localhost:8080/collection?group=lighting&subcategory=candlelight';
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

// scroll to bottom to lazy-load
for (let i=0;i<10;i++){
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1000);

const tiles = await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const results = [];
  for (const img of imgs) {
    const rect = img.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) continue;
    const title = img.closest('a')?.textContent?.trim() || img.alt || '';
    // draw natural image to canvas
    const canvas = document.createElement('canvas');
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) continue;
    canvas.width = nw; canvas.height = nh;
    const ctx = canvas.getContext('2d');
    try { ctx.drawImage(img, 0, 0); } catch(e) { continue; }
    let data;
    try { data = ctx.getImageData(0,0,nw,nh).data; } catch(e) { continue; }
    let minX=nw, minY=nh, maxX=0, maxY=0, found=false;
    for (let y=0;y<nh;y+=2) {
      for (let x=0;x<nw;x+=2) {
        const idx = (y*nw+x)*4;
        const r=data[idx],g=data[idx+1],b=data[idx+2],a=data[idx+3];
        if (a>12 && !(r>250&&g>250&&b>250)) {
          found=true;
          if (x<minX)minX=x; if (x>maxX)maxX=x;
          if (y<minY)minY=y; if (y>maxY)maxY=y;
        }
      }
    }
    if (!found) continue;
    // object-contain mapping: image scaled to fit rect preserving aspect
    const scale = Math.min(rect.width/nw, rect.height/nh);
    const dispW = nw*scale, dispH = nh*scale;
    const offX = rect.left + (rect.width-dispW)/2;
    const offY = rect.top + (rect.height-dispH)/2;
    const pageTop = offY + minY*scale + window.scrollY;
    const pageBottom = offY + maxY*scale + window.scrollY;
    const w = (maxX-minX)*scale;
    const h = (maxY-minY)*scale;
    results.push({ title, w, h, top: pageTop, bottom: pageBottom, rectTop: rect.top+window.scrollY, rectLeft: rect.left });
  }
  return results;
});

console.log(JSON.stringify(tiles, null, 2));
console.log('ERRORS:', JSON.stringify(errors));
await page.screenshot({ path: '/tmp/browser/candlelight.png', fullPage: true });
await browser.close();
