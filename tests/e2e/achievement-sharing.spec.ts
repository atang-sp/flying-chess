import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function startParty(page: Page) {
  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('achievement-test-initialized')) {
      localStorage.clear()
      localStorage.setItem('achievement-test-initialized', 'true')
    }
    localStorage.setItem('autoGuideEnabled', 'false')
    const debug = window as typeof window & { __posterText: string[] }
    debug.__posterText = []
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      debug.__posterText.push(text)
      if (maxWidth === undefined) original.call(this, text, x, y)
      else original.call(this, text, x, y, maxWidth)
    }
  })
})

test('gameplay queues grouped achievements behind overlays and includes them at settlement', async ({
  page,
}) => {
  await startParty(page)
  await page.evaluate(() => {
    const debug = window as typeof window & {
      showTrapDisplay: { value: boolean }
      currentTrapDescription: { value: string }
      recordProgress: (event: { kind: string; playerName: string; count: number }) => void
    }
    debug.currentTrapDescription.value = '等待确认'
    debug.showTrapDisplay.value = true
    debug.recordProgress({ kind: 'punishment_completed', playerName: 'Private player', count: 100 })
  })
  await expect(page.getByTestId('achievement-notice')).toBeHidden()
  await page.evaluate(() => {
    const debug = window as typeof window & {
      showTrapDisplay: { value: boolean }
      gameState: { gameStatus: string }
      partyMode: { session: { value: Record<string, unknown> } }
    }
    debug.showTrapDisplay.value = false
    debug.gameState.gameStatus = 'waiting'
    debug.partyMode.session.value = { ...debug.partyMode.session.value, reaction: undefined }
  })
  await expect(page.getByTestId('achievement-notice')).toContainText('累计成就解锁')
  await expect(page.getByTestId('achievement-notice')).toContainText('累计耐受')
  await page.evaluate(() => {
    const debug = window as typeof window & { finishGameWithPlayer: (index: number) => void }
    debug.finishGameWithPlayer(0)
  })
  await expect(page.getByTestId('achievement-notice')).toBeHidden()
  await expect(page.getByTestId('new-achievements')).toContainText('完成首航')
  await expect(page.getByTestId('new-achievements').locator('li')).toHaveCount(4)
  await page.getByTestId('victory-create-poster').click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '保存图片', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('flying-chess-highlight.png')
  await file.saveAs(`/tmp/flying-chess-${test.info().project.name}-poster.png`)
  await page.screenshot({ path: `/tmp/flying-chess-${test.info().project.name}-poster-dialog.png` })
  const text = await page.evaluate(() =>
    (window as typeof window & { __posterText: string[] }).__posterText.join('|')
  )
  expect(text).toContain('成功反应')
  expect(text).not.toContain('Private player')
  await page.getByRole('button', { name: '关闭海报', exact: true }).click()
  await page
    .getByTestId('victory-scorecard')
    .getByRole('button', { name: '再来一局', exact: true })
    .click()
  await page.evaluate(() => {
    const debug = window as typeof window & { finishGameWithPlayer: (index: number) => void }
    debug.finishGameWithPlayer(0)
  })
  await expect(page.getByTestId('new-achievements')).toBeHidden()
})

test('historical achievements do not replay after reload; poster exports offline without private URLs', async ({
  page,
}) => {
  await startParty(page)
  await page.evaluate(() => {
    const debug = window as typeof window & { finishGameWithPlayer: (index: number) => void }
    debug.finishGameWithPlayer(0)
  })
  await page.reload()
  await expect(page.getByTestId('achievement-notice')).toBeHidden()
  await page.getByTestId('my-achievements').click()
  await expect(page.getByTestId('achievements-dialog')).toBeVisible()
  await expect(
    page.getByTestId('achievements-dialog').locator('.totals-grid strong').first()
  ).toHaveText('1')
  await page.getByTestId('achievement-create-poster').first().click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  // Actual exported pixels, including QR decoding; no auth or room URL may leak.
  const exported = await page.getByTestId('poster-image').evaluate(async image => {
    const { default: jsQR } = await import('/flying-chess/node_modules/.vite/deps/jsqr.js')
    const canvas = document.createElement('canvas')
    const img = image as HTMLImageElement
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas missing')
    context.drawImage(img, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    return {
      width: canvas.width,
      height: canvas.height,
      qr: jsQR(pixels.data, canvas.width, canvas.height)?.data,
    }
  })
  expect(exported).toEqual({
    width: 900,
    height: 1200,
    qr: 'https://atang-sp.github.io/flying-chess/',
  })
  await page.getByRole('button', { name: '关闭海报', exact: true }).click()
  await page.context().setOffline(true)
  await page.getByTestId('achievement-create-poster').first().click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  await page.getByRole('checkbox', { name: '在海报上显示昵称' }).check()
  await page.getByRole('textbox', { name: '海报昵称（可选）' }).fill('自选昵称')
  await expect(page.getByTestId('poster-image')).toBeVisible()
  expect(
    await page.evaluate(() => (window as typeof window & { __posterText: string[] }).__posterText)
  ).toContain('自选昵称')
  await page.context().setOffline(false)
  await page.getByRole('button', { name: '关闭海报', exact: true }).click()
  await expect(page.getByTestId('achievement-create-poster').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('achievements-dialog')).toBeHidden()
  await expect(page.getByTestId('my-achievements')).toBeFocused()
  await page.getByTestId('my-achievements').press('Enter')
  await page.getByTestId('achievement-create-poster').first().click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('achievements-dialog').getByTestId('poster-dialog')).toBeHidden()
  await expect(page.getByTestId('achievements-dialog')).toBeVisible()
  await expect(page.getByTestId('achievement-create-poster').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.getByTestId('my-achievements')).toBeFocused()
  // Closing the parent from application state also tears down its nested poster.
  await page.getByTestId('my-achievements').click()
  await page.getByTestId('achievement-create-poster').first().click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  await page
    .getByTestId('achievements-dialog')
    .evaluate(dialog => dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.getByTestId('my-achievements')).toBeFocused()
})

test('native share cancellation is silent and failures retain the save fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const debug = window as typeof window & { __shareFailure: string }
    debug.__shareFailure = 'AbortError'
    Object.defineProperty(navigator, 'canShare', { value: () => true })
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        throw new DOMException('test', debug.__shareFailure)
      },
    })
  })
  await startParty(page)
  await page.evaluate(() =>
    (
      window as typeof window & { finishGameWithPlayer: (index: number) => void }
    ).finishGameWithPlayer(0)
  )
  await page.getByTestId('victory-create-poster').click()
  await expect(page.getByTestId('poster-image')).toBeVisible()
  await page.getByRole('button', { name: '系统分享', exact: true }).click()
  await expect(page.getByTestId('poster-dialog').getByRole('alert')).toBeHidden()
  await page.evaluate(() => {
    ;(window as typeof window & { __shareFailure: string }).__shareFailure = 'NotAllowedError'
  })
  await page.getByRole('button', { name: '系统分享', exact: true }).click()
  await expect(page.getByTestId('poster-dialog').getByRole('alert')).toContainText('保存图片')
  await expect(page.getByRole('button', { name: '保存图片', exact: true })).toBeEnabled()
})

test('both home modes expose locked achievements directly with keyboard return on short screens', async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome')
    await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/flying-chess/')
  for (const mode of ['classic', 'party']) {
    await page.getByTestId(`mode-${mode}`).click()
    await expect(page.getByTestId('quick-start-game')).toBeInViewport({ ratio: 1 })
    const entry = page.getByTestId('my-achievements')
    await entry.focus()
    await entry.press('Enter')
    const dialog = page.getByTestId('achievements-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.totals-grid strong').first()).toHaveText('0')
    await expect(dialog.locator('.achievement-list article.locked')).toHaveCount(11)
    await expect(dialog.getByText('???', { exact: true })).toBeVisible()
    await expect(dialog.getByTestId('achievement-create-poster')).toHaveCount(0)
    await expect(dialog.locator('details')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: '关闭成就', exact: true })).toBeFocused()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(entry).toBeFocused()
    await entry.press('Space')
    await dialog.getByRole('button', { name: '关闭成就', exact: true }).click()
    await expect(entry).toBeFocused()
    await expect(page.locator('#advanced-settings')).not.toHaveAttribute('open', '')
    await expect(page.locator('#advanced-settings .progress-panel')).toHaveCount(0)
  }
  await page.context().setOffline(true)
  await page.getByTestId('my-achievements').click()
  await expect(
    page.getByTestId('achievements-dialog').getByText('???', { exact: true })
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByTestId('quick-start-game').click()
  await expect(page.locator('.game-board')).toBeVisible()
  await page.context().setOffline(false)
})

test('home achievement entry and close labels are translated in every existing language', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')
  await page.goto('/flying-chess/')
  for (const language of ['zh', 'en', 'ja', 'ko', 'de', 'es', 'fr', 'it', 'pt', 'ru']) {
    const dictionary = JSON.parse(
      readFileSync(`src/locales/${language === 'zh' ? 'zh-CN' : language}.json`, 'utf8')
    )
    await page.evaluate(language => localStorage.setItem('flying-chess-locale', language), language)
    await page.reload()
    const entry = page.getByTestId('my-achievements')
    await expect(entry).toHaveText(dictionary.my_achievements)
    await entry.click()
    const dialog = page.getByTestId('achievements-dialog')
    await expect(
      dialog.getByRole('heading', { name: dictionary.my_achievements, exact: true })
    ).toBeVisible()
    await dialog.getByRole('button', { name: dictionary.achievements_close, exact: true }).click()
    await expect(entry).toBeFocused()
  }
})
