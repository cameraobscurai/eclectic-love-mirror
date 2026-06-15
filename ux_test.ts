import { chromium, devices } from 'playwright';

async function runTest(viewport, name) {
  const browser = await chromium.launch({ executablePath: '/bin/chromium' });
  const context = await browser.newContext({
    viewport: viewport,
    userAgent: name === 'mobile' ? devices['iPhone 12'].userAgent : undefined
  });
  const page = await context.newPage();
  
  try {
    console.log(`Starting ${name} flow...`);
    
    // 1. Home
    await page.goto('https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/');
    await page.screenshot({ path: `/tmp/browser/ux/${name}_01_home.png` });
    
    // 2. Collection
    // Looking for a "Collection" or "Shop" link. Often in nav or hero.
    // Based on common patterns, let's try to find a link that looks like "Shop" or "Collection"
    const collectionLink = page.getByRole('link', { name: /collection|shop|products/i }).first();
    if (await collectionLink.isVisible()) {
        await collectionLink.click();
    } else {
        // Fallback: click first CTA in hero
        await page.getByRole('button', { name: /shop|explore/i }).first().click();
    }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `/tmp/browser/ux/${name}_02_collection.png` });

    // 3. Filter to Chandeliers
    // Filters are often in a sidebar or a dropdown.
    const chandelierFilter = page.getByRole('checkbox', { name: /chandelier/i }).or(page.getByText(/chandelier/i, { exact: false })).first();
    if (await chandelierFilter.isVisible()) {
        await chandelierFilter.click();
        await page.waitForTimeout(1000); // Wait for filter to apply
    }
    await page.screenshot({ path: `/tmp/browser/ux/${name}_03_filtered.png` });

    // 4. Tap a product
    // Clicking the first product image or title
    await page.locator('a[href*="/product/"]').first().click();
    await page.waitForLoadState('networkidle');
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
