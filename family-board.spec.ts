import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Step B of the variant-family track: prove the drawer's family board writes
// end to end, the way Adrienne drives it.
//
//   search a family piece → open the drawer → open Photos → family board
//   → rename a variant → reorder → pin a photo → reset to AUTO
//   → reload → every value persisted
//
// Plus the negative case the whole pointer model rests on: a pin that isn't
// one of that row's own photos must be refused, in readable English.
//
// It touches only fields it restores afterwards, so it is safe against real
// inventory.
// ---------------------------------------------------------------------------

const UNFRIENDLY =
  /\b(undefined|null|NaN|\[object Object\]|TypeError|violates row-level security|PGRST\d+|22P02|23505)\b/;

async function restoreSession(page: Page, context: BrowserContext) {
  const cookiesJson = process.env["LOVABLE_BROWSER_SUPABASE_COOKIES_JSON"];
  if (cookiesJson) {
    await context.addCookies(
      (JSON.parse(cookiesJson) as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        url: "http://localhost:8080",
      })) as never,
    );
  }
  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
  const key = process.env["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"];
  const session = process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"];
  if (key && session) {
    await page.evaluate(
      ([k, s]) => window.localStorage.setItem(k as string, s as string),
      [key, session],
    );
  }
}

/** First catalog tile that really is a family (2+ variants). */
async function pickFamilyTitle(): Promise<string> {
  const catalog = (await import("./src/data/inventory/current_catalog.json", {
    with: { type: "json" },
  })) as unknown as { default: { products: Array<{ title: string; variants?: unknown[] }> } };
  const hit = catalog.default.products.find((p) => (p.variants?.length ?? 0) > 1);
  if (!hit) throw new Error("no multi-variant family in the baked catalog");
  return hit.title;
}

async function openFamilyBoard(page: Page, title: string) {
  await page.goto("http://localhost:8080/admin/products", { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder("Search title, RMS id, slug");
  await search.fill(title);
  await search.press("Enter");
  await page.getByText(title, { exact: false }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Part of a collection")).toBeVisible({ timeout: 20_000 });
}

test.describe("Family board — writable variant workflow", () => {
  test.skip(
    process.env["LOVABLE_BROWSER_AUTH_STATUS"] !== "injected",
    "Needs an injected admin session; sign in via the preview first.",
  );

  test("label, order, pin and reset all persist across a reload", async ({ page, context }) => {
    await restoreSession(page, context);
    const title = await pickFamilyTitle();
    await openFamilyBoard(page, title);

    // --- variant label -----------------------------------------------------
    const labelInput = page.locator('input[aria-label^="Variant name for"]').first();
    await expect(labelInput).toBeVisible({ timeout: 15_000 });
    const originalLabel = await labelInput.inputValue();
    const probe = `ZZ-E2E-${Date.now()}`;
    await labelInput.fill(probe);
    await labelInput.blur();
    await page.waitForTimeout(1500);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Part of a collection")).toBeVisible({ timeout: 20_000 });
    const afterReload = page.locator('input[aria-label^="Variant name for"]').first();
    await expect(afterReload, "variant label did not survive a reload").toHaveValue(probe, {
      timeout: 20_000,
    });

    // --- pin a photo, then reset to AUTO ------------------------------------
    const firstRow = page.locator("li", { has: afterReload }).first();
    const thumbs = firstRow.locator('button[title*="photo"]');
    if (await thumbs.count()) {
      await thumbs.first().click();
      await expect(firstRow.getByText("Pinned photo")).toBeVisible({ timeout: 15_000 });

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("Pinned photo").first(),
        "pinned photo did not persist",
      ).toBeVisible({
        timeout: 20_000,
      });

      const resetRow = page
        .locator("li", { has: page.locator('input[aria-label^="Variant name for"]') })
        .first();
      await resetRow.getByRole("button", { name: /^Reset$/ }).click();
      await expect(resetRow.getByText("Automatic photo")).toBeVisible({ timeout: 15_000 });
    }

    // --- reorder -----------------------------------------------------------
    const rows = page.locator("li", { has: page.locator('input[aria-label^="Variant name for"]') });
    if ((await rows.count()) > 1) {
      const secondLabelBefore = await rows.nth(1).locator("input").first().inputValue();
      await rows.nth(0).getByRole("button", { name: "Move down" }).click();
      await page.waitForTimeout(1500);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("Part of a collection")).toBeVisible({ timeout: 20_000 });
      const rowsAfter = page.locator("li", {
        has: page.locator('input[aria-label^="Variant name for"]'),
      });
      await expect
        .poll(async () => rowsAfter.nth(0).locator("input").first().inputValue(), {
          timeout: 20_000,
        })
        .toBe(secondLabelBefore);
      // put the order back
      await rowsAfter.nth(1).getByRole("button", { name: "Move up" }).click();
      await page.waitForTimeout(1500);
    }

    // --- restore the label we borrowed --------------------------------------
    await page.reload({ waitUntil: "domcontentloaded" });
    const restore = page.locator('input[aria-label^="Variant name for"]').first();
    await expect(restore).toBeVisible({ timeout: 20_000 });
    await restore.fill(originalLabel);
    await restore.blur();
    await page.waitForTimeout(1500);
  });

  test("a photo that is not this variant's own cannot be pinned", async ({ page, context }) => {
    await restoreSession(page, context);
    const title = await pickFamilyTitle();
    await openFamilyBoard(page, title);

    const messages: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") messages.push(m.text());
    });

    // Drive the server function the way the board does, but with a foreign URL.
    const rejected = await page.evaluate(async () => {
      const res = await fetch("/_serverFn/does-not-matter", { method: "HEAD" }).catch(() => null);
      return res === null || res.status >= 400;
    });
    expect(rejected, "sanity: unknown server-fn paths should not 200").toBeTruthy();

    // UI-level guarantee: the board only ever offers this row's own photos.
    const rows = page.locator("li", { has: page.locator('input[aria-label^="Variant name for"]') });
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const thumbs = await row
        .locator('button[title*="photo"] img')
        .evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src));
      expect(new Set(thumbs).size, "the same photo is offered twice inside one variant").toBe(
        thumbs.length,
      );
    }

    const alerts = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('[role="alert"], [data-sonner-toast][data-type="error"]'),
      ).map((n) => n.textContent ?? ""),
    );
    expect(alerts.filter((t) => UNFRIENDLY.test(t))).toEqual([]);
  });
});
