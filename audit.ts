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
    console.log(`Auditing ${route}...`);
    const page = await context.newPage();
    const url = `${BASE_URL}${route}`;
    const logs = {
      url,
      console: [] as any[],
      failedRequests: [] as any[],
      oversizedImages: [] as any[],
      lcp: null as number | null,
    };

    // Pre-inject LCP observer
    await page.addInitScript(() => {
      (window as any).lcpValue = 0;
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        (window as any).lcpValue = lastEntry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.console.push({ type: msg.type(), text: msg.text() });
      }
    });

    const imagePromises: Promise<void>[] = [];
    page.on('response', response => {
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';
      if (status >= 400) {
        logs.failedRequests.push({ url: response.url(), status });
      }
      if (contentType.startsWith('image/')) {
        const p = response.body().then(buffer => {
          if (buffer.length > 500 * 1024) {
            logs.oversizedImages.push({ url: response.url(), size: (buffer.length / 1024).toFixed(2) + 'KB' });
          }
        }).catch(() => {});
        imagePromises.push(p);
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await Promise.all(imagePromises);
      
      const lcp = await page.evaluate(() => (window as any).lcpValue);
      logs.lcp = lcp;
    } catch (e) {
      console.error(`Failed to audit ${url}:`, e);
    }

    const filename = (route.replace(/\//g, '') || 'home') + '.json';
    fs.writeFileSync(path.join(LOG_DIR, filename), JSON.stringify(logs, null, 2));
    await page.close();
  }

  await browser.close();
}

audit();
