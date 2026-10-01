import { expect, test } from '@playwright/test'

test('home toolbar menus remain within the viewport and persist guide preferences', async ({
  page,
}) => {
  await page.goto('/flying-chess/')
  await page.getByTitle('引导设置').click()
  await expect(page.locator('.settings-menu')).toBeInViewport({ ratio: 1 })
  const autoGuide = page.getByRole('checkbox', { name: '自动显示引导' })
  await expect(autoGuide).not.toBeChecked()
  await autoGuide.check()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('autoGuideEnabled')))
    .toBe('true')
  await autoGuide.uncheck()
  await page.getByTitle('引导设置').click()
  await page.getByTestId('app-language-btn').click()
  await expect(page.locator('.lang-menu')).toBeInViewport({ ratio: 1 })
})

test('first visit exposes three entries and starts locally without a guide', async ({ page }) => {
  await page.goto('/flying-chess/')
  await expect(page.getByTestId('mode-classic')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('mode-party')).toContainText('本地升温局')
  await expect(page.getByTestId('online-party-entry')).toBeVisible()
  await expect(page.locator('.driver-popover')).toBeHidden()
  await expect(page.locator('#advanced-settings')).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('quick-start-game')).toBeInViewport({ ratio: 1 })
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('party advanced action expands editors without starting or changing names', async ({
  page,
}) => {
  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await expect(page.getByTestId('quick-start-game')).toBeInViewport({ ratio: 1 })
  await page.locator('.name-input').first().fill('Alice')
  await page.getByTestId('start-game').click()
  await expect(page.locator('#advanced-settings')).toHaveAttribute('open', '')
  await expect(page.locator('.game-board')).toBeHidden()
  await expect(page.locator('.name-input').first()).toHaveValue('Alice')
  await page.getByTestId('advanced-settings-toggle').click()
  await expect(page.locator('#advanced-settings')).not.toHaveAttribute('open', '')
  await page.getByTestId('quick-start-game').click()
  await expect(page.getByTestId('party-status')).toContainText('party_v3')
  await expect(page.getByTestId('party-status')).toContainText('Alice')
})

test('guide can be skipped and reopened and points to quick start', async ({ page }) => {
  await page.goto('/flying-chess/')
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('.guide-btn').click()
    await expect(page.locator('.driver-popover')).toBeVisible()
    await page.locator('.driver-popover-next-btn').click()
    await page.locator('.driver-popover-next-btn').click()
    await expect(page.getByTestId('quick-start-game')).toHaveClass(/driver-active-element/)
    await page.locator('.driver-popover-close-btn').click()
    await expect(page.locator('.driver-popover')).toBeHidden()
  }
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()
  await expect(page.locator('.driver-popover')).toBeHidden()
})

test('short mobile viewport retains names after refresh and starts offline', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/flying-chess/')
  const name = page.locator('.name-input').first()
  await name.fill('Guest')
  await name.press('Enter')
  await expect(name).not.toBeFocused()
  await page.reload()
  await expect(name).toHaveValue('Guest')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  // Reduced viewport checks scrolling; a real phone IME remains manual acceptance.
  await page.setViewportSize({ width: 320, height: 320 })
  await name.fill('Offline')
  await page.context().setOffline(true)
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()
  await page.context().setOffline(false)
})
