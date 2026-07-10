import { test, expect, chromium, type ConsoleMessage } from '@playwright/test';

// Broad console + network health check across critical routes.
// Fails the build if any NEW console error or 4xx/5xx network response appears.
// Noise filters mirror stylebrief-console.spec.ts.

const BASE_URL = 'http://localhost:8080';

const ROUTES = [
  '/',
  '/collection',
  '/atelier',
  '/gallery',
  '/contact',
  '/stylebrief',
  '/faq',
  '/privacy',
];

const KNOWN_NOISE: RegExp[] = [
  /React does not recognize the `%s` prop/i,
  /non-static position.*scroll offset/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
  /hydrat/i,
  /data-tsd-source/i,
];

const NOISY_URL_HOSTS = [
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /doubleclick\.net/i,
];

const isKnownText = (t: string) => KNOWN_NOISE.some((re) => re.test(t));
const isNoisyUrl = (u?: string) => !!u && NOISY_URL_HOSTS.some((re) => re.test(u));

test.describe('site-wide console + network health', () => {
  test.setTimeout(180_000);

  for (const route of ROUTES) {
    test(`no new console/network errors on ${route}`, async () => {
      const browser = await chromium.launch({
        executablePath: '/bin/chromium',
        args: ['--no-sandbox'],
      });
      const page = await browser.newPage();
      const errors: string[] = [];

      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        const url = msg.location().url ?? '';
        if (isKnownText(text) || isNoisyUrl(url)) return;
        errors.push(`console: ${text} [${url}]`);
      });
      page.on('pageerror', (err) => {
        const t = err.message || String(err);
        if (!isKnownText(t)) errors.push(`pageerror: ${t}`);
      });
      page.on('response', (res) => {
        const status = res.status();
        const url = res.url();
        if (status >= 400 && !isNoisyUrl(url)) {
          errors.push(`network ${status}: ${url}`);
        }
      });

      await page.setViewportSize({ width: 1280, height: 1800 });
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
      } catch (e) {
        errors.push(`nav: ${(e as Error).message}`);
      }
      await page.waitForTimeout(1500);
      await browser.close();

      expect(errors, `Errors on ${route}:\n${errors.join('\n')}`).toHaveLength(0);
    });
  }
});
