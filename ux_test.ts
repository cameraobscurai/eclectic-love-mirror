import { chromium, devices } from 'playwright';

async function runTest(viewport, name) {
  const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: viewport,
    userAgent: name === 'mobile' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1' : undefined
  });
  const page = await context.newPage();
  const BASE_URL = 'http://localhost:8080';
  
  try {
    console.log(`Starting ${name} flow...`);
    
    // 1. Home
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `/tmp/browser/ux/${name}_01_home.png` });
    
    // 2. Collection
    let collectionLink;
    if (name === 'mobile') {
        await page.locator('button[aria-label="Open menu"]').click();
        await page.waitForTimeout(500);
        collectionLink = page.locator('nav[aria-label="Mobile navigation"] a').filter({ hasText: /COLLECTION/i }).first();
    } else {
        collectionLink = page.locator('header nav a').filter({ hasText: /COLLECTION/i }).first();
    }
    await collectionLink.click();
    await page.waitForURL('**/collection**');
    await page.screenshot({ path: `/tmp/browser/ux/${name}_02_collection.png` });

    // 3. Filter to Chandeliers
    // Looking for "Chandeliers" in the list or group
    const chandelierFilter = page.locator('button, a, label').filter({ hasText: /^Chandeliers$/i }).first();
    if (await chandelierFilter.isVisible()) {
        await chandelierFilter.click();
        await page.waitForTimeout(1000);
    } else {
        // Try finding by text in the main area
        const altFilter = page.getByText('Chandeliers', { exact: true }).first();
        if (await altFilter.isVisible()) await altFilter.click();
    }
    await page.screenshot({ path: `/tmp/browser/ux/${name}_03_filtered.png` });

    // 4. Tap a product
    const firstProduct = page.locator('a[href*="/product/"]').first();
    if (await firstProduct.isVisible()) {
        await firstProduct.click();
        await page.waitForURL('**/product/**');
    }
    await page.screenshot({ path: `/tmp/browser/ux/${name}_04_product.png` });

    // 5. Inquiry
    const inquiryBtn = page.getByRole('button', { name: /inquiry|inquire|contact|add to quote/i }).first();
    if (await inquiryBtn.isVisible()) {
        await inquiryBtn.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `/tmp/browser/ux/${name}_05_inquiry.png` });

  } catch (e) {
    console.error(`Error in ${name} flow:`, e);
    await page.screenshot({ path: `/tmp/browser/ux/${name}_error.png` });
  } finally {
    await browser.close();
  }
}

async function main() {
  await runTest({ width: 1280, height: 1800 }, 'desktop');
  await runTest({ width: 375, height: 812 }, 'mobile');
}

main();
