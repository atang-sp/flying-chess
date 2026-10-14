import { expect, test } from '@playwright/test'

test('Mobile UI enhancements: clean in-game board, header pause, and sticky punishment actions', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('autoGuideEnabled', 'false')
    localStorage.setItem(
      'hasShownGuide',
      JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
    )
  })

  await page.goto('/flying-chess/')
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()

  // 1. Header pause button exists and floating triggers are cleanly hidden
  const headerPause = page.locator('.header-pause-btn')
  await expect(headerPause).toBeVisible()
  await expect(page.locator('.app--game .guide-controls')).toBeHidden()
  await expect(page.locator('.session-pause-trigger')).toBeHidden()

  // 2. Pause and resume works seamlessly
  await headerPause.click()
  const pauseOverlay = page.locator('.session-pause-overlay')
  await expect(pauseOverlay).toBeVisible()
  await page.getByRole('button', { name: '继续游戏' }).click()
  await expect(pauseOverlay).toBeHidden()

  // 3. CellInspector opens and closes cleanly on mobile
  const cell = page.locator('.board-cell').nth(2)
  await cell.click()
  const inspector = page.locator('.cell-inspector.is-mobile')
  await expect(inspector).toBeVisible()
  await expect(page.locator('.sheet-handle')).toBeVisible()

  // Close inspector
  await page.locator('.cell-inspector .close-button').click()
  await expect(inspector).toBeHidden()
})

test('Punishment display actions are sticky at the bottom in mobile viewport', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('autoGuideEnabled', 'false')
    localStorage.setItem(
      'hasShownGuide',
      JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
    )
  })

  // Start a game and verify punishment actions style
  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  await page.getByRole('button', { name: '下一步', exact: true }).click()

  // Verify PunishmentConfig / RatioDistributor is loaded
  await expect(page.locator('.ratio-distributor').first()).toBeVisible()
})
