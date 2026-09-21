import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the HR Admin Portal E2E tests.
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Assumes:
 *   - Backend running on http://localhost:5000
 *   - Frontend Vite dev server running on http://localhost:3000
 *
 * To run:
 *   npx playwright test
 *
 * To run with UI:
 *   npx playwright test --ui
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // Run sequentially to avoid race conditions on shared DB
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'html',

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Optionally start dev servers before tests
    // Uncomment if you want playwright to manage the servers:
    // webServer: [
    //     {
    //         command: 'npm run dev',
    //         cwd: '.',
    //         port: 3000,
    //         reuseExistingServer: !process.env.CI,
    //     },
    //     {
    //         command: 'npm start',
    //         cwd: '../backend',
    //         port: 5000,
    //         reuseExistingServer: !process.env.CI,
    //     },
    // ],
});
