import { expect, test, type Page } from '@playwright/test'
import { normalizeConfigSnapshot } from '@flying-chess/game-core/config'

test.setTimeout(45000)

const userId = '11111111-1111-4111-8111-111111111111'
const origin = 'https://account-test.supabase.co'

async function prepare(page: Page, signedIn = true) {
  const defaults = normalizeConfigSnapshot(undefined)
  const settings = {
    gameConfig: {
      boardConfig: { ...defaults.boardConfig, totalCells: 80 },
      punishmentConfig: defaults.punishmentConfig,
      trapConfig: defaults.traps,
      savedAt: Date.now(),
    },
    playerSettings: { playerCount: 2, playerNames: ['Cloud Alice', 'Cloud Bob'] },
    gameMode: 'classic',
    locale: 'zh',
    savedAt: Date.now(),
  }
  const rows: Record<string, Record<string, unknown>> = {
    user_configs: { user_id: userId, settings, updated_at: 'initial-config' },
    game_progress: {
      user_id: userId,
      totals: {
        completedGames: 2,
        punishmentCount: 0,
        mercyRequests: 0,
        longestChain: 0,
        variantCompletions: {},
      },
      shame_records: {},
      updated_at: 'initial-progress',
    },
  }
  let writes = 0
  let offline = false
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url())
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: cors })
      return
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      if (offline) {
        await route.abort('internetdisconnected')
        return
      }
      const table = url.pathname.split('/').pop() || ''
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: rows[table] ?? null, headers: cors })
        return
      }
      writes++
      rows[table] = {
        ...rows[table],
        ...route.request().postDataJSON(),
        updated_at: `write-${writes}`,
      }
      await route.fulfill({ json: rows[table], headers: cors })
      return
    }
    if (url.pathname.endsWith('/logout')) {
      await route.fulfill({ status: 204, headers: cors })
      return
    }
    if (url.pathname.endsWith('/recover')) {
      await route.fulfill({ json: {}, headers: cors })
      return
    }
    if (url.pathname.endsWith('/token')) {
      await route.fulfill({
        status: 400,
        json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
        headers: cors,
      })
      return
    }
    await route.fulfill({ json: {}, headers: cors })
  })
  await page.addInitScript(
    ({ origin, userId, signedIn }) => {
      localStorage.clear()
      localStorage.setItem('flying_chess_dev_supabase_url', origin)
      localStorage.setItem('flying_chess_dev_supabase_anon_key', 'test-public-key')
      localStorage.setItem('autoGuideEnabled', 'false')
      const expires = Math.floor(Date.now() / 1000) + 3600
      const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, exp: expires, role: 'authenticated' }))}.test`
      if (signedIn) {
        localStorage.setItem(
          'sb-account-test-auth-token',
          JSON.stringify({
            access_token: token,
            refresh_token: 'test-refresh',
            expires_at: expires,
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: userId,
              email: 'account-test@example.invalid',
              app_metadata: { provider: 'email' },
              user_metadata: {},
              aud: 'authenticated',
              created_at: '2026-10-01T00:00:00Z',
            },
          })
        )
      }
    },
    { origin, userId, signedIn }
  )
  await page.goto('/flying-chess/')
  return {
    rows,
    writes: () => writes,
    offline: (value: boolean) => {
      offline = value
    },
  }
}

test('restored login applies cloud settings to the visible app without an upload loop', async ({
  page,
}) => {
  const server = await prepare(page)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const app = window as unknown as {
          gameState: { boardConfig: { totalCells: number }; players: { name: string }[] }
        }
        return [
          app.gameState.boardConfig.totalCells,
          app.gameState.players.map(player => player.name),
        ]
      })
    )
    .toEqual([80, ['Cloud Alice', 'Cloud Bob']])
  await expect(page.locator('.name-input').first()).toHaveValue('Cloud Alice')
  await page.locator('.auth-btn').click()
  await expect(page.getByRole('dialog')).toContainText('同步完成')
  await page.waitForTimeout(1800)
  expect(server.writes()).toBeLessThanOrEqual(3)
  expect(server.rows.user_configs.settings).toMatchObject({
    gameConfig: { boardConfig: { totalCells: 80 } },
  })
})

test('manual sync reports offline failure and recovers while retaining the current game', async ({
  page,
}) => {
  const server = await prepare(page)
  await page.locator('.auth-btn').click()
  await expect(page.getByRole('dialog')).toContainText('同步完成')
  server.offline(true)
  await page.getByRole('button', { name: '立即同步' }).click()
  await expect(page.getByRole('dialog')).toContainText('同步失败', { timeout: 15000 })
  server.offline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByRole('dialog')).toContainText('同步完成')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.locator('.start-btn').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.getByRole('button', { name: /开始游戏/ }).click()
  await expect(page.locator('.game-board')).toBeVisible()
  await page.locator('.auth-btn').click()
  await expect(page.getByRole('button', { name: '退出登录' })).toBeDisabled()
  await page.getByRole('button', { name: '立即同步' }).click()
  await expect(page.getByRole('dialog')).toContainText('同步完成')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('.game-board')).toBeVisible()
})

test('a wrong password does not create an account and password recovery has a separate action', async ({
  page,
}) => {
  let registrations = 0
  page.on('request', request => {
    if (request.url().includes('/signup')) registrations++
  })
  await prepare(page, false)
  await page.locator('.auth-btn').click()
  await page.getByRole('button', { name: '使用邮箱密码' }).click()
  await page.getByPlaceholder('邮箱').fill('account-test@example.invalid')
  await page.getByPlaceholder('密码（至少 6 位）').fill('wrong-password')
  await page.locator('.email-form').getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Invalid login credentials')
  expect(registrations).toBe(0)
  await page.getByRole('button', { name: '找回密码' }).click()
  await page.locator('.email-form').getByRole('button', { name: '找回密码' }).click()
  await expect(page.getByRole('dialog')).toContainText('密码重置邮件已发送')
})
