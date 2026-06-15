import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:8080/collection';
const SCREENSHOT_DIR = '/tmp/browser/collection-load/';
const CHROMIUM_PATH = "/nix/store/f0zwc9si9bjhs4vipbbfw0i7my9ck3in-chromium-146.0.7680.80/bin/chromium";

async function runPhase(phaseName: string, options: { throttle?: boolean } = {}) {
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: CHROMIUM_PATH, 
    args: ["--no-sandbox", "--disable-setuid-sandbox"] 
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 },
  });

  const page = await context.newPage();
  if (options.throttle) {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 400 * 1024 / 8,
      uploadThroughput: 400 * 1024 / 8,
    });
  }

  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('requestfailed', request => {
    networkFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });

  const startTime = Date.now();
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  
  // Wait for either the product tiles or the skeleton to be replaced
  // Products have button with aria-label starting with "Open"
  let firstTileTime = -1;
  try {
    await page.waitForSelector('button[aria-label^="Open "]', { timeout: 15000 });
    firstTileTime = Date.now() - startTime;
  } catch (e) {}

  // Scroll to bottom
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 500;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve(null);
        }
      }, 200);
    });
  });

  const totalTiles = await page.locator('button[aria-label^="Open "]').count();
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => img.complete && img.naturalWidth === 0)
      .map(img => img.src);
  });

  const cls = await page.evaluate(() => {
    return new Promise((resolve) => {
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      }).observe({type: 'layout-shift', buffered: true});
      setTimeout(() => resolve(clsValue), 1000);
    });
  });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${phaseName}.png`), fullPage: true });
  await browser.close();

  return { phaseName, firstTileTime, totalTiles, consoleErrors, networkFailures, brokenImages, cls };
}

async function main() {
  const results: any = {};
  console.error("Running Cold Load...");
  results.coldLoad = await runPhase('cold-load');
  
  results.reloads = [];
  for(let i=1; i<=3; i++) {
    console.error(`Running Reload ${i}...`);
    results.reloads.push(await runPhase(`reload-${i}`));
  }

  console.error("Running Slow 3G...");
  results.slow3G = await runPhase('slow-3g', { throttle: true });

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
