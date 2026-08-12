import { test, expect, type Page, type ConsoleMessage, type Response } from '@playwright/test';

// ---------------------------------------------------------------------------
// End-to-end walkthrough of the inventory add/edit flow, driven the way a
// non-technical staff user (Adrienne) would drive it:
//
//   /admin/new-product  → fill → Save as draft
//   → lands in /admin/products with the editor open on the new piece
//   → edit a field → Save → reload → verify it stuck
//   → search for it by name in the inventory list
//
// Along the way it fails on: console errors, 4xx/5xx requests, raw/unfriendly
// error text surfacing in the UI, and silent saves that don't persist.
//
// Artifacts carry a "ZZ E2E" name prefix (isTestArtifact) so they can never
// reach public queries, and the run deletes every row it creates.
// ---------------------------------------------------------------------------

const CONSOLE_NOISE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Lit is in dev mode/i,
  /React Router Future Flag/i,
  /was preloaded using link preload but not used/i,
  // A Supabase auth token refresh that was in flight when the test navigated
  // away aborts as "Failed to fetch". It's a teardown artifact of page.goto(),
  // not an app error — app-level fetch failures don't carry a supabase frame.
  /Failed to fetch[\s\S]*supabase/i,
];


const NETWORK_NOISE = [/favicon/i, /\/@vite\//, /\/__/, /hot-update/];

// Error copy that is technically true but useless to a staff user.
const UNFRIENDLY_ERROR = /\b(undefined|null|NaN|\[object Object\]|TypeError|violates row-level security|PGRST\d+|22P02|23505|Unexpected token|Failed to fetch)\b/;

type Harness = { consoleErrors: string[]; badRequests: string[]; uiErrors: string[] };

function watch(page: Page): Harness {
  const h: Harness = { consoleErrors: [], badRequests: [], uiErrors: [] };

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_NOISE.some((r) => r.test(text))) return;
    h.consoleErrors.push(text);
  });

  page.on('pageerror', (err) => h.consoleErrors.push(`pageerror: ${err.message}`));

  page.on('response', (res: Response) => {
    const url = res.url();
    if (NETWORK_NOISE.some((r) => r.test(url))) return;
    if (res.status() >= 400) h.badRequests.push(`${res.status()} ${url}`);
  });

  return h;
}

async function restoreSession(page: Page, context: import('@playwright/test').BrowserContext) {
  const cookiesJson = process.env['LOVABLE_BROWSER_SUPABASE_COOKIES_JSON'];
  if (cookiesJson) {
    await context.addCookies(
      (JSON.parse(cookiesJson) as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        url: 'http://localhost:8080',
      })) as never,
    );
  }
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  const key = process.env['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'];
  const session = process.env['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'];
  if (key && session) {
    await page.evaluate(
      ([k, s]) => window.localStorage.setItem(k as string, s as string),
      [key, session],
    );
  }
}

/** Any visible red/alert copy currently on screen. */
async function visibleErrorText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const nodes = document.querySelectorAll('[role="alert"], .text-red-600, [data-sonner-toast][data-type="error"]');
    nodes.forEach((n) => {
      const t = (n.textContent ?? '').trim();
      if (t) out.push(t);
    });
    return out;
  });
}

// Ids created by a run, drained by afterAll if a test dies mid-flight.
const createdIds: string[] = [];

/** Delete a row through the drawer's real delete path (no direct DB writes). */
async function deleteArtifact(page: Page, id: string) {
  await page.goto(`http://localhost:8080/admin/products?id=${id}`, { waitUntil: 'domcontentloaded' });
  const arm = page.getByRole('button', { name: /delete this piece/i });
  await arm.waitFor({ state: 'visible', timeout: 20_000 });
  await arm.click();
  await page.getByRole('button', { name: /yes, delete it/i }).click();
  await page.waitForTimeout(2500);
}

test.describe('Inventory add/edit — staff walkthrough', () => {
  test.skip(
    process.env['LOVABLE_BROWSER_AUTH_STATUS'] !== 'injected',
    'Needs an injected admin session; sign in via the preview first.',
  );

  test.afterAll(async ({ browser }) => {
    if (createdIds.length === 0) return;
    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();
    await restoreSession(page, context);
    for (const id of createdIds.splice(0)) {
      await deleteArtifact(page, id).catch(() => {});
    }
    await context.close();
  });


  test('create → land in editor → edit → persists → findable in search', async ({ page, context }) => {
    const h = watch(page);
    const stamp = Date.now();
    const name = `ZZ E2E Test Piece ${stamp}`;
    const renamed = `${name} EDITED`;

    await restoreSession(page, context);

    // --- 1. New product page loads for this user (no bounce to /login) -----
    await page.goto('http://localhost:8080/admin/new-product', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible({ timeout: 20_000 });
    expect(page.url(), 'staff user was redirected away from /admin/new-product').toContain('/admin/new-product');

    // --- 2. Empty form must not be savable ---------------------------------
    const saveDraft = page.getByRole('button', { name: /save as draft/i });
    const savePublish = page.getByRole('button', { name: /save & mark ready|saving/i });
    await expect(saveDraft).toBeDisabled();
    await expect(savePublish).toBeDisabled();

    // --- 3. Fill it out the way a staffer would ----------------------------
    await page.getByPlaceholder('e.g. Travertine Side Table').fill(name);

    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption({ label: 'Cocktail & Bar' }).catch(async () => {
      // Label drift shouldn't break the run — fall back to the second option.
      const values = await categorySelect.locator('option').evaluateAll((os) =>
        os.map((o) => (o as HTMLOptionElement).value),
      );
      await categorySelect.selectOption(values[1] ?? values[0]);
    });

    // Subcategory options must actually populate for the chosen category.
    const subSelect = page.locator('select').nth(1);
    const subOptionCount = await subSelect.locator('option').count();
    expect(subOptionCount, 'no subcategory options offered for the selected category').toBeGreaterThan(1);
    const subValue = await subSelect.locator('option').nth(1).getAttribute('value');
    if (subValue) await subSelect.selectOption(subValue);

    await page.getByPlaceholder('—').fill('3');
    await page.getByPlaceholder('e.g. 24"W x 18"D x 22"H').fill('30"W x 30"D x 18"H');

    // Declared taxonomy is required — saving must stay blocked until it's set.
    await expect(saveDraft).toBeDisabled();
    const collectionSelect = page.locator('select').nth(2);
    const declaredCategory = page.locator('select').nth(3);
    // The taxonomy tree is fetched async on mount — wait for it rather than
    // racing the first paint (an empty dropdown here is a load race, not a bug).
    const optionValues = (sel: typeof collectionSelect) =>
      sel.locator('option').evaluateAll((os) =>
        os.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
      );
    await expect
      .poll(async () => (await optionValues(collectionSelect)).length, {
        timeout: 20_000,
        message: 'no collections offered on the new-product form',
      })
      .toBeGreaterThan(0);
    const collValues = await optionValues(collectionSelect);
    await collectionSelect.selectOption(collValues[0]!);
    await expect
      .poll(async () => (await optionValues(declaredCategory)).length, {
        timeout: 20_000,
        message: 'no categories offered for the chosen collection',
      })
      .toBeGreaterThan(0);
    const catValues = await optionValues(declaredCategory);
    await declaredCategory.selectOption(catValues[0]!);


    await expect(saveDraft).toBeEnabled();

    // --- 4. Save as draft → should land in the editor on the new piece -----
    await saveDraft.click();
    await page.waitForURL(/\/admin\/products/, { timeout: 30_000 });
    const idMatch = /[?&]id=([0-9a-f-]{36})/.exec(page.url());
    expect(idMatch, 'save did not route to the new product (no id in URL)').not.toBeNull();
    const productId = idMatch![1];
    createdIds.push(productId);


    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 20_000 });

    // --- 5. What was typed must be what's shown ----------------------------
    await expect(page.locator('#f-title')).toHaveValue(name, { timeout: 15_000 });
    await expect(page.locator('#f-quantity')).toHaveValue('3');
    await expect(page.locator('#f-dimensions_raw')).toHaveValue('30"W x 30"D x 18"H');

    // Declared taxonomy (Adrienne's vocabulary) must survive into the editor.
    const drawerCollection = page.locator('#f-collection_slug');
    await expect(drawerCollection).toBeVisible();
    expect((await drawerCollection.inputValue()).trim(), 'collection lost on the way into the editor').not.toBe('');

    const drawerCategory = page.locator('#f-category_slug');
    await expect(drawerCategory).toBeVisible();
    expect((await drawerCategory.inputValue()).trim(), 'category lost on the way into the editor').not.toBe('');
    expect(
      await drawerCategory.locator('option').count(),
      'category selector is empty in the editor',
    ).toBeGreaterThan(1);


    // A brand-new draft must NOT be publicly visible.
    const publicToggle = page.locator('#f-public_ready');
    if (await publicToggle.count()) {
      await expect(publicToggle).not.toBeChecked();
    }

    // --- 6. Edit after create, save, and confirm it persists ---------------
    await page.locator('#f-title').fill(renamed);
    const saveBtn = page.getByRole('button', { name: /^save \d+ change/i });
    await expect(saveBtn, 'editing a field did not enable Save').toBeEnabled({ timeout: 10_000 });
    await saveBtn.click();
    await expect(page.getByText(/^Saved/).first()).toBeVisible({ timeout: 20_000 });

    // Hard reload — the only honest test of "did it actually save".
    await page.goto(`http://localhost:8080/admin/products?id=${productId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#f-title')).toHaveValue(renamed, { timeout: 25_000 });

    // --- 7. Findable by name in inventory search ---------------------------
    await page.goto('http://localhost:8080/admin/products', { waitUntil: 'domcontentloaded' });
    const search = page.getByPlaceholder('Search title, RMS id, slug');
    await search.fill(renamed);
    await search.press('Enter');
    await expect(page.getByText(renamed).first()).toBeVisible({ timeout: 25_000 });

    // Opening it from the list must open the editor on the same piece.
    await page.getByText(renamed).first().click();
    await expect(page.locator('#f-title')).toHaveValue(renamed, { timeout: 20_000 });

    // --- 8. Teardown: the harness deletes what it made ----------------------
    // Parking the row as a draft was not cleanup — it left rows in the DB that
    // later surfaced as "unassigned" in Taxonomy Studio. The run now removes
    // its own artifact through the same delete path a staffer uses.
    createdIds.push(productId);
    await deleteArtifact(page, productId);
    createdIds.pop();


    // --- 9. Nothing ugly leaked to the user, console, or network -----------
    h.uiErrors.push(...(await visibleErrorText(page)));
    const unfriendly = h.uiErrors.filter((t) => UNFRIENDLY_ERROR.test(t));
    expect(unfriendly, `raw/unhelpful error copy shown to the user:\n${unfriendly.join('\n')}`).toEqual([]);
    expect(h.consoleErrors, `console errors during the flow:\n${h.consoleErrors.join('\n')}`).toEqual([]);
    expect(h.badRequests, `failed requests during the flow:\n${h.badRequests.join('\n')}`).toEqual([]);
  });

  test('validation is human-readable, not raw database errors', async ({ page, context }) => {
    const h = watch(page);
    await restoreSession(page, context);
    await page.goto('http://localhost:8080/admin/new-product', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible({ timeout: 20_000 });

    // Whitespace-only name must not be accepted as a real name.
    await page.getByPlaceholder('e.g. Travertine Side Table').fill('   ');
    await expect(page.getByRole('button', { name: /save as draft/i })).toBeDisabled();

    // Photo uploads must be gated until the piece has a name, with a hint
    // that says why — not a silent dead zone.
    await page.getByPlaceholder('e.g. Travertine Side Table').fill('');
    await expect(page.getByText(/add a title and choose where it lives to enable photo uploads/i)).toBeVisible();

    const shown = await visibleErrorText(page);
    const unfriendly = shown.filter((t) => UNFRIENDLY_ERROR.test(t));
    expect(unfriendly, `raw error copy on the new-product form:\n${unfriendly.join('\n')}`).toEqual([]);
    expect(h.consoleErrors, h.consoleErrors.join('\n')).toEqual([]);
  });
});
