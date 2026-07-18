import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('autoGuideEnabled', 'false')
    localStorage.setItem(
      'hasShownGuide',
      JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
    )
  })
})

test('desktop app fills the viewport width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')

  const viewportWidth = await page.evaluate(() => window.innerWidth)
  const appWidth = await page
    .locator('.app')
    .evaluate(element => element.getBoundingClientRect().width)

  expect(appWidth).toBeGreaterThanOrEqual(viewportWidth - 1)
})

test('mobile page has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/flying-chess/')

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('mobile game board page has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/flying-chess/')

  // 1. 点击开始游戏进入设置页
  await page.locator('.start-btn').click()
  await page.waitForTimeout(100)

  // 2. 点击下一步进入惩罚配置
  await page.locator('.page-actions .btn-primary').click()
  await page.waitForTimeout(100)

  // 3. 点击下一步进入陷阱配置
  await page.locator('.page-actions .btn-primary').click()
  await page.waitForTimeout(100)

  // 4. 点击生成惩罚组合
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.waitForSelector('.confirm-actions')

  // 5. 点击开始游戏
  await page.locator('.confirm-actions .btn-primary').click()

  // 6. 等待棋盘渲染完成并稳定
  await page.waitForSelector('.game-board')
  await page.waitForTimeout(500)

  // 7. 检查是否有横向溢出
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('total cell changes update the generated board', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()

  const totalCellsInput = page.locator('.config-item', { hasText: '总格子数' }).locator('input')
  await totalCellsInput.fill('80')

  await expect(totalCellsInput).toHaveValue('80')

  const state = await page.evaluate(() => {
    const gameState = (
      window as typeof window & {
        gameState: { boardConfig: { totalCells: number }; board: unknown[] }
      }
    ).gameState

    return {
      configuredTotalCells: gameState.boardConfig.totalCells,
      boardLength: gameState.board.length,
    }
  })

  expect(state).toEqual({ configuredTotalCells: 80, boardLength: 80 })
})

test('automatic board distribution reserves start and finish', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  const totalCellsInput = page.locator('.config-item', { hasText: '总格子数' }).locator('input')
  await totalCellsInput.fill('80')
  await page.getByRole('button', { name: /自动分配/ }).click()

  const boardConfig = await page.evaluate(() => {
    return (
      window as typeof window & {
        gameState: {
          boardConfig: {
            punishmentCells: number
            bonusCells: number
            reverseCells: number
            restCells: number
            restartCells: number
            trapCells: number
            totalCells: number
          }
        }
      }
    ).gameState.boardConfig
  })
  expect(boardConfig).toEqual({
    punishmentCells: 53,
    chainPunishmentCells: 5,
    bonusCells: 2,
    reverseCells: 4,
    restCells: 2,
    restartCells: 8,
    trapCells: 4,
    totalCells: 80,
  })
})

test('default board reports no unassigned effect cells', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()

  await expect(page.getByText('剩余可用格子：0 格')).toBeVisible()
})

test('movement watchdog preserves a turn while a trap overlay is active', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const states = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { gameStatus: string }
      showTrapDisplay: { value: boolean }
      checkGameStateHealth: () => void
    }
    const originalNow = Date.now
    const startedAt = originalNow()

    try {
      Date.now = () => startedAt
      debugWindow.gameState.gameStatus = 'moving'
      debugWindow.showTrapDisplay.value = true
      debugWindow.checkGameStateHealth()
      Date.now = () => startedAt + 6001
      debugWindow.checkGameStateHealth()
      const withOverlay = debugWindow.gameState.gameStatus

      debugWindow.showTrapDisplay.value = false
      debugWindow.checkGameStateHealth()
      Date.now = () => startedAt + 12002
      debugWindow.checkGameStateHealth()

      return {
        withOverlay,
        afterOverlay: debugWindow.gameState.gameStatus,
      }
    } finally {
      Date.now = originalNow
    }
  })

  expect(states).toEqual({
    withOverlay: 'moving',
    afterOverlay: 'waiting',
  })
})

test('clear local game data removes every persisted game key', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const storageKeys = [
    'ludo_game_config',
    'ludo_player_settings',
    'flying-chess-config-backup',
    'hasShownGuide',
    'autoGuideEnabled',
  ]
  await page.evaluate(keys => {
    keys.forEach(key => localStorage.setItem(key, 'persisted'))
  }, storageKeys)

  await page.locator('.clear-cache-btn').click()

  const remainingValues = await page.evaluate(
    keys => keys.map(key => localStorage.getItem(key)),
    storageKeys
  )
  expect(remainingValues).toEqual(storageKeys.map(() => null))
  await expect(page.locator('.clear-success-toast')).toContainText('本地游戏数据已清除')
})

test('invalid import leaves existing local data unchanged', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const existingData = {
    ludo_game_config: 'existing-config',
    ludo_player_settings: 'existing-players',
    'flying-chess-config-backup': 'existing-backup',
  }
  await page.evaluate(entries => {
    Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value))
  }, existingData)

  await page.locator('.guide-controls .export-btn').click()
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await page.locator('.json-textarea').fill(
    JSON.stringify({
      version: '1.0.0',
      data: {
        boardConfig: {
          punishmentCells: 18,
          bonusCells: 0,
          reverseCells: 0,
          restCells: 0,
          restartCells: 0,
          trapCells: 0,
          totalCells: 19,
        },
      },
    })
  )
  await page.locator('.import-text-btn').click()

  await expect(page.locator('.import-feedback--error')).toBeVisible()
  const storedData = await page.evaluate(keys => {
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]))
  }, Object.keys(existingData))
  expect(storedData).toEqual(existingData)
})

test('invalid legacy board cache does not break startup', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  const migrationPage = await page.context().newPage()
  const pageErrors: string[] = []
  migrationPage.on('pageerror', error => pageErrors.push(error.message))
  await migrationPage.addInitScript(() => {
    localStorage.setItem(
      'ludo_game_config',
      JSON.stringify({
        boardConfig: {
          punishmentCells: 30,
          bonusCells: 1,
          reverseCells: 2,
          restCells: 1,
          restartCells: 4,
          trapCells: 2,
          totalCells: 40,
        },
        savedAt: Date.now(),
      })
    )
  })

  await migrationPage.goto('/flying-chess/')
  await expect(migrationPage.locator('.start-btn')).toBeVisible()
  const boardState = await migrationPage.evaluate(() => {
    const gameState = (
      window as typeof window & {
        gameState: { boardConfig: { totalCells: number }; board: unknown[] }
      }
    ).gameState
    return {
      totalCells: gameState.boardConfig.totalCells,
      boardLength: gameState.board.length,
    }
  })

  expect(boardState).toEqual({ totalCells: 40, boardLength: 40 })
  const repairedBoardConfig = await migrationPage.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('ludo_game_config') ?? '{}') as {
      boardConfig?: unknown
    }
    return cached.boardConfig
  })
  expect(repairedBoardConfig).toEqual({
    punishmentCells: 26,
    chainPunishmentCells: 2,
    bonusCells: 1,
    reverseCells: 2,
    restCells: 1,
    restartCells: 4,
    trapCells: 2,
    totalCells: 40,
  })
  expect(pageErrors).toEqual([])
  await migrationPage.close()
})
