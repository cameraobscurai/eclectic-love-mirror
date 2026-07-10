import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['*.spec.ts'],
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
