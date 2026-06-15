import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Navigation Stress Test', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('Desktop Navigation Stress Test', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(BASE_URL);

    const navLinks = [
      { text: 'ATELIER BY THE HIVE', href: '/atelier' },
      { text: 'HIVE SIGNATURE COLLECTION', href: '/collection' },
      { text: 'THE GALLERY', href: '/gallery' },
      { text: 'THE STUDIO', href: '/studio' },
      { text: 'CONTACT', href: '/contact' }
    ];

    // 1. Hover and click every nav bar link
    for (const link of navLinks) {
      console.log(`Testing link: ${link.text}`);
      const locator = page.locator('nav').filter({ hasText: 'ECLECTIC HIVE' }).locator('a').filter({ hasText: link.text });
      await locator.hover();
      await locator.click();
      await page.waitForURL(`**${link.href}**`);
      expect(page.url()).toContain(link.href);
      
      // Check for blank state (minimal content check)
      const bodyText = await page.innerText('body');
      expect(bodyText.length).toBeGreaterThan(100);
    }

    // Verify Collection link specifically
    await page.goto(BASE_URL);
    await page.locator('a').filter({ hasText: 'HIVE SIGNATURE COLLECTION' }).click();
    await page.waitForURL('**/collection**');
    expect(page.url()).toContain('/collection');

    // 2. Test nav from /gallery, /atelier, /contact INTO /collection
    const routes = ['/gallery', '/atelier', '/contact'];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.locator('a').filter({ hasText: 'HIVE SIGNATURE COLLECTION' }).click();
      await page.waitForURL('**/collection**');
      expect(page.url()).toContain('/collection');
    }

    // 3. Browser back/forward 5+ times
    await page.goto(BASE_URL);
    await page.locator('a').filter({ hasText: 'HIVE SIGNATURE COLLECTION' }).click();
    await page.waitForURL('**/collection**');
    
    // Go to a subcategory
    await page.goto(`${BASE_URL}/collection?group=lounge-seating`);
    
    for (let i = 0; i < 5; i++) {
      await page.goBack();
      await page.goForward();
    }
    
    // Final check after history stress
    expect(page.url()).toContain('group=lounge-seating');
    
    // 5. Click site logo from /collection
    await page.locator('a[aria-label="ECLECTIC HIVE — home"]').click();
    await page.waitForURL(BASE_URL + '/');
    expect(page.url()).toBe(BASE_URL + '/');

    // Report console errors
    if (consoleErrors.length > 0) {
      console.error('Console Errors Detected:');
      consoleErrors.forEach(err => console.error(`- ${err}`));
    }
    
    await page.screenshot({ path: '/tmp/browser/collection-nav/desktop-final.png' });
  });

  test('Mobile Navigation Stress Test', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);

    // 4. Mobile viewport - hamburger/mobile nav
    const burger = page.locator('button[aria-label="Open menu"]');
    await burger.click();
    
    const collectionLink = page.locator('nav[aria-label="Mobile navigation"]').locator('a').filter({ hasText: 'HIVE SIGNATURE COLLECTION' });
    await expect(collectionLink).toBeVisible();
    await collectionLink.click();
    
    await page.waitForURL('**/collection**');
    expect(page.url()).toContain('/collection');
    
    await page.screenshot({ path: '/tmp/browser/collection-nav/mobile-collection.png' });

    // Check logo click on mobile
    await page.locator('a[aria-label="ECLECTIC HIVE — home"]').click();
    await page.waitForURL(BASE_URL + '/');
    
    if (consoleErrors.length > 0) {
       // Filter out known harmless errors if any, but user asked for verbatim
    }
  });
});
