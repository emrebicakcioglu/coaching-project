/**
 * Playwright Configuration
 * STORY-006B: User CRUD Frontend UI
 * STORY-007B: Login System Frontend UI
 * STORY-008: Session Management mit "Remember Me"
 * STORY-017A: Layout & Grid-System
 * STORY-017B: Theme-System Frontend
 * STORY-018B: Context Menu Responsive & Mobile
 * STORY-030: Application Versioning
 * STORY-3: Register Page UI Audit - Production testing support
 * STORY-107: MFA Settings Page UI Audit
 *
 * Configuration for E2E tests using Playwright.
 *
 * Testing Modes:
 * 1. Development (default): Tests run against local dev server (npm run dev)
 *    Command: npx playwright test
 *
 * 2. Production/Docker: Tests run against Docker container at localhost:14100
 *    Command: FRONTEND_URL=http://localhost:14100 npx playwright test --project=chromium
 *    Note: Ensure Docker container is running: docker-compose up -d frontend
 *
 * The webServer config is disabled when FRONTEND_URL is set, allowing tests
 * to run against the production Docker container.
 */

import { defineConfig, devices } from '@playwright/test';

// Determine if we're testing against production (Docker container)
const isProductionTest = !!process.env.FRONTEND_URL;

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Expect assertions timeout
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // STORY-3: Use FRONTEND_URL for production testing (http://localhost:14100)
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  // STORY-3: Disable webServer when testing against production (FRONTEND_URL is set)
  // This allows tests to run against the Docker container without starting a dev server
  webServer: isProductionTest
    ? undefined
    : [
        {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      ],
});
