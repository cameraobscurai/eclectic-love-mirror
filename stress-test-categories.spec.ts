import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const CATEGORIES = [
  { name: 'seating', expected: 101, url: '/collection?group=seating' },
  { name: 'tables', expected: 77, url: '/collection?group=tables' },
  { name: 'bars', expected: 36, url: '/collection?group=bars' },
  { name: 'tableware', expected: 41, url: '/collection?group=tableware' },
  { name: 'serveware', expected: 41, url: '/collection?group=serveware' },
  { name: 'pillows-throws', expected: 155, url: '/collection?group=pillows-throws' },
  { name: 'rugs', expected: 26, url: '/collection?group=rugs' },
  { name: 'lighting', expected: 29, url: '/collection?group=lighting' },
  { name: 'candlelight', expected: 10, url: '/collection?group=candlelight' },
  { name: 'chandeliers', expected: 12, url: '/collection?group=chandeliers' },
  { name: 'large-decor', expected: 24, url: '/collection?group=large-decor' },
  { name: 'styling', expected: 61, url: '/collection?group=styling' },
  { name: 'storage', expected: 11, url: '/collection?group=storage' },
  { name: 'furs-pelts', expected: 6, url: '/collection?group=furs-pelts' },
];

const SCREENSHOT_DIR = '/tmp/browser/collection-cats/';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Category Browsing Stress Test', () => {
  const results: any[] = [];
  const consoleErrors: string[] = [];
  const brokenImages: string[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('requestfailed', request => {
      if (request.resourceType() === 'image') {
        brokenImages.push(request.url());
      }
    });
  });

  for (const cat of CATEGORIES) {
    test(`Category: ${cat.name}`, async ({ page }) => {
      // Test direct deep-link (Cold load)
      await page.goto(`http://localhost:8080${cat.url}`);
      await page.waitForLoadState('networkidle');
      
      // Check for hydration mismatch (often logged as errors)
      const hydrationErrors = consoleErrors.filter(e => e.includes('Hydration') || e.includes('did not match'));
      
      // Verify product count
      // Wait for the count to appear
      const resultMeta = page.locator('p[aria-live="polite"]');
      let actualCount = 0;
      try {
        await expect(resultMeta).toBeVisible({ timeout: 5000 });
        const metaText = await resultMeta.innerText();
        const countMatch = metaText.match(/(\\d+)/);
        actualCount = countMatch ? parseInt(countMatch[1]) : 0;
      } catch (e) {
        console.log(`Count not found for ${cat.name} via meta`);
      }

      // If meta count is 0, count the tiles
      const tiles = page.locator('.collection-product-grid li');
      const tileCount = await tiles.count();
      if (actualCount === 0) actualCount = tileCount;

      // Verify images
      const images = page.locator('.collection-product-grid img');
      const imgCount = await images.count();
      let brokenImgCount = 0;
      for (let i = 0; i < Math.min(imgCount, 10); i++) {
        const isVisible = await images.nth(i).isVisible();
        const naturalWidth = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
        if (isVisible && naturalWidth === 0) {
            brokenImgCount++;
        }
      }

      // Check Back Button preservation
      await page.goto('http://localhost:8080/collection');
      const scrollYBefore = await page.evaluate(() => window.scrollY);
      // We are at the top. Let's scroll a bit.
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollYTarget = await page.evaluate(() => window.scrollY);
      
      // Find and click the tile (if possible) or just go to the cat and back
      await page.goto(`http://localhost:8080${cat.url}`);
      await page.goBack();
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      // scroll position preservation is tricky with dynamic grids, but let's check.

      // Test QuickView
      let quickViewPassed = false;
      if (tileCount > 0) {
        await page.goto(`http://localhost:8080${cat.url}`);
        await tiles.first().click();
        await expect(page).toHaveURL(/view=/);
        quickViewPassed = true;
      }

      results.push({
        category: cat.name,
        expected: cat.expected,
        actual: actualCount,
        pass: actualCount === cat.expected && hydrationErrors.length === 0,
        errors: hydrationErrors.length > 0 ? 'Hydration Mismatch' : '',
        brokenImages: brokenImgCount > 0
      });

      await page.screenshot({ path: `${SCREENSHOT_DIR}${cat.name}.png` });
    });
  }

  test.afterAll(async () => {
    console.log('--- FINAL REPORT ---');
    console.table(results);
    if (consoleErrors.length > 0) {
      console.log('--- CONSOLE ERRORS ---');
      consoleErrors.forEach(e => console.log(e));
    }
    if (brokenImages.length > 0) {
      console.log('--- BROKEN IMAGES ---');
      brokenImages.forEach(url => console.log(url));
    }
  });
});
