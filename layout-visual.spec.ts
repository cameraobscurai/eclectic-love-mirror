import { test, expect, type Page } from "@playwright/test";

// Screenshot regression for the two detail surfaces that keep drifting:
// the QuickView modal and the PDP stage. Both render through the shared
// fit solver (src/components/collection/productFit.ts), so a scaling or
// layout regression shows up here as a pixel diff.
//
// Baselines live in layout-visual.spec.ts-snapshots/. To intentionally
// re-baseline after a design change:
//   bunx playwright test layout-visual.spec.ts --update-snapshots

// Pinned slugs, one wide/floor-anchored item, one tall/compact item, one
// table — the three shapes the solver treats differently.
const CASES = [
  { name: "seating", slug: "adelaide-antique-arm-chair-2970" },
  { name: "lighting", slug: "amitola-led-corner-light" },
  { name: "tables", slug: "aaron-matte-black-plank-coffee-table-2861" },
] as const;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

// Freeze anything non-deterministic: animation, video posters, grain, caret.
async function stabilize(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
  await page.evaluate(async () => {
    // Wait for fonts + all in-viewport images to settle before capture.
    await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((r) => {
              img.addEventListener("load", () => r(), { once: true });
              img.addEventListener("error", () => r(), { once: true });
            }),
      ),
    );
  });
  // One more frame so the solver's measured transforms are applied.
  await page.waitForTimeout(300);
}

const SHOT_OPTS = {
  animations: "disabled",
  caret: "hide",
  // Small tolerance: image decoding/AA differs slightly across machines,
  // but a real layout or scale drift moves far more than 1.5% of pixels.
  maxDiffPixelRatio: 0.015,
  threshold: 0.25,
} as const;

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const c of CASES) {
      test(`QuickView layout — ${c.name}`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto(`/collection?view=${encodeURIComponent(c.slug)}`, {
          waitUntil: "domcontentloaded",
        });

        const dialog = page.getByRole("dialog");
        await dialog.waitFor({ state: "visible", timeout: 20_000 });
        await stabilize(page);

        await expect(dialog).toHaveScreenshot(`quickview-${c.name}-${vp.name}.png`, SHOT_OPTS);
      });

      test(`PDP layout — ${c.name}`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto(`/collection/${c.slug}`, { waitUntil: "domcontentloaded" });

        await page.getByRole("heading", { level: 1 }).waitFor({
          state: "visible",
          timeout: 20_000,
        });
        await stabilize(page);

        // Above-the-fold stage: hero image + title + specs. That's where
        // fit/scale drift lives; below-fold editorial content is noisy.
        await expect(page).toHaveScreenshot(`pdp-${c.name}-${vp.name}.png`, {
          ...SHOT_OPTS,
          fullPage: false,
        });
      });
    }
  });
}
