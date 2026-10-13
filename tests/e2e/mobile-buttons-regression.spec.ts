import { expect, test } from '@playwright/test'

test('Mobile icon buttons retain exact square box model and visible SVGs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('autoGuideEnabled', 'false')
    localStorage.setItem(
      'hasShownGuide',
      JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
    )
  })

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  await page.getByRole('button', { name: '下一步', exact: true }).click()

  const bodyPartSection = page.locator('.ratio-distributor', { hasText: '部位设置' })
  await expect(bodyPartSection).toBeVisible()

  // 1. 验证 rd-btn-action 按钮在移动端是完美的正方形且内部 svg 没有被压缩
  const actionButtons = bodyPartSection.locator('.rd-actions button')
  const count = await actionButtons.count()
  expect(count).toBe(2)

  for (let i = 0; i < count; i++) {
    const btn = actionButtons.nth(i)
    const metrics = await btn.evaluate(el => {
      const rect = el.getBoundingClientRect()
      const svg = el.querySelector('svg')
      const svgRect = svg?.getBoundingClientRect()
      const computed = window.getComputedStyle(el)
      const svgComputed = svg ? window.getComputedStyle(svg) : null
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        padding: computed.padding,
        svgWidth: svgRect ? Math.round(svgRect.width) : 0,
        svgHeight: svgRect ? Math.round(svgRect.height) : 0,
        svgFlexShrink: svgComputed?.flexShrink,
      }
    })

    // 宽高应为 28px 正方形，不再是 26x44 的畸形竖条
    expect(metrics.width).toBe(28)
    expect(metrics.height).toBe(28)
    // 内部 svg 宽度高度应为 16px，未被挤压为 12px 或 0px
    expect(metrics.svgWidth).toBe(16)
    expect(metrics.svgHeight).toBe(16)
    expect(metrics.svgFlexShrink).toBe('0')
  }

  // 2. 验证惩罚配置中的 .btn-stat 按钮也是正方形
  const statButtons = page.locator('.btn-stat')
  const statCount = await statButtons.count()
  expect(statCount).toBeGreaterThan(0)

  for (let i = 0; i < statCount; i++) {
    const btn = statButtons.nth(i)
    if (await btn.isVisible()) {
      const metrics = await btn.evaluate(el => {
        const rect = el.getBoundingClientRect()
        const svg = el.querySelector('svg')
        const svgRect = svg?.getBoundingClientRect()
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          svgWidth: svgRect ? Math.round(svgRect.width) : 0,
          svgHeight: svgRect ? Math.round(svgRect.height) : 0,
        }
      })
      expect(metrics.width).toBe(26)
      expect(metrics.height).toBe(26)
      expect(metrics.svgWidth).toBe(14)
      expect(metrics.svgHeight).toBe(14)
    }
  }

  // 截个图保存看看现在的样式
  await bodyPartSection.screenshot({ path: 'scratch-body-parts-fixed.png' })
})
