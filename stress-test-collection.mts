import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:8080/collection';
const SCREENSHOT_DIR = '/tmp/browser/collection-load/';

async function runTest() {
  const browser = await chromium.launch({ headless: true, executablePath: "/nix/store/f0zwc9si9bjhs4vipbbfw0i7my9ck3in-chromium-146.0.7680.80/bin/chromium", args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 },
  });

  const report: any = {
    coldLoad: {},
    reloads: [],
    slow3G: {},
  };

  const runPhase = async (phaseName: string, options: { throttle?: boolean } = {}) => {
    const page = await context.newPage();
    if (options.throttle) {
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: 400 * 1024 / 8, // Slow 3G: 400kbps
        uploadThroughput: 400 * 1024 / 8,
      });
    }

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const networkFailures: string[] = [];
    const brokenImages: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    page.on('requestfailed', request => {
      networkFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkFailures.push(`${response.request().method()} ${response.url()}: ${response.status()}`);
      }
    });

    const startTime = Date.now();
    await page.goto(URL, { waitUntil: 'load' });
    
    // Measure time to first product tile
    let firstTileTime = -1;
    try {
      await page.waitForSelector('[data-testid="product-tile"], .product-tile, img', { timeout: 10000 });
      firstTileTime = Date.now() - startTime;
    } catch (e) {
      firstTileTime = -1;
    }

    // Scroll to bottom
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 300;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve(null);
          }
        }, 100);
      });
    });

    // Wait a bit for lazy images
    await page.waitForTimeout(2000);

    const totalTiles = await page.locator('[data-testid="product-tile"], .product-tile').count();
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        complete: img.complete
      }));
    });

    images.forEach(img => {
      if (img.complete && img.naturalWidth === 0) {
        brokenImages.push(img.src);
      }
    });

    const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
            let clsValue = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += (entry as any).value;
                    }
                }
            }).observe({type: 'layout-shift', buffered: true});
            setTimeout(() => resolve(clsValue), 500);
        });
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${phaseName}.png`), fullPage: true });
    
    await page.close();

    return {
      firstTileTime,
      totalTiles,
      consoleErrors,
      consoleWarnings,
      networkFailures,
      brokenImages,
      cls
    };
  };

  console.log('Testing Cold Load...');
  report.coldLoad = await runPhase('cold-load');

  console.log('Reloading 3 times...');
  for (let i = 1; i <= 3; i++) {
    console.log(`Reload ${i}...`);
    report.reloads.push(await runPhase(`reload-${i}`));
  }

  console.log('Testing Slow 3G...');
  report.slow3G = await runPhase('slow-3g', { throttle: true });

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

runTest().catch(console.error);
