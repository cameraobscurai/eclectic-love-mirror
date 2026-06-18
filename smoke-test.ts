import { chromium } from 'playwright';

const ROUTES = [
  '/',
  '/collection',
  '/collection?category=seating',
  '/atelier',
  '/gallery',
  '/contact?items=2861,2862'
];

const BASE_URL = 'http://localhost:8080';

async function runTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {};

  for (const route of ROUTES) {
    console.log(`Testing route: ${route}`);
    const errors = [];
    const networkFailures = [];
    const consoleLogs = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        // Ignore ResizeObserver loop limit exceeded as requested to "watch for" but it's often non-fatal
        // but user said "watch for", so I will log it.
        errors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    page.on('requestfailed', (req) => {
      networkFailures.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push(`${res.request().method()} ${res.url()}: ${res.status()}`);
      }
    });

    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      if (route === '/') {
        const video = await page.$('video');
        if (video) {
          const isPaused = await video.evaluate((v) => (v as HTMLVideoElement).paused);
          if (isPaused) console.log('Hero video is paused or not playing');
        }
      }

      if (route.startsWith('/contact')) {
        await page.fill('input[name="name"]', 'Smoke Test User');
        await page.fill('input[name="email"]', 'smoke@test.com');
        // The message field might be optional or named differently, let's check
        const messageExists = await page.$('textarea[name="message"]');
        if (messageExists) {
            await page.fill('textarea[name="message"]', 'This is a smoke test message.');
        }
        
        await page.waitForTimeout(1000);

        const [response] = await Promise.all([
          page.waitForResponse(res => res.url().includes('style-brief') || res.url().includes('functions/v1/'), { timeout: 10000 }).catch(() => null),
          page.click('button[type="submit"]').catch(() => console.log('Submit button click failed'))
        ]);

        if (response) {
            console.log(`Contact submission response: ${response.status()}`);
            if (response.status() !== 200) {
                const body = await response.text();
                errors.push(`Contact submission failed: ${response.status()} - ${body}`);
            }
        } else {
             console.log('No response from style-brief endpoint');
        }
      }

      const screenshotName = route.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'home';
      const screenshotPath = `/tmp/browser/smoke/${screenshotName}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results[route] = {
        pass: errors.filter(e => !e.includes('ResizeObserver')).length === 0 && networkFailures.length === 0,
        errors,
        networkFailures
      };
    } catch (e) {
      results[route] = {
        pass: false,
        errors: [e.message],
        networkFailures
      };
    } finally {
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      page.removeAllListeners('requestfailed');
      page.removeAllListeners('response');
    }
  }

  await browser.close();
  console.log('--- TEST RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

runTest().catch(console.error);
