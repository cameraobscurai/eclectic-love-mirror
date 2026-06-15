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
    const logs = {
      url,
      console: [] as any[],
      failedRequests: [] as any[],
      oversizedImages: [] as any[],
      lcp: null as number | null,
    };

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.console.push({ type: msg.type(), text: msg.text() });
      }
    });

    page.on('response', response => {
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';
      if (status >= 400) {
        logs.failedRequests.push({ url: response.url(), status });
      }
      if (contentType.startsWith('image/')) {
        response.body().then(buffer => {
          if (buffer.length > 500 * 1024) {
            logs.oversizedImages.push({ url: response.url(), size: (buffer.length / 1024).toFixed(2) + 'KB' });
          }
        }).catch(() => {});
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          let lcpValue = 0;
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.startTime;
            resolve(lcpValue);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          setTimeout(() => resolve(lcpValue), 3000);
        });
      });
      logs.lcp = lcp as number;
    } catch (e) {
      console.error(`Failed to audit ${url}:`, e);
    }

    const filename = route.replace(/\//g, 'home') || 'home';
    fs.writeFileSync(path.join(LOG_DIR, `${filename}.json`), JSON.stringify(logs, null, 2));
    await page.close();
  }

  await browser.close();
}

audit();
