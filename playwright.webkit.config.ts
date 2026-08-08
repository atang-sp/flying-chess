import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  .version as string

export default defineConfig({
  testDir: './tests/webkit',
  testMatch: 'webkit-smoke.spec.ts',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `VITE_APP_VERSION=${packageVersion} VITE_ROOM_SERVER_URL=ws://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 4176`,
      url: 'http://127.0.0.1:4176/flying-chess/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'NODE_ENV=test HOST=127.0.0.1 PORT=8788 ROOM_SERVER_TEST_DICE=6 ROOM_SERVER_TEST_RECONNECT_GRACE_MS=500 npm run dev:room-server',
      url: 'http://127.0.0.1:8788/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'iphone-13-webkit',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
  ],
})
