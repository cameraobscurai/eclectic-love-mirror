import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app';
const ROUTES = ['/', '/collection', '/gallery', '/atelier'];
const LOG_DIR = '/tmp/browser/perf';

async function audit() {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  for (const route of ROUTES) {
    const page = await context.newPage();
    const url = `${BASE_URL}${route}`;
    const logs = { url, console: [] as any[], failedRequests: [] as any[], oversizedImages: [] as any[], lcp: 0 };

    page.on('console', msg => logs.console.push({ type: msg.type(), text: msg.text() }));
    page.on('response', async res => {
      if (res.status() >= 400) logs.failedRequests.push({ url: res.url(), status: res.status() });
      if (res.request().resourceType() === 'image') {
        const buf = await res.body().catch(() => null);
        if (buf && buf.length > 500 * 1024) logs.oversizedImages.push({ url: res.url(), size: (buf.length / 1024).toFixed(0) + 'KB' });
      }
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000); // Wait for some images/scripts
    } catch (e) {}

    const filename = (route.replace(/\//g, '') || 'home') + '.json';
    fs.writeFileSync(path.join(LOG_DIR, filename), JSON.stringify(logs, null, 2));
    await page.close();
  }
  await browser.close();
}
audit();
