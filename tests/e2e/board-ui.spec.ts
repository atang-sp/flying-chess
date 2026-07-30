import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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

async function startDefaultGame(page: Page) {
  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.getByRole('button', { name: /开始游戏/ }).click()
  await expect(page.locator('.game-board')).toBeVisible()
}

test('手机上可轻点查看格子全文，并明确区分普通格和奖励格', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        board: Array<{
          position: number
          type: string
          effect?: Record<string, unknown>
        }>
      }
    }
    debugWindow.gameState.board[1] = {
      position: 2,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }
    debugWindow.gameState.board[2] = {
      position: 3,
      type: 'bonus',
      effect: { type: 'move', value: 3, description: '前进 3 步' },
    }
  })

  const normalCell = page.getByTestId('board-cell-2')
  const bonusCell = page.getByTestId('board-cell-3')

  await expect(normalCell).toHaveAttribute('data-kind', 'normal')
  await expect(normalCell).toContainText('普通')
  await expect(bonusCell).toHaveAttribute('data-kind', 'bonus')
  await expect(bonusCell).toContainText('奖励')

  const box = await normalCell.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(48)
  expect(box?.height).toBeGreaterThanOrEqual(48)

  await normalCell.click()
  const inspector = page.getByTestId('cell-inspector')
  await expect(inspector).toBeVisible()
  await page.waitForTimeout(200)
  await expect(inspector).toContainText('第 2 格')
  await expect(inspector).toContainText('普通格')
  await expect(inspector).toContainText('普通格子')

  await page.getByRole('button', { name: '下一格' }).click()
  await expect(inspector).toContainText('第 3 格')
  await expect(inspector).toContainText('奖励格')
  await expect(inspector).toContainText('前进 3 步')
})

test('升温局把幕、轮次、筹码和玩家进度合并到统一 HUD', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await page.getByTestId('start-game').click()

  const hud = page.getByTestId('party-status')
  await expect(hud).toHaveClass(/game-roster/)
  await expect(hud).toContainText('暖场')
  await expect(hud).toContainText('第 1 轮')
  await expect(hud).toContainText('玩家1 2 枚')
  await expect(page.getByTestId('roster-player-0')).toHaveClass(/is-current/)
  await expect(page.locator('.party-status-strip')).toHaveCount(0)
  await expect(page.locator('.score-panel')).toHaveCount(0)
})

test('桌面侧栏持续展示当前回合和所选格子详情', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startDefaultGame(page)
  const board = page.locator('.game-board')
  const inspector = page.getByTestId('cell-inspector')
  await expect(page.locator('.turn-dock')).toBeVisible()
  await expect(inspector).toBeVisible()
  await expect(inspector).toContainText('第 1 格')

  await page.getByTestId('board-cell-2').click()
  await expect(inspector).toContainText('第 2 格')
  await expect(inspector.getByRole('button', { name: '关闭格子详情' })).toHaveCount(0)

  const boardBox = await board.boundingBox()
  const inspectorBox = await inspector.boundingBox()
  expect(inspectorBox?.x).toBeGreaterThan((boardBox?.x ?? 0) + (boardBox?.width ?? 0))
})

test('棋盘支持键盘逐格浏览，手机详情关闭后焦点回到原格', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  const secondCell = page.getByTestId('board-cell-2')
  await secondCell.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('board-cell-3')).toBeFocused()

  await page.keyboard.press('Enter')
  const inspector = page.getByTestId('cell-inspector')
  await expect(inspector).toBeVisible()
  await expect(inspector.getByRole('button', { name: '关闭格子详情' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(inspector).toBeHidden()
  await expect(page.getByTestId('board-cell-3')).toBeFocused()
})

test('80 格长棋盘仍可定位并查看终点', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        board: Array<{
          id: number
          position: number
          type: 'bonus'
          effect: { type: 'move'; value: number; description: string }
        }>
      }
    }
    debugWindow.gameState.board = Array.from({ length: 80 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: `第 ${index + 1} 格` },
    }))
  })

  const finishCell = page.getByTestId('board-cell-80')
  await expect(finishCell).toHaveAttribute('data-kind', 'finish')
  await finishCell.scrollIntoViewIfNeeded()
  await finishCell.click()
  await expect(page.getByTestId('cell-inspector')).toContainText('第 80 格')
  await expect(page.getByTestId('cell-inspector')).toContainText('终点')
})

test('手机悬浮工具不会遮挡回合区，头部操作保持可触控', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  const measurements = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLElement)) return null
      const box = element.getBoundingClientRect()
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left }
    }
    const intersects = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>): boolean =>
      Boolean(
        first &&
          second &&
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top
      )

    const dock = rect('.turn-dock.is-mobile')
    const audio = rect('.audio-toggle-btn')
    return {
      guideOverDock: intersects(rect('.guide-btn'), dock),
      exportOverDock: intersects(rect('.export-btn'), dock),
      settingsOverDock: intersects(rect('.settings-toggle'), dock),
      pauseOverDock: intersects(rect('.session-pause-trigger'), dock),
      audioWidth: audio ? audio.right - audio.left : 0,
      audioHeight: audio ? audio.bottom - audio.top : 0,
    }
  })

  expect(measurements.guideOverDock).toBe(false)
  expect(measurements.exportOverDock).toBe(false)
  expect(measurements.settingsOverDock).toBe(false)
  expect(measurements.pauseOverDock).toBe(false)
  expect(measurements.audioWidth).toBeGreaterThanOrEqual(44)
  expect(measurements.audioHeight).toBeGreaterThanOrEqual(44)
})

test('重构后的回合区保留掷骰和落格触觉反馈', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      vibrations: Array<number | number[]>
      gameState: { players: Array<{ position: number }> }
    }
    debugWindow.vibrations = []
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        debugWindow.vibrations.push(pattern)
        return true
      },
    })
    debugWindow.gameState.players[0].position = 2
  })

  const readVibrations = () =>
    page.evaluate(
      () => (window as typeof window & { vibrations: Array<number | number[]> }).vibrations
    )
  await expect.poll(readVibrations).toContain(10)
  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await expect.poll(readVibrations).toContain(15)
})
