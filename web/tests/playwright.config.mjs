import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.mjs'],
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:8901',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 8901 --directory ..',
    url: 'http://localhost:8901/index.html',
    reuseExistingServer: true,
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
