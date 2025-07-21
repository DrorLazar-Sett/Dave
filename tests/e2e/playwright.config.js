// playwright.config.js - Playwright configuration

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'test_*.js',
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests for more predictable results
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['html', { open: 'never' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Emulate a desktop viewport
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York',
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  
  // Run your local server before starting the tests
  // Uncomment if you want Playwright to start the server
  // webServer: {
  //   command: 'npm start',
  //   port: 8080,
  //   reuseExistingServer: !process.env.CI,
  // },
});