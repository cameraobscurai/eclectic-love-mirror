import { test, expect } from '@playwright/test';

// Regression guard: the "View full page" link inside QuickView must navigate
// to /collection/<slug>, NOT dump the user back to the collection grid.
// Previously the <Link> was swallowed by the parent route's ?view state
// machine — we now use a plain <a href>, and this test locks that behavior.

test('QuickView "view full page" lands on the PDP', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/collection', { waitUntil: 'domcontentloaded' });

  // Open the first product tile → QuickView modal.
  const firstTile = page.locator('[data-product-slug]').first();
  await firstTile.waitFor({ state: 'visible', timeout: 20_000 });
  const slug = await firstTile.getAttribute('data-product-slug');
  expect(slug, 'first tile must expose a slug').toBeTruthy();
  await firstTile.click();

  // Modal opens with the "View full page" link.
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  const link = dialog.getByRole('link', { name: /view full page/i });
  await expect(link).toBeVisible();

  // Href must be an absolute path to the PDP route — plain <a>, not intercepted.
  const href = await link.getAttribute('href');
  expect(href).toBe(`/collection/${slug}`);

  await Promise.all([
    page.waitForURL(new RegExp(`/collection/${slug}$`), { timeout: 15_000 }),
    link.click(),
  ]);

  // Landed on the PDP, not bounced back to the grid.
  expect(page.url()).toMatch(new RegExp(`/collection/${slug}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
