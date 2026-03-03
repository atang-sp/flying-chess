import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4174/flying-chess/'

const DEFAULT_BODY_PARTS = ['屁股', '后背', '大腿', '臀缝', '手心']

const EXPECTED_COMPATIBILITY: Record<string, string[]> = {
  站立: ['屁股', '后背', '大腿', '臀缝', '手心'],
  手扶墙: ['屁股', '后背', '大腿', '臀缝'],
  趴在桌子上: ['屁股', '后背', '大腿', '臀缝'],
  手抓膝盖: ['屁股', '大腿', '臀缝'],
  跪趴: ['屁股', '后背', '大腿', '臀缝'],
}

test.describe('姿势-部位兼容性约束', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('autoGuideEnabled', 'false')
      localStorage.setItem(
        'hasShownGuide',
        JSON.stringify(['intro', 'board_settings', 'settings', 'game', 'punishment_confirmation'])
      )
    })
  })

  test('姿势卡片显示正确的兼容部位 chip', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // intro -> board_settings -> settings
    await page.locator('.start-btn').click()
    await expect(page.locator('h2:has-text("棋盘设置")')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '下一步：惩罚设置' }).click()
    await expect(page.locator('h2:has-text("惩罚设置")')).toBeVisible({ timeout: 5000 })

    // 找到姿势设置区域
    const positionSection = page.locator('.config-section', {
      has: page.locator('h4:has-text("姿势设置")'),
    })
    await expect(positionSection).toBeVisible()

    // 对每个预期姿势检查 chip 状态
    for (const [posName, compatParts] of Object.entries(EXPECTED_COMPATIBILITY)) {
      const card = positionSection.locator('.item-card', {
        has: page.locator(`.item-name:has-text("${posName}")`),
      })
      await expect(card).toBeVisible()

      const chips = card.locator('.body-part-chips .chip-label')
      const chipCount = await chips.count()
      expect(chipCount).toBe(DEFAULT_BODY_PARTS.length)

      for (const bp of DEFAULT_BODY_PARTS) {
        const chip = card.locator(`.chip-label:has-text("${bp}")`)
        if (compatParts.includes(bp)) {
          await expect(chip).toHaveClass(/active/)
        } else {
          await expect(chip).not.toHaveClass(/active/)
        }
      }
    }
  })

  test('切换兼容部位 chip 能正确更新', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    await page.locator('.start-btn').click()
    await expect(page.locator('h2:has-text("棋盘设置")')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '下一步：惩罚设置' }).click()
    await expect(page.locator('h2:has-text("惩罚设置")')).toBeVisible({ timeout: 5000 })

    const positionSection = page.locator('.config-section', {
      has: page.locator('h4:has-text("姿势设置")'),
    })

    // 找到"站立"卡片 — 默认所有部位都勾选
    const standCard = positionSection.locator('.item-card', {
      has: page.locator('.item-name:has-text("站立")'),
    })
    const handChip = standCard.locator('.chip-label:has-text("手心")')

    // 手心默认 active
    await expect(handChip).toHaveClass(/active/)

    // 点击取消勾选
    await handChip.click()
    await expect(handChip).not.toHaveClass(/active/)

    // 再次点击恢复勾选
    await handChip.click()
    await expect(handChip).toHaveClass(/active/)
  })

  test('生成的惩罚组合不含不兼容的姿势-部位搭配', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    await page.locator('.start-btn').click()
    await expect(page.locator('h2:has-text("棋盘设置")')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '下一步：惩罚设置' }).click()
    await expect(page.locator('h2:has-text("惩罚设置")')).toBeVisible({ timeout: 5000 })

    // 点击生成惩罚组合
    await page.getByRole('button', { name: '生成惩罚组合' }).click()

    // 等待确认弹窗出现
    const modal = page.locator('.punishment-confirmation')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // 遍历所有组合项，检查姿势-部位兼容性
    const items = modal.locator('.combination-item')
    const count = await items.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const item = items.nth(i)
      const posText = await item.locator('.combination-position .value').textContent()
      const bpText = await item.locator('.combination-body-part .value').textContent()

      const posName = posText?.trim() ?? ''
      const bpName = bpText?.trim() ?? ''

      if (posName in EXPECTED_COMPATIBILITY) {
        const allowed = EXPECTED_COMPATIBILITY[posName]
        expect(
          allowed.includes(bpName),
          `组合 #${i + 1} 不兼容: 姿势"${posName}" + 部位"${bpName}"`
        ).toBe(true)
      }
    }
  })
})
