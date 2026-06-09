import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1874, height: 1130 });
  
  console.log('Navigating to http://localhost:8080/collection?group=large-decor&subcategory=all&sort=type&layout=grid');
  try {
    await page.goto('http://localhost:8080/collection?group=large-decor&subcategory=all&sort=type&layout=grid', { waitUntil: 'networkidle' });
    // Wait for the grid to render (it might have an animation)
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/mnt/documents/large-decor-grid.png', fullPage: true });
    console.log('Screenshot saved to /mnt/documents/large-decor-grid.png');
  } catch (e) {
    console.error('Error taking screenshot:', e);
  } finally {
    await browser.close();
  }
})();
