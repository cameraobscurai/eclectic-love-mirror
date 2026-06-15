import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/tmp/browser/collection-filters/';

test.describe('Collection Filter Stress Test', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  const categories = [
    { id: 'lounge-seating', label: 'Lounge Seating', subs: ['benches', 'chairs', 'ottomans', 'sofas-loveseats'] },
    { id: 'lounge-tables', label: 'Lounge Tables', subs: ['coffee-tables', 'consoles', 'side-tables'] },
    { id: 'textiles', label: 'Textiles', subs: ['pillows', 'throws'] },
    { id: 'lighting', label: 'Lighting', subs: ['candlelight', 'chandeliers', 'lamps', 'specialty'] },
  ];

  for (const cat of categories) {
    test(`Category: ${cat.label} - click all subcategories`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('pageerror', (err) => consoleErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(`${BASE_URL}/collection?group=${cat.id}`);
      await page.waitForLoadState('networkidle');

      const initialCountText = await page.locator('[data-testid="product-count"]').textContent().catch(() => "0");
      const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

      for (const sub of cat.subs) {
        // Find chip by text (case insensitive or partial)
        const chip = page.locator('nav[aria-label*="subcategories"] button').filter({ hasText: new RegExp(sub.replace(/-/g, '.*'), 'i') });
        if (await chip.count() === 0) {
            console.log(`Warning: Subcategory chip for ${sub} not found in ${cat.label}`);
            continue;
        }
        await chip.click();
        
        // Check URL
        await expect(page).toHaveURL(new RegExp(`subcategory=${sub}`));
        
        // Check count updates (it should probably be less than or equal to initial)
        const subCountText = await page.locator('[data-testid="product-count"]').textContent().catch(() => "0");
        const subCount = parseInt(subCountText?.match(/\d+/)?.[0] || "0");
        
        // Take screenshot
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${cat.id}-${sub}.png`) });

        if (consoleErrors.length > 0) {
          console.error(`Console errors for ${cat.id}/${sub}:`, consoleErrors);
        }
        expect(consoleErrors).toHaveLength(0);
      }
      
      // Reset to All
      await page.locator('nav[aria-label*="subcategories"] button').filter({ hasText: /All/i }).click();
      await expect(page).toHaveURL(new RegExp(`subcategory=all`));
    });
  }

  test('Stack filters: subcategory + sort tonal', async ({ page }) => {
    await page.goto(`${BASE_URL}/collection?group=lounge-seating&subcategory=chairs`);
    await page.waitForLoadState('networkidle');

    // Toggle Sort to Tonal
    const sortBtn = page.locator('button:has-text("Sort"), [data-testid="sort-trigger"]').first();
    await sortBtn.click();
    await page.locator('role=menuitem, [role="option"], button').filter({ hasText: /Tonal/i }).click();

    await expect(page).toHaveURL(/sort=tonal/);
    
    // Check intersection (should not be 0 if there are chairs)
    const countText = await page.locator('[data-testid="product-count"]').textContent().catch(() => "0");
    const count = parseInt(countText?.match(/\d+/)?.[0] || "0");
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `stack-chairs-tonal.png`) });
  });

  test('Deep-link hydration', async ({ page }) => {
    // Cold load
    await page.goto(`${BASE_URL}/collection?group=lighting&subcategory=lamps&sort=az`);
    await page.waitForLoadState('networkidle');

    // Verify UI reflects state
    const activeSub = await page.locator('nav[aria-label*="subcategories"] button[aria-current="page"]').textContent();
    expect(activeSub?.trim()).toBe('Lamps');

    const countText = await page.locator('[data-testid="product-count"]').textContent().catch(() => "0");
    expect(parseInt(countText?.match(/\d+/)?.[0] || "0")).toBeGreaterThan(0);
  });

  test('Rapid clicking stress', async ({ page }) => {
    await page.goto(`${BASE_URL}/collection?group=lounge-seating`);
    await page.waitForLoadState('networkidle');

    const chips = await page.locator('nav[aria-label*="subcategories"] button').all();
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    for (let i = 0; i < 15; i++) {
      const chip = chips[i % chips.length];
      await chip.click({ force: true });
    }

    // Wait for things to settle
    await page.waitForTimeout(500);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Mobile viewport filter drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/collection?group=lounge-seating`);
    await page.waitForLoadState('networkidle');

    const filterBtn = page.locator('button:has-text("Filter"), [data-testid="filter-trigger"], .lucide-sliders-horizontal').first();
    await filterBtn.click();

    // Verify drawer open (should see "Clear" or similar)
    await expect(page.locator('button:has-text("Clear"), [data-testid="clear-filters"]')).toBeVisible().catch(() => {
        // If clear is only visible when filters applied, check for close button
        return expect(page.locator('button:has-text("Close"), .lucide-x')).toBeVisible();
    });

    // Check scroll lock
    const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
    expect(bodyOverflow).toBe('hidden');

    // Close
    await page.locator('button:has-text("Close"), .lucide-x').first().click();
    
    // Check scroll lock released
    const bodyOverflowAfter = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
    expect(bodyOverflowAfter).not.toBe('hidden');
  });
});
