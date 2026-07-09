import { test, expect, chromium, type ConsoleMessage } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

// Warnings/errors already present on the site that predate this test.
// Anything NEW that appears on /stylebrief will fail the build.
const KNOWN_NOISE: RegExp[] = [
  /React does not recognize the `%s` prop/i, // defaultMuted casing warning from hero videos
  /non-static position.*scroll offset/i,     // framer-motion measure warning
  /Download the React DevTools/i,
  /\[vite\]/i,
];

const isKnown = (text: string) => KNOWN_NOISE.some((re) => re.test(text));

test.describe('/stylebrief console health', () => {
  test.setTimeout(60_000);

  test('no new console errors on /stylebrief', async () => {
    const browser = await chromium.launch({
      executablePath: '/bin/chromium',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    const errors: string[] = [];

    const record = (msg: ConsoleMessage) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (isKnown(text)) return;
      errors.push(text);
    };
    page.on('console', record);
    page.on('pageerror', (err) => {
      const text = err.message || String(err);
      if (!isKnown(text)) errors.push(`pageerror: ${text}`);
    });

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/stylebrief`, { waitUntil: 'networkidle' });
    // Let post-hydration effects flush.
    await page.waitForTimeout(1500);

    await browser.close();

    if (errors.length) {
      console.error("=== ERRORS START ===\n" + errors.join("\n===\n") + "\n=== ERRORS END ===");
    }
    expect(errors, `Unexpected console errors on /stylebrief:\n${errors.join('\n')}`).toHaveLength(0);
  });
});
