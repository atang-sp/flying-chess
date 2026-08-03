import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  .version as string

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `VITE_APP_VERSION=${packageVersion} VITE_ROOM_SERVER_URL=ws://127.0.0.1:8787 npm run dev -- --host 127.0.0.1 --port 4175`,
      url: 'http://127.0.0.1:4175/flying-chess/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'NODE_ENV=test ROOM_SERVER_TEST_DICE=6 ROOM_SERVER_TEST_RECONNECT_GRACE_MS=500 npm run dev:room-server',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
