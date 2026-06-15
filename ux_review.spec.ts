import { test, expect, chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('UX Review Flow', () => {
  test('Desktop UX Flow', async () => {
    const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 1800 });
    
    // 1. Home
    await page.goto(BASE_URL);
    await page.screenshot({ path: '/tmp/browser/ux/desktop_01_home.png' });
    
    // 2. Collection
    const collectionLink = page.locator('header nav').first().locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i }).first();
    await collectionLink.click();
    await page.waitForURL('**/collection**');
    await page.screenshot({ path: '/tmp/browser/ux/desktop_02_collection.png' });
    
    // 3. Filter to Chandeliers
    // Looking for a "Chandeliers" filter. In previous scripts I saw "group=lounge-seating", maybe there is a "chandeliers" group.
    // Let's try to find a filter button or text.
    const chandelierFilter = page.getByText(/chandeliers/i).first();
    if (await chandelierFilter.isVisible()) {
        await chandelierFilter.click();
        await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: '/tmp/browser/ux/desktop_03_filtered.png' });
    
    // 4. Tap a product
    const firstProduct = page.locator('a[href*="/product/"]').first();
    if (await firstProduct.isVisible()) {
        await firstProduct.click();
        await page.waitForURL('**/product/**');
    }
    await page.screenshot({ path: '/tmp/browser/ux/desktop_04_product.png' });
    
    // 5. Inquiry
    const inquiryBtn = page.getByRole('button', { name: /inquiry|inquire|contact|add to quote/i }).first();
    if (await inquiryBtn.isVisible()) {
        await inquiryBtn.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/browser/ux/desktop_05_inquiry.png' });
    
    await browser.close();
  });

  test('Mobile UX Flow', async () => {
    const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 1. Home
    await page.goto(BASE_URL);
    await page.screenshot({ path: '/tmp/browser/ux/mobile_01_home.png' });
    
    // 2. Collection
    await page.locator('button[aria-label="Open menu"]').click();
    const collectionLink = page.locator('nav[aria-label="Mobile navigation"]').locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i });
    await collectionLink.click();
    await page.waitForURL('**/collection**');
    await page.screenshot({ path: '/tmp/browser/ux/mobile_02_collection.png' });
    
    // 3. Filter to Chandeliers
    // Filters on mobile might be behind a "Filters" button
    const filterBtn = page.getByRole('button', { name: /filter/i }).first();
    if (await filterBtn.isVisible()) {
        await filterBtn.click();
    }
    const chandelierFilter = page.getByText(/chandeliers/i).first();
    if (await chandelierFilter.isVisible()) {
        await chandelierFilter.click();
        await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: '/tmp/browser/ux/mobile_03_filtered.png' });
    
    // 4. Tap a product
    const firstProduct = page.locator('a[href*="/product/"]').first();
    if (await firstProduct.isVisible()) {
        await firstProduct.click();
        await page.waitForURL('**/product/**');
    }
    await page.screenshot({ path: '/tmp/browser/ux/mobile_04_product.png' });
    
    // 5. Inquiry
    const inquiryBtn = page.getByRole('button', { name: /inquiry|inquire|contact|add to quote/i }).first();
    if (await inquiryBtn.isVisible()) {
        await inquiryBtn.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/browser/ux/mobile_05_inquiry.png' });
    
    await browser.close();
  });
});
