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
