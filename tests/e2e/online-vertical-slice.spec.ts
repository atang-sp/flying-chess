import { expect, test } from '@playwright/test'

test('两套浏览器通过房间服务器完成建房、加入、刷新重连、掷骰和移动', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()
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
