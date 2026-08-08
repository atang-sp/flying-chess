import { devices, expect, test, type BrowserContextOptions, type Page } from '@playwright/test'
import packageJson from '../../package.json' with { type: 'json' }

const SESSION_STORAGE_KEY = 'flying-chess-online-session-v1'

interface StoredSession {
  readonly roomCode: string
  readonly playerId: string
  readonly resumeToken: string
}

function iphoneContextOptions(): BrowserContextOptions {
  const device = devices['iPhone 13']
  return {
    userAgent: device.userAgent,
    viewport: device.viewport,
    screen: device.screen,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
  }
}

function observePage(page: Page, consoleErrors: string[], receivedFrames: string[]): void {
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))
  page.on('websocket', socket => {
    socket.on('framereceived', event => receivedFrames.push(event.payload.toString()))
  })
}

async function readStoredSession(page: Page): Promise<StoredSession> {
  return page.evaluate(key => {
    const value = sessionStorage.getItem(key)
    if (!value) throw new Error('expected stored online session')
    return JSON.parse(value) as StoredSession
  }, SESSION_STORAGE_KEY)
}

test('iPhone WebKit completes create, join, start, disconnect, resume, and refresh privately', async ({
  browser,
}) => {
  const hostContext = await browser.newContext(iphoneContextOptions())
  const guestContext = await browser.newContext(iphoneContextOptions())
  const consoleErrors: string[] = []
  const hostFrames: string[] = []
  const guestFrames: string[] = []
  const resumedFrames: string[] = []
  const host = await hostContext.newPage()
  let guest = await guestContext.newPage()
  observePage(host, consoleErrors, hostFrames)
  observePage(guest, consoleErrors, guestFrames)

  try {
    await host.goto('/flying-chess/')
    await expect(host.locator('.version-display')).toHaveText(`v${packageJson.version}`)
    await expect(host.getByTestId('mode-classic')).toHaveAttribute('aria-pressed', 'true')
    await host.getByTestId('mode-party').click()
    await host.getByTestId('online-party-entry').click()
    await expect(host).toHaveURL(/\/flying-chess\/online\.html$/)
    await expect(host.getByText('房间服务已连接')).toBeVisible()
    await expect(host.getByText(`应用 v${packageJson.version}`, { exact: false })).toBeVisible()

    await host.getByTestId('nickname').fill('WebKit 主持人')
    await host.getByTestId('create-room').click()
    const roomCode = (await host.getByTestId('room-code').textContent())?.trim()
    expect(roomCode).toMatch(/^[A-Z2-9]{6}$/)

    await guest.goto(`/flying-chess/online.html?room=${roomCode}`)
    await expect(guest.getByText('房间服务已连接')).toBeVisible()
    await guest.getByTestId('nickname').fill('WebKit 玩家二')
    await guest.getByTestId('color').selectOption('#4ecdc4')
    await guest.getByTestId('join-room').click()
    await expect(host.getByTestId('room-player')).toHaveCount(2)

    const guestSession = await readStoredSession(guest)
    expect(hostFrames.join('').includes(guestSession.resumeToken)).toBe(false)
    expect((await readStoredSession(host)).resumeToken === guestSession.resumeToken).toBe(false)

    await Promise.all([host, guest].map(page => page.getByTestId('confirm-settings').click()))
    await expect(host.getByTestId('start-online-game')).toBeEnabled()
    await host.getByTestId('start-online-game').click()
    await expect(guest.getByTestId('predict-high')).toBeVisible()
    await expect(host.getByRole('region', { name: '飞行棋赛道' })).toBeVisible()

    await guest.close()
    await expect(host.getByText(/WebKit 玩家二 离线/)).toBeVisible()

    guest = await guestContext.newPage()
    observePage(guest, consoleErrors, resumedFrames)
    await guest.addInitScript(
      ({ key, storedSession }) => {
        if (sessionStorage.getItem(key) === null) {
          sessionStorage.setItem(key, JSON.stringify(storedSession))
        }
      },
      { key: SESSION_STORAGE_KEY, storedSession: guestSession }
    )
    await guest.goto('/flying-chess/online.html')
    await expect(guest.getByText('房间服务已连接')).toBeVisible()
    await expect(guest.getByTestId('predict-high')).toBeVisible()
    const resumedSession = await readStoredSession(guest)
    expect(resumedSession.playerId === guestSession.playerId).toBe(true)
    expect(resumedSession.resumeToken === guestSession.resumeToken).toBe(false)
    expect(resumedFrames.join('').includes(resumedSession.resumeToken)).toBe(true)
    expect(hostFrames.join('').includes(resumedSession.resumeToken)).toBe(false)

    await guest.reload()
    await expect(guest).toHaveURL(/\/flying-chess\/online\.html$/)
    await expect(guest.getByText('房间服务已连接')).toBeVisible()
    await expect(guest.getByTestId('predict-high')).toBeVisible()
    await expect(guest.getByTestId('mode-classic')).toHaveCount(0)
    expect(consoleErrors).toEqual([])
  } finally {
    await hostContext.close()
    await guestContext.close()
  }
})

test('iPhone WebKit shows an actionable incompatible-protocol error and never reconnects', async ({
  browser,
}) => {
  const context = await browser.newContext(iphoneContextOptions())
  const page = await context.newPage()
  const consoleErrors: string[] = []
  const frames: string[] = []
  let connectionCount = 0
  const storedSession: StoredSession = {
    roomCode: 'ABC234',
    playerId: 'fake-player-for-webkit-test',
    resumeToken: 'FAKE_RESUME_TOKEN_FOR_WEBKIT_TEST_ONLY',
  }
  observePage(page, consoleErrors, frames)
  await page.clock.install()
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
    key: SESSION_STORAGE_KEY,
    value: storedSession,
  })
  await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:8788\/?$/, socket => {
    connectionCount += 1
    socket.onMessage(() => {
      socket.send(
        JSON.stringify({
          type: 'error',
          code: 'INCOMPATIBLE_PROTOCOL',
          message: '联机协议版本不兼容，请刷新页面或关闭后重新打开。',
        })
      )
    })
  })

  try {
    await page.goto('/flying-chess/online.html')
    await expect(page.getByRole('alert')).toHaveText(
      '联机协议版本不兼容，请刷新页面或关闭后重新打开。'
    )
    const preservedSession = await readStoredSession(page)
    expect(JSON.stringify(preservedSession) === JSON.stringify(storedSession)).toBe(true)

    await page.clock.fastForward(30_000)
    expect(connectionCount).toBe(1)
    expect(consoleErrors).toEqual([])
  } finally {
    await context.close()
  }
})
