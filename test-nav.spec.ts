import { test, expect, chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Navigation Stress Test', () => {
  test.setTimeout(120000); // 2 minutes

  test('Desktop Navigation Stress Test', async () => {
    const consoleErrors: string[] = [];
    const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.setViewportSize({ width: 1280, height: 1800 });
    console.log('Navigating to BASE_URL');
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
      const locator = page.locator('header nav').first().locator('a').filter({ hasText: new RegExp(link.text, 'i') }).first();
      await locator.hover();
      await locator.click();
      await page.waitForURL(`**${link.href}**`, { timeout: 15000 });
      expect(page.url()).toContain(link.href);
      
      const bodyText = await page.innerText('body');
      expect(bodyText.length).toBeGreaterThan(100);
    }

    // Verify Collection link specifically
    console.log('Verifying Collection link specifically');
    await page.goto(BASE_URL);
    await page.locator('header nav').first().locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i }).first().click();
    await page.waitForURL('**/collection**');
    expect(page.url()).toContain('/collection');

    // 2. Test nav from /gallery, /atelier, /contact INTO /collection
    const routes = ['/gallery', '/atelier', '/contact'];
    for (const route of routes) {
      console.log(`Testing nav from ${route} to /collection`);
      await page.goto(`${BASE_URL}${route}`);
      await page.locator('header nav').first().locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i }).first().click();
      await page.waitForURL('**/collection**');
      expect(page.url()).toContain('/collection');
    }

    // 3. Browser back/forward 5+ times
    console.log('History stress test');
    await page.goto(BASE_URL);
    await page.locator('header nav').first().locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i }).first().click();
    await page.waitForURL('**/collection**');
    
    await page.goto(`${BASE_URL}/collection?group=lounge-seating`);
    
    for (let i = 0; i < 5; i++) {
      console.log(`History step ${i+1}`);
      await page.goBack();
      await page.goForward();
    }
    
    expect(page.url()).toContain('group=lounge-seating');
    
    // 5. Click site logo from /collection
    console.log('Testing logo click');
    await page.locator('a[aria-label="ECLECTIC HIVE — home"]').click();
    await page.waitForURL(BASE_URL + '/');
    expect(page.url()).toBe(BASE_URL + '/');

    if (consoleErrors.length > 0) {
      console.log('--- ALL CONSOLE ERRORS ---');
      consoleErrors.forEach(err => console.log(err));
      console.log('--------------------------');
    }
    
    await page.screenshot({ path: '/tmp/browser/collection-nav/desktop-final.png' });
    await browser.close();
  });

  test('Mobile Navigation Stress Test', async () => {
    const consoleErrors: string[] = [];
    const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);

    // 4. Mobile viewport - hamburger/mobile nav
    console.log('Mobile menu test');
    const burger = page.locator('button[aria-label="Open menu"]');
    await burger.click();
    
    const collectionLink = page.locator('nav[aria-label="Mobile navigation"]').locator('a').filter({ hasText: /HIVE SIGNATURE COLLECTION/i });
    await expect(collectionLink).toBeVisible();
    await collectionLink.click();
    
    await page.waitForURL('**/collection**');
    expect(page.url()).toContain('/collection');
    
    await page.screenshot({ path: '/tmp/browser/collection-nav/mobile-collection.png' });

    console.log('Mobile logo click test');
    await page.locator('a[aria-label="ECLECTIC HIVE — home"]').click();
    await page.waitForURL(BASE_URL + '/');
    
    await browser.close();
  });
});
