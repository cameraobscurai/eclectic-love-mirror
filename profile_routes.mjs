import { chromium } from "playwright";
import fs from "node:fs";

async function profileRoute(browser, url, routeName) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  
  const metrics = {
    fcp: null,
    lcp: null,
    ttfb: null,
    cls: 0,
    inp: null,
    jsHeap: null,
    domNodes: null,
    lcpElement: null,
    largestResources: []
  };

  // Monitor network
  page.on('response', response => {
    const url = response.url();
    const headers = response.headers();
    const size = headers['content-length'] || 0;
    metrics.largestResources.push({ url, size: parseInt(size) });
  });

  // Inject performance observer
  await page.addInitScript(() => {
    window.perfData = {
      fcp: null,
      lcp: null,
      lcpSelector: null,
      cls: 0,
    };
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          window.perfData.fcp = entry.startTime;
        }
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        window.perfData.lcp = lastEntry.startTime;
        window.perfData.lcpSelector = lastEntry.element ? lastEntry.element.tagName + (lastEntry.element.id ? '#' + lastEntry.element.id : '') + (lastEntry.element.className ? '.' + lastEntry.element.className.split(' ').join('.') : '') : 'unknown';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          window.perfData.cls += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  console.log(`Profiling ${url}...`);
  
  // Navigate
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  
  // TTFB
  const timing = await page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON());
  metrics.ttfb = timing.responseStart;

  // Wait a bit more for LCP and other metrics to settle
  await page.waitForTimeout(3000);

  // Collect results
  const perfData = await page.evaluate(() => window.perfData);
  metrics.fcp = perfData.fcp;
  metrics.lcp = perfData.lcp;
  metrics.lcpElement = perfData.lcpSelector;
  metrics.cls = perfData.cls;
  metrics.domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
  metrics.jsHeap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);

  // Filter largest resources
  metrics.largestResources.sort((a, b) => b.size - a.size);
  metrics.largestResources = metrics.largestResources.slice(0, 10);

  // Screenshots at specific times
  await page.close();
  
  for (const delay of [500, 1500, 3000]) {
    const shotContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const shotPage = await shotContext.newPage();
    await shotPage.goto(url, { waitUntil: 'commit' }); 
    await shotPage.waitForTimeout(delay);
    const path = `/mnt/documents/shot_${routeName}_${delay}.png`;
    await shotPage.screenshot({ path });
    console.log(`Saved screenshot for ${routeName} at ${delay}ms to ${path}`);
    await shotPage.close();
    await shotContext.close();
  }

  return metrics;
}

async function run() {
  const browser = await chromium.launch();
  const routes = [
    { name: 'home', url: 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/' },
    { name: 'collection', url: 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection' },
    { name: 'lighting', url: 'https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/lighting' }
  ];

  const results = {};
  for (const route of routes) {
    try {
      results[route.name] = await profileRoute(browser, route.url, route.name);
    } catch (e) {
      console.error(`Failed to profile ${route.name}: ${e.message}`);
    }
  }

  fs.writeFileSync('/mnt/documents/profile_results.json', JSON.stringify(results, null, 2));
  console.log("Results saved to /mnt/documents/profile_results.json");
  await browser.close();
}

run().catch(console.error);
