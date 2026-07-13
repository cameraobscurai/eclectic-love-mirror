import { chromium, type Page, type Request, type ConsoleMessage } from 'playwright';

async function auditPage(page: Page, url: string, name: string) {
  console.log(`\n--- Auditing ${name}: ${url} ---`);
  const errors: string[] = [];
  const networkErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (err) => {
    const msg = err.message;
    if (!msg.includes('React DevTools') && !msg.includes('[vite]') && !msg.includes('hydration') && !msg.includes('non-static position') && !msg.includes('GA/GTM')) {
      consoleErrors.push(`PageError: ${msg}`);
    }
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('React DevTools') && !text.includes('[vite]') && !text.includes('hydration') && !text.includes('non-static position') && !text.includes('GA/GTM')) {
        consoleErrors.push(`ConsoleError: ${text}`);
      }
    }
  });

  page.on('requestfailed', (request: Request) => {
    networkErrors.push(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push(`HTTP ${status}: ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. & 2. Console and Network checked via listeners.

  // 3. Product tile images
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).slice(0, 60);
    return imgs.filter(img => img.naturalWidth === 0).map(img => img.src);
  });
  if (brokenImages.length > 0) {
    errors.push(`Broken Images (${brokenImages.length}): ${brokenImages.slice(0, 3).join(', ')}`);
  }

  // 4. Filter chips
  const chipCount = await page.getByRole('button').count();
  if (chipCount === 0) {
    errors.push('No buttons found (expected filter chips)');
  }

  // 5. Metadata
  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    };
  });
  if (!metadata.title) errors.push('Missing Title');
  if (!metadata.description) errors.push('Missing Description');
  if (!metadata.ogImage?.startsWith('https')) errors.push(`Invalid OG Image: ${metadata.ogImage}`);

  // 6. Undefined/null/[object Object]
  const placeholderText = await page.evaluate(() => {
    const text = document.body.innerText;
    const matches = text.match(/undefined|null|\[object Object\]/gi);
    return matches ? matches.slice(0, 5) : [];
  });
  if (placeholderText.length > 0) {
    errors.push(`Leaking Placeholders: ${placeholderText.join(', ')}`);
  }

  // 7. Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const footerVisible = await page.locator('footer').isVisible().catch(() => false);
  if (!footerVisible) {
    // Check if footer text exists at least
    const footerText = await page.evaluate(() => !!document.querySelector('footer'));
    if (!footerText) errors.push('Footer not found after scroll');
  }

  // 8. Screenshots
  if (name === 'Collection') {
    await page.screenshot({ path: '/tmp/browser/audit-collection/top.png', fullPage: false });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: '/tmp/browser/audit-collection/bottom.png', fullPage: false });
  }

  // Output results
  if (consoleErrors.length) console.log(`[CONSOLE] ${consoleErrors.join(' | ')}`);
  if (networkErrors.length) console.log(`[NETWORK] ${networkErrors.join(' | ')}`);
  if (errors.length) console.log(`[ERRORS] ${errors.join(' | ')}`);
  if (!consoleErrors.length && !networkErrors.length && !errors.length) console.log('CLEAN');

  return { consoleErrors, networkErrors, errors };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

  // Audit /collection
  await auditPage(page, 'http://localhost:8080/collection', 'Collection');

  // Find a category link (e.g., /collection/pillows-throws or any sub-path)
  const categoryLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).map(a => a.href);
    return links.find(href => href.includes('/collection/') && href !== 'http://localhost:8080/collection');
  });

  if (categoryLink) {
    await auditPage(page, categoryLink, 'Category');
  } else {
    console.log('No category link found.');
  }

  // Find first product tile and click
  await page.goto('http://localhost:8080/collection');
  const firstProduct = page.locator('a[href*="/product/"]').first();
  if (await firstProduct.isVisible()) {
    const pdpUrl = await firstProduct.getAttribute('href');
    if (pdpUrl) {
      await auditPage(page, new URL(pdpUrl, 'http://localhost:8080').href, 'PDP');
    }
  } else {
    console.log('No product tile link found.');
  }

  await browser.close();
})();
