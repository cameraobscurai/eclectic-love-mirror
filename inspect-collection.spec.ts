import { test, expect } from '@playwright/test';

test('inspect collection page structure', async ({ page }) => {
  await page.goto('http://localhost:8080/collection');
  await page.waitForLoadState('networkidle');
  
  // Get all categories/subcategories available in the rail
  const subcategoryChips = await page.locator('[data-testid*="subcategory-chip"], button:has-text("All"), .subcategory-rail button').allInnerTexts();
  console.log('Subcategory Chips:', subcategoryChips);

  // Get filter sections
  const filterSections = await page.locator('button:has-text("Filter"), [data-testid="filter-trigger"]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const filterLabels = await page.locator('label, button').allInnerTexts();
  console.log('Filter Labels (potential):', filterLabels.slice(0, 20));

  // Sort options
  const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-trigger"]').first();
  if (await sortButton.isVisible()) {
    await sortButton.click();
    const sortOptions = await page.locator('role=menuitem, [role="option"]').allInnerTexts();
    console.log('Sort Options:', sortOptions);
  }
});
