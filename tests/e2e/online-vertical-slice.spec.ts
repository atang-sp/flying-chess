import {
  devices,
  expect,
  test,
  type BrowserContextOptions,
  type ViewportSize,
} from '@playwright/test'

function projectContextOptions(
  projectName: string,
  viewport: ViewportSize | null | undefined
): BrowserContextOptions {
  const device = projectName === 'mobile-chrome' ? devices['Pixel 5'] : devices['Desktop Chrome']
  return {
    userAgent: device.userAgent,
    viewport: viewport ?? device.viewport,
    screen: device.screen,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
  }
}

test('扫码受邀页突出加入动作，并允许两名玩家确认后开局', async ({ browser }, testInfo) => {
  const options = projectContextOptions(testInfo.project.name, testInfo.project.use.viewport)
  const hostContext = await browser.newContext(options)
  const guestContext = await browser.newContext(options)
  const host = await hostContext.newPage()
  const guest = await guestContext.newPage()

  try {
    await host.goto('/flying-chess/online.html')
    await host.getByTestId('nickname').fill('主持人')
    await host.getByTestId('create-room').click()
    const roomCode = (await host.getByTestId('room-code').textContent())?.trim()
    expect(roomCode).toMatch(/^[A-Z2-9]{6}$/)

    await guest.goto('/flying-chess/online.html')
    await guest.evaluate(() => {
      sessionStorage.setItem(
        'flying-chess-online-session-v1',
        JSON.stringify({ roomCode: 'OLD234', playerId: 'old-player', resumeToken: 'old-token' })
      )
    })
    await guest.goto(`/flying-chess/online.html?room=${roomCode}`)
    await expect(guest.getByRole('heading', { name: '加入受邀房间' })).toBeVisible()
    await expect(guest.getByTestId('invite-room-code')).toHaveText(roomCode ?? '')
    await expect(guest.getByTestId('create-room')).toHaveCount(0)
    await guest.getByTestId('nickname').fill('玩家二')
    await guest.getByTestId('join-room').click()

    await expect(host.getByTestId('room-player')).toHaveCount(2)
    await expect(guest.getByTestId('scene-setting-label')).toHaveText('默认升温局')
    await expect(guest.getByTestId('board-setting-label')).toHaveText('升温局默认棋盘')
    await Promise.all([host, guest].map(page => page.getByTestId('confirm-settings').click()))
    await expect(host.getByTestId('start-online-game')).toBeEnabled()
    await host.getByTestId('start-online-game').click()
    await expect(host.getByTestId('host-role')).toHaveText('你是主持人')
    await expect(guest.getByTestId('host-role')).toHaveCount(0)
    await expect(guest.getByTestId('act-label')).toHaveText('热身阶段')
    await guest.getByTestId('request-pause').click()
    await expect(host.getByText('1 人请求暂停，等待主持人决定。')).toBeVisible()
    await expect(guest.getByTestId('request-pause')).toBeDisabled()
    await host.getByTestId('pause-game').click()
    await expect(guest.getByText('游戏已暂停，倒计时已冻结。')).toBeVisible()
    await expect(guest.getByTestId('resume-game')).toHaveCount(0)
    await host.getByTestId('resume-game').click()
    await guest.getByTestId('predict-high').click()
    await expect(host.getByTestId('roll-dice')).toBeVisible()
  } finally {
    await hostContext.close()
    await guestContext.close()
  }
})

test('两套浏览器通过房间服务器完成建房、加入、刷新重连、掷骰和移动', async ({
  browser,
}, testInfo) => {
  const options = projectContextOptions(testInfo.project.name, testInfo.project.use.viewport)
  const hostContext = await browser.newContext(options)
  const guestContext = await browser.newContext(options)
  const host = await hostContext.newPage()
  const playerTwo = await guestContext.newPage()
  const playerThree = await guestContext.newPage()

  try {
    await host.goto('/flying-chess/online.html')
    await host.getByTestId('nickname').fill('主持人')
    await host.getByTestId('create-room').click()
    const roomCode = (await host.getByTestId('room-code').textContent())?.trim()
    expect(roomCode).toMatch(/^[A-Z2-9]{6}$/)

    await playerTwo.goto(`/flying-chess/online.html?room=${roomCode}`)
    await playerTwo.getByTestId('nickname').fill('玩家二')
    await playerTwo.getByTestId('color').selectOption('#4ecdc4')
    await playerTwo.getByTestId('join-room').click()

    await playerThree.goto(`/flying-chess/online.html?room=${roomCode}`)
    await playerThree.getByTestId('nickname').fill('玩家三')
    await playerThree.getByTestId('color').selectOption('#45b7d1')
    await playerThree.getByTestId('join-room').click()

    await expect(host.getByTestId('room-player')).toHaveCount(3)
    await Promise.all(
      [host, playerTwo, playerThree].map(page => page.getByTestId('confirm-settings').click())
    )
    await expect(host.getByTestId('start-online-game')).toBeEnabled()
    await host.getByTestId('start-online-game').click()
    await playerTwo.getByTestId('predict-high').click()
    await expect(host.getByTestId('roll-dice')).toBeVisible()

    await host.getByTestId('roll-dice').click()
    await expect(host.getByTestId('dice-value')).toHaveText('6')
    await expect(playerTwo.getByTestId('dice-value')).toHaveText('6')
    await expect(playerThree.getByTestId('dice-value')).toHaveText('6')

    await playerTwo.getByTestId('reaction-keep').click()

    await host.getByTestId('move').click()
    await expect(host.getByTestId('player-position').first()).toHaveText('第 1 格')
    await expect(playerTwo.getByTestId('player-position').first()).toHaveText('第 1 格')
    await expect(playerThree.getByTestId('player-position').first()).toHaveText('第 1 格')
    await expect(playerTwo.getByTestId('roll-dice')).toBeVisible()

    await playerTwo.reload()
    await expect(playerTwo.getByText('房间服务已连接')).toBeVisible()
    await expect(playerTwo.getByTestId('roll-dice')).toBeVisible()
    await expect(playerTwo.getByTestId('player-position')).toHaveCount(3)
  } finally {
    await hostContext.close()
    await guestContext.close()
  }
})

test('主持人断线后明确通知接任玩家，并说明双人局保留离线席位的原因', async ({
  browser,
}, testInfo) => {
  const options = projectContextOptions(testInfo.project.name, testInfo.project.use.viewport)
  const hostContext = await browser.newContext(options)
  const guestContext = await browser.newContext(options)
  const host = await hostContext.newPage()
  const guest = await guestContext.newPage()

  try {
    await host.goto('/flying-chess/online.html')
    await host.getByTestId('nickname').fill('主持人')
    await host.getByTestId('create-room').click()
    const roomCode = (await host.getByTestId('room-code').textContent())?.trim()
    expect(roomCode).toMatch(/^[A-Z2-9]{6}$/)

    await guest.goto(`/flying-chess/online.html?room=${roomCode}`)
    await guest.getByTestId('nickname').fill('接任玩家')
    await guest.getByTestId('join-room').click()
    await Promise.all([host, guest].map(page => page.getByTestId('confirm-settings').click()))
    await host.getByTestId('start-online-game').click()
    await expect(guest.getByTestId('host-role')).toHaveCount(0)

    await host.close()
    await expect(guest.getByTestId('host-role')).toHaveText('你是主持人')
    await expect(guest.getByRole('status')).toHaveText('原主持人离线或已转交，你已接任主持人。')
    await expect(guest.getByTestId('offline-retention-status')).toHaveText('双人局需保留两位玩家')
  } finally {
    await hostContext.close()
    await guestContext.close()
  }
})
