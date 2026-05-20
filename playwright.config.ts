// ====================================================================
// Playwright config — E2E tests against a real Home Assistant
// ====================================================================
// Auth pattern: pre-populate `hassTokens` in localStorage with the
// long-lived access token. HA's frontend reads it on startup and
// skips the OAuth dance. The token is read from HA_TOKEN env var.
//
// Run: `HA_URL=http://... HA_TOKEN=... npx playwright test`
// Skipped automatically when those env vars aren't set.
// ====================================================================

import { defineConfig, devices } from '@playwright/test';

const HA_URL = process.env.HA_URL || 'http://localhost:8123';

export default defineConfig({
  testDir: './tests/e2e-browser',
  fullyParallel: false, // one HA → no concurrent dashboard mutations
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: HA_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
