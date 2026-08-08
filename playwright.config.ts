import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  // CI gate = console + network health only.

  testMatch: ['console-health.spec.ts', 'stylebrief-console.spec.ts', 'audit-pages.spec.ts', 'quickview-view-full-page.spec.ts', 'inventory-e2e.spec.ts', 'layout-visual.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: '/bin/chromium', args: ['--no-sandbox'] },
  },
});
