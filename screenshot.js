const { chromium } = require('playwright');
const fs = require('fs');

async function capture(url, path) {
  const browser = await chromium.launch({ executablePath: '/bin/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.screenshot({ path: path, fullPage: true });
  await browser.close();
}

(async () => {
  const baseUrl = 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app';
  try { await capture(`${baseUrl}/`, '/tmp/browser/conv/index.png'); } catch(e) {}
  try { await capture(`${baseUrl}/atelier`, '/tmp/browser/conv/atelier.png'); } catch(e) {}
  try { await capture(`${baseUrl}/contact`, '/tmp/browser/conv/contact.png'); } catch(e) {}
  try { await capture(`${baseUrl}/gallery`, '/tmp/browser/conv/gallery.png'); } catch(e) {}
})();
