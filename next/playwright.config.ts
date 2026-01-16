import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Simple POS E2E tests
 * @see https://playwright.dev/docs/test-configuration
 *
 * Debugging Features:
 * - Screenshots: Captured on every failure (see test-results/)
 * - Traces: Recorded on first retry for debugging (see test-results/)
 * - Videos: Recorded on first retry (see test-results/)
 * - Console Logs: Captured in HTML report
 *
 * Run with debugging:
 *   npm run test:e2e:debug    # Interactive debugger
 *   npm run test:e2e:ui       # UI mode with time-travel
 *   npm run test:e2e:trace    # Force trace recording on all tests
 */
export default defineConfig({
  // Global setup - fetches test data from WooCommerce before tests run
  globalSetup: require.resolve('./e2e/global-setup'),

  // Directory containing test files
  testDir: './e2e/tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only - retries help capture traces for debugging
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  // HTML reporter includes console logs, screenshots, traces, and videos
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never', // Don't auto-open; use 'npx playwright show-report' to view
    }],
    ['list'], // Console output during test run
    // JSON reporter useful for CI integrations
    ...(process.env.CI ? [['json', { outputFile: 'test-results/results.json' }] as const] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace: 'on-first-retry' captures trace when test fails and retries
    // Use 'on' to always capture (slower) or 'retain-on-failure' to keep only failures
    trace: process.env.TRACE ? 'on' : 'on-first-retry',

    // Take screenshot on failure - captures full page screenshot
    screenshot: 'only-on-failure',

    // Record video on failure - useful for seeing what happened
    video: 'on-first-retry',

    // Viewport size for consistent screenshots
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors (for self-signed certs in development)
    ignoreHTTPSErrors: true,

    // Context options for better debugging
    contextOptions: {
      // Record HAR file for network debugging (optional, can be enabled per-test)
      // recordHar: { path: 'test-results/network.har' },
    },
  },

  // Timeouts
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Capture console logs for debugging
        launchOptions: {
          // Uncomment to see browser console in terminal
          // args: ['--enable-logging'],
        },
      },
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration - start Next.js dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    // Capture server stdout/stderr for debugging server issues
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output folder for test artifacts (screenshots, traces, videos)
  outputDir: 'test-results',

  // Preserve output on failure for debugging
  preserveOutput: 'failures-only',
});
