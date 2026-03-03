import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/flying-chess/'

const demoConfigPath = fileURLToPath(
  new URL('../configs/exported-config-demo.json', import.meta.url)
)
const demoConfigRaw = fs.readFileSync(demoConfigPath, 'utf8')
const demoConfig = JSON.parse(demoConfigRaw) as {
  data: {
    boardConfig: Record<string, unknown>
    punishmentConfig: Record<string, unknown>
  }
}

function buildHugeCachedConfig() {
  const trapConfig = Array.from({ length: 320 }, (_, index) => ({
    id: `trap_${index + 1}`,
    name: `超大机关_${index + 1}`,
    description: `用于触发二维码容量超限验证_${index + 1}_${'超长描述'.repeat(36)}`,
  }))

  return {
    boardConfig: demoConfig.data.boardConfig,
    punishmentConfig: demoConfig.data.punishmentConfig,
    trapConfig,
    savedAt: Date.now(),
  }
}

async function openExportModal(page: Page) {
  await page.locator('button[title="导出配置"]').click()
  await expect(page.locator('.export-modal')).toBeVisible()
}

test.describe('导出与二维码链路验证', () => {
  test('JSON 下载、二维码下载、二维码导入识别应成功', async ({ context, page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('autoGuideEnabled', 'false')
      localStorage.setItem(
        'hasShownGuide',
        JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
      )
    })

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await openExportModal(page)

    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flying-chess-export-'))

    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '📄 导出 JSON' }).click(),
    ])
    const jsonPath = path.join(downloadDir, jsonDownload.suggestedFilename())
    await jsonDownload.saveAs(jsonPath)
    expect(fs.statSync(jsonPath).size).toBeGreaterThan(0)

    await openExportModal(page)
    await page.getByRole('button', { name: '🔲 生成二维码' }).click()
    await expect(page.locator('.qrcode-image')).toBeVisible({ timeout: 15000 })

    const [qrDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '💾 保存二维码' }).click(),
    ])
    const qrPath = path.join(downloadDir, qrDownload.suggestedFilename())
    await qrDownload.saveAs(qrPath)
    expect(fs.statSync(qrPath).size).toBeGreaterThan(0)

    await openExportModal(page)
    await page.getByRole('button', { name: '导入', exact: true }).click()
    await page.locator('#import-file').setInputFiles(qrPath)
    await expect(page.locator('.p-dialog-title', { hasText: '配置导入成功' })).toBeVisible({
      timeout: 15000,
    })

    await context.close()
  })

  test('超容量配置时应禁用生成二维码并提示', async ({ context, page }) => {
    const hugeConfig = buildHugeCachedConfig()

    await page.addInitScript(config => {
      localStorage.clear()
      localStorage.setItem('autoGuideEnabled', 'false')
      localStorage.setItem(
        'hasShownGuide',
        JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
      )
      localStorage.setItem(
        'ludo_player_settings',
        JSON.stringify({ playerCount: 4, playerNames: ['玩家A', '玩家B', '玩家C', '玩家D'] })
      )
      localStorage.setItem('ludo_game_config', JSON.stringify(config))
    }, hugeConfig)

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await openExportModal(page)

    await expect(page.getByText(/超过二维码容量|二维码容量超限/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: '🔲 生成二维码' })).toBeDisabled()

    await context.close()
  })
})
