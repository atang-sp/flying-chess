import { test, expect, type Page } from '@playwright/test'
import type { LocalProgress } from '../../src/services/localProgress'

const LOCAL_PROGRESS_KEY = 'flying-chess-local-progress-v1'

const setProgress = async (page: Page, progress: Partial<LocalProgress['totals']>) => {
  const fullProgress: LocalProgress = {
    version: 1,
    totals: {
      completedGames: 0,
      punishmentCount: 0,
      mercyRequests: 0,
      longestChain: 0,
      variantCompletions: {},
      ...progress,
    },
    players: {},
  }
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data))
      // Bypass the driver.js guide
      localStorage.setItem(
        'hasShownGuide',
        JSON.stringify(['intro', 'board_settings', 'settings', 'game', 'confirm'])
      )
    },
    { key: LOCAL_PROGRESS_KEY, data: fullProgress }
  )
}

test.describe('Progress Achievements', () => {
  test('all achievements locked by default', async ({ page }) => {
    await setProgress(page, {})
    await page.goto('/flying-chess/')

    // Open the details panel
    await page.getByTestId('my-achievements').click()

    const panel = page.locator('.progress-panel')
    await expect(panel).toBeVisible()

    const countText = panel.locator('.achievement-count small')
    await expect(countText).toContainText('0/16')

    const list = panel.locator('.achievement-list article')
    await expect(list).toHaveCount(16)

    // All should have the 'locked' class
    const lockedItems = panel.locator('.achievement-list article.locked')
    await expect(lockedItems).toHaveCount(16)
  })

  test('partial achievements unlocked', async ({ page }) => {
    await setProgress(page, {
      completedGames: 5,
      punishmentCount: 30,
      mercyRequests: 5,
      longestChain: 3,
      variantCompletions: { blindbox: 1, conditional: 1, deferred: 1, mutual: 1 },
    })
    await page.goto('/flying-chess/')

    await page.getByTestId('my-achievements').click()
    const panel = page.locator('.progress-panel')

    const countText = panel.locator('.achievement-count small')
    await expect(countText).toContainText('6/16')

    const unlockedItems = panel.locator('.achievement-list article:not(.locked)')
    await expect(unlockedItems).toHaveCount(6)

    // Check specific titles are present
    const content = panel.locator('.achievement-list')
    // Titles in Chinese since locale is default 'zh-CN'
    await expect(content).toContainText('完成首航')
    await expect(content).toContainText('飞行棋常客')
    await expect(content).toContainText('累计耐受')
    await expect(content).toContainText('求饶专家')
    await expect(content).toContainText('连锁飞行员')
    await expect(content).toContainText('命运收藏家')
  })

  test('all achievements unlocked', async ({ page }) => {
    await setProgress(page, {
      completedGames: 50,
      punishmentCount: 500,
      mercyRequests: 50,
      longestChain: 7,
      variantCompletions: { blindbox: 1, conditional: 1, deferred: 1, mutual: 1, encore: 1 },
    })
    await page.goto('/flying-chess/')

    await page.getByTestId('my-achievements').click()
    const panel = page.locator('.progress-panel')

    const countText = panel.locator('.achievement-count small')
    await expect(countText).toContainText('16/16')

    const list = panel.locator('.achievement-list article')
    await expect(list).toHaveCount(16)
    const lockedItems = panel.locator('.achievement-list article.locked')
    await expect(lockedItems).toHaveCount(0) // None should be locked

    // Check high-tier titles
    const content = panel.locator('.achievement-list')
    await expect(content).toContainText('沉迷其中')
    await expect(content).toContainText('天谴之子')
    await expect(content).toContainText('不可思议')
    await expect(content).toContainText('命运全图鉴')
  })

  test('language switching works for achievements', async ({ page }) => {
    await setProgress(page, { completedGames: 1 })
    await page.goto('/flying-chess/')

    await page.getByTestId('my-achievements').click()
    const panel = page.locator('.progress-panel')

    // Default zh-CN
    await expect(panel.locator('.achievement-list')).toContainText('完成首航')

    // Close dialog by clicking outside or close button.
    await page.keyboard.press('Escape')

    // Switch to English
    await page.getByTestId('lang-select').selectOption('en')

    // Open dialog again
    await page.getByTestId('my-achievements').click()

    // Expect the English title
    await expect(panel.locator('.achievement-list')).toContainText('First Flight')
    // And for locked ones
    await expect(panel.locator('.achievement-list')).toContainText('Master of Suffering')
  })
})
