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
