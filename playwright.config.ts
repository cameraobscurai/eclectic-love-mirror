import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  // CI gate = console + network health only. Legacy `stress-test-*` and
  // `inspect-*` scripts are exploratory dev tools with 1.5m selector timeouts
  // — run them manually with `bunx playwright test stress-test-filters.spec.ts`.
  testMatch: ['console-health.spec.ts', 'stylebrief-console.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: '/bin/chromium', args: ['--no-sandbox'] },
  },
});
