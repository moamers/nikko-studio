import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the built site, not the dev server — the production
 * bundle is what has to survive, and the dev server serves unbundled CSS in a
 * different order.
 *
 * On a machine where `npx playwright install chromium` has run, this needs no
 * configuration. In a sandbox that ships its own Chromium, point
 * `CHROMIUM_PATH` at the binary.
 */
const executablePath = process.env['CHROMIUM_PATH'];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build:fast && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
