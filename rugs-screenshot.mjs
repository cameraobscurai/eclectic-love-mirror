import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1874, height: 1130 });
  
  const url = 'http://localhost:8080/collection?group=rugs&subcategory=all&sort=type&layout=grid';
  console.log('Navigating to ' + url);
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Wait for the grid to render and images to load/normalize
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/mnt/documents/rugs_grid_local_v2.png', fullPage: true });
    console.log('Screenshot saved to /mnt/documents/rugs_grid_local_v2.png');
  } catch (e) {
    console.error('Error taking screenshot:', e);
  } finally {
    await browser.close();
  }
})();
