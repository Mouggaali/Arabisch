// Automatische browsertests van Darb met Playwright Test.  Gebruik:
//   npm install && npx playwright install chromium webkit firefox   (eenmalig)
//   npx playwright test                    steekproef (snel; ook in GitHub Actions vóór elke publicatie)
//   DARB_FULL=1 npx playwright test        alle 228 eenheden (duurt lang; wekelijks in GitHub Actions)
// De tests bouwen eerst dist/ en testen dus de versie die gepubliceerd wordt (met service worker).

import { defineConfig, devices } from '@playwright/test';

const full = process.env.DARB_FULL === '1';

export default defineConfig({
  testDir: 'tests',
  timeout: full ? 4 * 60 * 60 * 1000 : 15 * 60 * 1000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // De volledige run alleen in Chromium; de steekproef ook in Safari (WebKit, als iPhone) en Firefox.
    ...(full ? [] : [
      { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ]),
  ],
  webServer: {
    command: 'node tools/build-dist.mjs && node tools/serve.mjs 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
