import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3100',
    channel: 'chrome',
    geolocation: { latitude: 30.2672, longitude: -97.7431 },
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
