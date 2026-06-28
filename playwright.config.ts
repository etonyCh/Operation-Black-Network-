import { defineConfig } from '@playwright/test'
import { resolve } from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e-report' }]],
  use: {
    trace: 'on-first-retry',
  },
  // Global setup: ensure the app is built before E2E runs
  // Run: npm run build first
  globalSetup: './tests/e2e-global-setup.ts',
})
