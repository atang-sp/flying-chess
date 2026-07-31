import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface BrowserTelemetryEvent {
  name: string
  data: Record<string, string>
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const telemetryWindow = window as typeof window & {
      __GAME_TELEMETRY_EVENTS__: BrowserTelemetryEvent[]
      __GAME_TELEMETRY_FAILURE__: 'none' | 'throw' | 'reject'
      __GAME_TELEMETRY_TEST_ADAPTER__: {
        track: (name: string, data: Record<string, string>) => void | Promise<void>
      }
    }
    telemetryWindow.__GAME_TELEMETRY_EVENTS__ = []
    telemetryWindow.__GAME_TELEMETRY_FAILURE__ = 'none'
    telemetryWindow.__GAME_TELEMETRY_TEST_ADAPTER__ = {
      track: (name, data) => {
        if (telemetryWindow.__GAME_TELEMETRY_FAILURE__ === 'throw') {
          throw new Error('telemetry transport failed synchronously')
        }
        if (telemetryWindow.__GAME_TELEMETRY_FAILURE__ === 'reject') {
          return Promise.reject(new Error('telemetry transport failed asynchronously'))
        }
        telemetryWindow.__GAME_TELEMETRY_EVENTS__.push({ name, data })
      },
    }

    localStorage.clear()
    localStorage.setItem('autoGuideEnabled', 'false')
    localStorage.setItem(
      'hasShownGuide',
      JSON.stringify(['intro', 'board_settings', 'settings', 'game'])
    )
  })
})

async function enterDefaultSettings(page: Page) {
  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible()
}

async function startDefaultGame(page: Page) {
  await enterDefaultSettings(page)
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.getByRole('button', { name: /开始游戏/ }).click()
  await expect(page.locator('.game-board')).toBeVisible()
}

async function startPartyGame(page: Page) {
  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('party-status')).toBeVisible()
  await expect(page.locator('.game-board')).toBeVisible()
}

async function getTelemetryEvents(page: Page): Promise<BrowserTelemetryEvent[]> {
  return page.evaluate(() => {
    return (
      window as typeof window & {
        __GAME_TELEMETRY_EVENTS__: BrowserTelemetryEvent[]
      }
    ).__GAME_TELEMETRY_EVENTS__
  })
}

async function completeGameForTelemetry(page: Page) {
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        gameStatus: string
        winner: unknown
        players: unknown[]
      }
      gameFinished: { value: boolean }
    }
    debugWindow.gameState.winner = debugWindow.gameState.players[0]
    debugWindow.gameState.gameStatus = 'finished'
    debugWindow.gameFinished.value = true
  })
}

test('selects and starts party mode with anonymous mode telemetry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)

  await expect
    .poll(async () => (await getTelemetryEvents(page)).map(event => event.name))
    .toEqual(['app_open', 'mode_selected', 'mode_switched', 'setup_started', 'game_started'])

  const events = await getTelemetryEvents(page)
  expect(events[1].data).toMatchObject({
    mode_id: 'party',
    ruleset_version: 'party_v2',
  })
  expect(events[2].data).toMatchObject({
    mode_id: 'party',
    previous_mode_id: 'classic',
    ruleset_version: 'party_v2',
  })
  expect(events[4].data).toMatchObject({
    mode_id: 'party',
    ruleset_version: 'party_v2',
    player_count_bucket: '2',
  })
  for (const event of events) {
    expect(event.data).not.toHaveProperty('player_name')
    expect(event.data).not.toHaveProperty('punishment')
    expect(event.data).not.toHaveProperty('duration_ms')
    expect(event.data).not.toHaveProperty('turn_count')
  }
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('flying-chess-game-mode')))
    .toBe('party')
})

test('party mode preserves the classic custom configuration while running and after reset', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        punishmentConfig: { minStrikes: number }
      }
    }
    debugWindow.gameState.punishmentConfig.minStrikes = 10
  })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cached = JSON.parse(localStorage.getItem('ludo_game_config') ?? '{}') as {
          punishmentConfig?: { minStrikes?: number }
        }
        return cached.punishmentConfig?.minStrikes
      })
    )
    .toBe(10)

  await page.getByTestId('mode-party').click()
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('party-status')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cached = JSON.parse(localStorage.getItem('ludo_game_config') ?? '{}') as {
          punishmentConfig?: { minStrikes?: number }
        }
        return cached.punishmentConfig?.minStrikes
      })
    )
    .toBe(10)

  await page.getByRole('button', { name: '暂停本局' }).click()
  await page.getByRole('button', { name: '结束本局' }).click()
  await expect(page.getByTestId('mode-party')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cached = JSON.parse(localStorage.getItem('ludo_game_config') ?? '{}') as {
          punishmentConfig?: { minStrikes?: number }
        }
        return cached.punishmentConfig?.minStrikes
      })
    )
    .toBe(10)
})

test('party reaction resolves before the active player may spend one reroll token', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await expect(page.getByTestId('party-reaction-overlay')).toBeVisible()
  await page.getByTestId('predict-low').click()

  await expect
    .poll(
      async () =>
        (await page.getByTestId('reaction-keep').isVisible()) ||
        (await page.getByTestId('party-dice-decision').isVisible())
    )
    .toBe(true)

  if (await page.getByTestId('reaction-keep').isVisible()) {
    await page.getByTestId('reaction-keep').click()
  }

  await expect(page.getByTestId('party-dice-decision')).toBeVisible()
  await expect(page.getByTestId('party-reroll')).toBeEnabled()
  await page.getByTestId('party-reroll').click()
  await expect(page.getByTestId('party-status')).toContainText('玩家1 1 枚')
})

test('pausing party mode freezes an active decision countdown', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await page.getByTestId('predict-low').click()
  await expect
    .poll(
      async () =>
        (await page.getByTestId('reaction-keep').isVisible()) ||
        (await page.getByTestId('party-dice-decision').isVisible())
    )
    .toBe(true)
  if (await page.getByTestId('reaction-keep').isVisible()) {
    await page.getByTestId('reaction-keep').click()
  }
  await expect(page.getByTestId('party-dice-decision')).toBeVisible()

  await page.getByRole('button', { name: '暂停本局' }).click()
  await page.waitForTimeout(5_500)
  await page.getByRole('button', { name: '继续游戏' }).click()

  await expect(page.getByTestId('party-dice-decision')).toBeVisible()
})

test('party punishment choice spends one token before existing punishment resolution', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{ position: number; hasTakenOff?: boolean }>
        board: Array<{
          position: number
          type: string
          effect?: Record<string, unknown>
        }>
      }
    }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'punishment'
      cell.effect = {
        type: 'punishment',
        value: 0,
        description: '测试静态惩罚',
        punishment: {
          tool: { name: '手掌', intensity: 1, ratio: 100 },
          bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
          position: {
            name: '站立',
            ratio: 100,
            compatibleBodyParts: ['手心'],
          },
          strikes: 5,
          description: '测试静态惩罚',
        },
      }
    }
  })

  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await page.getByTestId('predict-low').click()
  await expect
    .poll(
      async () =>
        (await page.getByTestId('reaction-keep').isVisible()) ||
        (await page.getByTestId('party-dice-decision').isVisible())
    )
    .toBe(true)
  if (await page.getByTestId('reaction-keep').isVisible()) {
    await page.getByTestId('reaction-keep').click()
  }
  await page.getByTestId('party-continue').click()

  await expect(page.getByTestId('party-punishment-choice')).toBeVisible()
  await page.getByTestId('party-choice-0').click()

  await expect(page.getByTestId('party-status')).toContainText('玩家1 1 枚')
  await expect(page.locator('.punishment-display')).toBeVisible()
})

test('party punishment intervention transfers the resolved punishment and spends the target token', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{ position: number; hasTakenOff?: boolean }>
        board: Array<{
          position: number
          type: string
          effect?: Record<string, unknown>
        }>
      }
    }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'punishment'
      cell.effect = {
        type: 'punishment',
        value: 0,
        description: '测试静态惩罚',
        punishment: {
          tool: { name: '手掌', intensity: 1, ratio: 100 },
          bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
          position: {
            name: '站立',
            ratio: 100,
            compatibleBodyParts: ['手心'],
          },
          strikes: 5,
          description: '测试静态惩罚',
        },
      }
    }
  })

  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await page.getByTestId('predict-low').click()
  await expect
    .poll(
      async () =>
        (await page.getByTestId('reaction-keep').isVisible()) ||
        (await page.getByTestId('party-dice-decision').isVisible())
    )
    .toBe(true)
  if (await page.getByTestId('reaction-keep').isVisible()) {
    await page.getByTestId('reaction-keep').click()
  }
  await page.getByTestId('party-continue').click()
  await page.getByTestId('party-choice-skip').click()

  await expect(page.getByTestId('party-intervention')).toBeVisible()
  await page.getByRole('button', { name: '转嫁', exact: true }).click()

  const punishment = page.locator('.punishment-display')
  await expect(punishment).toBeVisible()
  await expect(punishment).toContainText('受罚玩家')
  await expect(punishment).toContainText('玩家2')
  await expect(page.getByTestId('party-status')).toContainText('玩家1 1 枚')
})

test('party blindbox variant conceals punishment details until the explicit reveal', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{ position: number; hasTakenOff?: boolean }>
        board: Array<{ position: number; type: string; effect?: Record<string, unknown> }>
      }
      partyMode: { session: { value: Record<string, unknown> | null } }
    }
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('party session missing')
    debugWindow.partyMode.session.value = { ...session, act: 'finale' }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'punishment'
      cell.effect = {
        type: 'punishment',
        value: 0,
        description: '测试盲盒惩罚',
        punishment: {
          tool: { name: '手掌', intensity: 1, ratio: 100 },
          bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
          position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
          strikes: 5,
          description: '测试盲盒惩罚',
        },
      }
    }
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array) => {
        values.fill(0)
        return values
      },
    })
  })

  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await page.getByTestId('predict-low').click()
  await page.getByTestId('reaction-keep').click()
  await page.getByTestId('party-continue').click()
  if (await page.getByTestId('party-punishment-choice').isVisible()) {
    await page.getByTestId('party-choice-skip').click()
  }
  await page.getByTestId('party-intervention-skip').click()

  const punishment = page.locator('.punishment-display')
  await expect(page.getByTestId('punishment-variant')).toContainText('盲盒惩罚')
  await expect(punishment.getByText('工具:')).toBeHidden()
  await expect(punishment.getByRole('button', { name: '确认执行' })).toBeDisabled()

  await page.getByTestId('punishment-variant-reveal').click()
  await expect(punishment.getByText('工具:')).toBeVisible()
  await expect(punishment.getByRole('button', { name: '确认执行' })).toBeEnabled()
})

test('custom victory settlement persists and renders a loser gradient', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await expect(page.getByRole('heading', { name: '终局奖惩' })).toBeVisible()
  await page.getByLabel('奖惩动作').fill('完成指定挑战')
  await page.getByLabel('基础次数').fill('2')
  await page.getByLabel('单位').fill('轮')
  await page.getByLabel('启用败者惩罚梯度').check()
  await page.getByLabel('每落后一档增加').fill('1')
  await page.locator('.count-btn.plus').click()
  await page.getByTestId('start-game').click()

  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('flying-chess-victory-config') ?? '{}'))
    )
    .toMatchObject({
      actionText: '完成指定挑战',
      baseCount: 2,
      countUnit: '轮',
      loserGradientEnabled: true,
      gradientStep: 1,
    })

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { players: Array<{ position: number }> }
      finishGameWithPlayer: (playerIndex: number) => void
    }
    debugWindow.gameState.players[0].position = 40
    debugWindow.gameState.players[1].position = 20
    debugWindow.gameState.players[2].position = 5
    debugWindow.finishGameWithPlayer(0)
  })

  const settlement = page.getByTestId('victory-scorecard')
  await expect(settlement).toContainText('玩家2 · 第 2 名')
  await expect(settlement).toContainText('2 轮')
  await expect(settlement).toContainText('玩家3 · 第 3 名')
  await expect(settlement).toContainText('3 轮')
})

test('party victory renders a local-only non-sensitive highlight card', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      finishGameWithPlayer: (playerIndex: number) => void
    }
    debugWindow.finishGameWithPlayer(0)
  })

  const highlight = page.getByTestId('party-highlight-card')
  await expect(highlight).toBeVisible()
  await expect(highlight).toContainText('本地高光卡 · 不上传')
  await expect(highlight).toContainText('成功反应 0 次')
  await expect(highlight).not.toContainText('玩家1')
})

test('party time limit finishes the round and resolves tied leaders by dice', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { players: Array<{ position: number }> }
      partyMode: {
        session: {
          value: Record<string, unknown> | null
        }
      }
      completePartyTurnForPlayer: (playerIndex: number) => boolean
    }
    debugWindow.gameState.players[0].position = 12
    debugWindow.gameState.players[1].position = 12
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('party session missing')
    debugWindow.partyMode.session.value = {
      ...session,
      startedAt: performance.now() - 20 * 60_000 - 1,
    }

    const randomValues = [5, 0, 0, 0]
    let randomValueIndex = 0
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array) => {
        values[0] = randomValues[randomValueIndex] ?? 0
        randomValueIndex += 1
        return values
      },
    })

    debugWindow.completePartyTurnForPlayer(0)
    debugWindow.completePartyTurnForPlayer(1)
  })

  await expect(page.getByTestId('party-tie-break')).toBeVisible()
  await page.getByTestId('party-tie-roll').click()
  await page.getByTestId('party-tie-roll').click()

  await expect(page.getByTestId('party-tie-break')).toBeHidden()
  await expect(page.getByTestId('party-highlight-card')).toBeVisible()
})

test('party defers a natural finish reached after the time limit until round end', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        currentPlayerIndex: number
        players: Array<{ position: number }>
      }
      partyMode: {
        session: {
          value: Record<string, unknown> | null
        }
      }
      resolveNaturalVictory: (playerIndex: number) => void
    }
    debugWindow.gameState.players[0].position = 40
    debugWindow.gameState.players[1].position = 12
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('party session missing')
    debugWindow.partyMode.session.value = {
      ...session,
      startedAt: performance.now() - 20 * 60_000 - 1,
    }
    debugWindow.resolveNaturalVictory(0)
  })

  await expect(page.getByTestId('party-highlight-card')).toBeHidden()
  await expect(page.getByTestId('party-status')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              gameState: { currentPlayerIndex: number }
            }
          ).gameState.currentPlayerIndex
      )
    )
    .toBe(1)

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      completePartyTurnForPlayer: (playerIndex: number) => string
    }
    debugWindow.completePartyTurnForPlayer(1)
  })
  await expect(page.getByTestId('party-highlight-card')).toBeVisible()
})

test('party mode stays within the mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startPartyGame(page)

  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth)
})

test('tracks the anonymous completed-game lifecycle and play again in order', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.name-input').first().fill('机密玩家姓名')
  await page.locator('.start-btn').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.getByRole('button', { name: /开始游戏/ }).click()
  await completeGameForTelemetry(page)
  await page.locator('.header-actions').getByRole('button', { name: '再来一局' }).click()

  await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible()
  await expect
    .poll(async () => (await getTelemetryEvents(page)).map(event => event.name))
    .toEqual([
      'app_open',
      'setup_started',
      'game_started',
      'game_completed',
      'play_again',
      'setup_started',
    ])

  const events = await getTelemetryEvents(page)
  const serializedEvents = JSON.stringify(events)
  const eventDataKeys = events.flatMap(event => Object.keys(event.data))
  expect(serializedEvents).not.toContain('机密玩家姓名')
  expect(eventDataKeys).not.toContain('player_count')
  expect(eventDataKeys).not.toContain('turn_count')
  expect(eventDataKeys).not.toContain('duration_ms')
})

test('tracks ending a paused game as user_ended', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startDefaultGame(page)
  await page.getByRole('button', { name: '暂停本局' }).click()
  await page.getByRole('button', { name: '结束本局' }).click()

  await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible()
  await expect
    .poll(async () => (await getTelemetryEvents(page)).find(event => event.name === 'game_ended'))
    .toBeTruthy()
  expect(
    (await getTelemetryEvents(page)).find(event => event.name === 'game_ended')?.data.end_type
  ).toBe('user_ended')
})

test('tracks a successful in-game configuration import as config_import', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startDefaultGame(page)
  await page.locator('.guide-controls .export-btn').click()
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await page.locator('.json-textarea').fill(
    JSON.stringify({
      version: '1.0.0',
      exportedAt: '2026-07-28T00:00:00.000Z',
      gameTitle: '机密配置内容',
      data: {
        playerSettings: {
          playerCount: 2,
          playerNames: ['导入姓名甲', '导入姓名乙'],
        },
      },
    })
  )
  await page.locator('.import-text-btn').click()

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { gameStarted: { value: boolean } }).gameStarted.value
      )
    )
    .toBe(false)
  await expect
    .poll(
      async () =>
        (await getTelemetryEvents(page)).find(event => event.name === 'game_ended')?.data.end_type
    )
    .toBe('config_import')
  const serializedEvents = JSON.stringify(await getTelemetryEvents(page))
  expect(serializedEvents).not.toContain('导入姓名甲')
  expect(serializedEvents).not.toContain('机密配置内容')
})

test('telemetry transport failures do not block setup, play, dice, or completion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const telemetryWindow = window as typeof window & {
      __GAME_TELEMETRY_FAILURE__: 'throw'
    }
    telemetryWindow.__GAME_TELEMETRY_FAILURE__ = 'throw'
  })
  await page.locator('.start-btn').click()
  await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible()

  await page.evaluate(() => {
    const telemetryWindow = window as typeof window & {
      __GAME_TELEMETRY_FAILURE__: 'reject'
    }
    telemetryWindow.__GAME_TELEMETRY_FAILURE__ = 'reject'
  })
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.getByRole('button', { name: /开始游戏/ }).click()
  await expect(page.getByRole('button', { name: '投掷骰子' })).toBeEnabled()
  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })
  await expect(page.locator('.game-board')).toBeVisible()

  await completeGameForTelemetry(page)
  await expect(
    page.locator('.header-actions').getByRole('button', { name: '再来一局' })
  ).toBeVisible()
  expect(pageErrors).toEqual([])
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

test('mobile game board page has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/flying-chess/')

  // 1. 点击开始游戏进入设置页
  await page.locator('.start-btn').click()
  await page.waitForTimeout(100)

  // 2. 点击下一步进入惩罚配置
  await page.locator('.page-actions .btn-primary').click()
  await page.waitForTimeout(100)

  // 3. 点击下一步进入陷阱配置
  await page.locator('.page-actions .btn-primary').click()
  await page.waitForTimeout(100)

  // 4. 点击生成惩罚组合
  await page.getByRole('button', { name: /生成惩罚组合/ }).click()
  await page.waitForSelector('.confirm-actions')

  // 5. 点击开始游戏
  await page.locator('.confirm-actions .btn-primary').click()

  // 6. 等待棋盘渲染完成并稳定
  await page.waitForSelector('.game-board')
  await page.waitForTimeout(500)

  // 7. 检查是否有横向溢出
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('mobile settings return to the top when advancing a step', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await enterDefaultSettings(page)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.locator('.page-actions .btn-primary').click()

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.getByRole('heading', { name: '惩罚设置' })).toBeVisible()
})

test('mobile floating controls do not cover settings actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await enterDefaultSettings(page)
  await page.locator('.page-actions .btn-primary').click()
  await page.locator('.page-actions .btn-primary').click()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

  const overlaps = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const bounds = element.getBoundingClientRect()
      return {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
      }
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

    const primary = rect('.page-actions .btn-primary')
    const secondary = rect('.page-actions .btn-secondary')
    return {
      helpOverPrimary: intersects(rect('.guide-btn'), primary),
      settingsOverSecondary: intersects(rect('.settings-toggle'), secondary),
    }
  })

  expect(overlaps).toEqual({
    helpOverPrimary: false,
    settingsOverSecondary: false,
  })
})

test('mobile dice is an accessible touch-sized button', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)

  const diceButton = page.getByRole('button', { name: '投掷骰子' })
  await expect(diceButton).toBeVisible()
  const bounds = await diceButton.boundingBox()

  expect(bounds).not.toBeNull()
  expect(bounds?.width).toBeGreaterThanOrEqual(44)
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
})

test('mobile punishment actions stay visible without a competing pause button', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await startDefaultGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        gameStatus: string
        players: Array<{
          id: number
          name: string
          color: string
          position: number
          isWinner: boolean
          hasTakenOff: boolean
        }>
      }
      currentPunishment: { value: unknown }
      currentPunishmentTarget: { value: unknown }
      currentPunishmentExecutor: { value: unknown }
    }

    debugWindow.currentPunishment.value = {
      tool: { name: '测试工具', intensity: 3, ratio: 100 },
      bodyPart: { name: '测试部位', sensitivity: 5, ratio: 100 },
      position: {
        name: '测试姿势',
        ratio: 100,
        compatibleBodyParts: ['测试部位'],
      },
      strikes: 20,
      description: '移动端惩罚弹窗测试',
    }
    debugWindow.currentPunishmentTarget.value = debugWindow.gameState.players[1]
    debugWindow.currentPunishmentExecutor.value = debugWindow.gameState.players[0]
    debugWindow.gameState.gameStatus = 'configuring'
  })

  const actionButtons = page.locator('.punishment-actions button')
  await expect(actionButtons).toHaveCount(3)
  const viewportHeight = page.viewportSize()?.height ?? 0
  const actionBounds = await actionButtons.evaluateAll(buttons =>
    buttons.map(button => {
      const bounds = button.getBoundingClientRect()
      return { top: bounds.top, bottom: bounds.bottom }
    })
  )

  for (const bounds of actionBounds) {
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(viewportHeight)
  }
  await expect(page.getByRole('button', { name: '暂停本局' })).toBeHidden()
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

test('automatic board distribution reserves start and finish', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()
  const totalCellsInput = page.locator('.config-item', { hasText: '总格子数' }).locator('input')
  await totalCellsInput.fill('80')
  await page.getByRole('button', { name: /自动分配/ }).click()

  const boardConfig = await page.evaluate(() => {
    return (
      window as typeof window & {
        gameState: {
          boardConfig: {
            punishmentCells: number
            bonusCells: number
            reverseCells: number
            restCells: number
            restartCells: number
            trapCells: number
            totalCells: number
          }
        }
      }
    ).gameState.boardConfig
  })
  expect(boardConfig).toEqual({
    punishmentCells: 53,
    chainPunishmentCells: 5,
    bonusCells: 2,
    reverseCells: 4,
    restCells: 2,
    restartCells: 8,
    trapCells: 4,
    totalCells: 80,
  })
})

test('default board reports no unassigned effect cells', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.locator('.start-btn').click()

  await expect(page.getByText('剩余可用格子：0 格')).toBeVisible()
})

test('movement watchdog preserves a turn while a trap overlay is active', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const states = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { gameStatus: string }
      showTrapDisplay: { value: boolean }
      checkGameStateHealth: () => void
    }
    const originalNow = Date.now
    const startedAt = originalNow()

    try {
      Date.now = () => startedAt
      debugWindow.gameState.gameStatus = 'moving'
      debugWindow.showTrapDisplay.value = true
      debugWindow.checkGameStateHealth()
      Date.now = () => startedAt + 6001
      debugWindow.checkGameStateHealth()
      const withOverlay = debugWindow.gameState.gameStatus

      debugWindow.showTrapDisplay.value = false
      debugWindow.checkGameStateHealth()
      Date.now = () => startedAt + 12002
      debugWindow.checkGameStateHealth()

      return {
        withOverlay,
        afterOverlay: debugWindow.gameState.gameStatus,
      }
    } finally {
      Date.now = originalNow
    }
  })

  expect(states).toEqual({
    withOverlay: 'moving',
    afterOverlay: 'waiting',
  })
})

test('dynamic punishment resolves its target and external count before confirmation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{
          id: number
          name: string
          color: string
          position: number
          isWinner: boolean
          hasTakenOff: boolean
        }>
        board: Array<{ position: number; type: string; effect?: unknown }>
        currentPlayerIndex: number
        gameStatus: string
        diceValue: number | null
        punishmentConfig: {
          minStrikes: number
          maxStrikes: number
          step: number
          doublePunishmentChance: number
        }
      }
      gameStarted: { value: boolean }
    }
    debugWindow.gameState.players = [
      {
        id: 1,
        name: '红方',
        color: '#ef4444',
        position: 4,
        isWinner: false,
        hasTakenOff: true,
      },
      {
        id: 2,
        name: '蓝方',
        color: '#3b82f6',
        position: 12,
        isWinner: false,
        hasTakenOff: true,
      },
      {
        id: 3,
        name: '绿方',
        color: '#22c55e',
        position: 10,
        isWinner: false,
        hasTakenOff: true,
      },
    ]
    debugWindow.gameState.currentPlayerIndex = 1
    debugWindow.gameState.gameStatus = 'waiting'
    debugWindow.gameState.diceValue = null
    debugWindow.gameState.punishmentConfig.minStrikes = 5
    debugWindow.gameState.punishmentConfig.maxStrikes = 15
    debugWindow.gameState.punishmentConfig.step = 5
    debugWindow.gameState.punishmentConfig.doublePunishmentChance = 0
    debugWindow.gameStarted.value = true

    const landingCell = debugWindow.gameState.board.find(cell => cell.position === 16)
    if (!landingCell) throw new Error('缺少第16格')
    landingCell.type = 'punishment'
    landingCell.effect = {
      type: 'punishment',
      value: 0,
      description: '数量由其他玩家决定',
      punishment: {
        tool: { name: '藤条', intensity: 3, ratio: 100 },
        bodyPart: { name: '臀部', sensitivity: 4, ratio: 100 },
        position: { name: '手抓膝盖', ratio: 100, compatibleBodyParts: ['臀部'] },
        strikes: 10,
        description: '数量由其他玩家决定',
        dynamicType: 'other_player_choice',
      },
    }

    let randomCall = 0
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array) => {
        values[0] = randomCall++ % 2 === 0 ? 0 : 3
        return values
      },
    })
  })

  await page.locator('.dice-cube').click({ force: true })
  await expect(page.getByText('受罚玩家')).toBeVisible()
  await expect(page.locator('.target-name')).toHaveText('蓝方')
  await expect(page.getByLabel('惩罚次数')).toHaveValue('5')
  await page.getByLabel('惩罚次数').selectOption('15')
  await page.getByRole('button', { name: '确认执行' }).click()
  await expect(page.getByText('惩罚时间')).toBeHidden()
})

test('rest effect consumes the affected player next turn without a dice roll', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{
          id: number
          name: string
          color: string
          position: number
          isWinner: boolean
          hasTakenOff: boolean
          pendingSkippedTurns?: number
        }>
        board: Array<{ position: number; type: string; effect?: unknown }>
        currentPlayerIndex: number
        gameStatus: string
        diceValue: number | null
        pendingEffect: unknown
      }
      gameStarted: { value: boolean }
      turnCount: { value: number }
    }
    debugWindow.gameState.players = [
      {
        id: 1,
        name: '红方',
        color: '#ef4444',
        position: 7,
        isWinner: false,
        hasTakenOff: true,
      },
      {
        id: 2,
        name: '蓝方',
        color: '#3b82f6',
        position: 5,
        isWinner: false,
        hasTakenOff: true,
      },
    ]
    debugWindow.gameState.currentPlayerIndex = 0
    debugWindow.gameState.gameStatus = 'waiting'
    debugWindow.gameState.diceValue = null
    debugWindow.gameState.pendingEffect = null
    debugWindow.gameStarted.value = true
    debugWindow.turnCount.value = 1

    const restCell = debugWindow.gameState.board.find(cell => cell.position === 8)
    if (!restCell) throw new Error('缺少第8格')
    restCell.type = 'special'
    restCell.effect = {
      type: 'rest',
      value: 1,
      description: '休息一回合',
    }

    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array) => {
        values[0] = 0
        return values
      },
    })
  })

  await page.locator('.dice-cube').click({ force: true })
  await expect(page.getByText('休息一回合', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '确认', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debugWindow = window as typeof window & {
          gameState: {
            currentPlayerIndex: number
            players: Array<{ pendingSkippedTurns?: number }>
          }
        }
        return {
          currentPlayerIndex: debugWindow.gameState.currentPlayerIndex,
          pendingSkippedTurns: debugWindow.gameState.players[0].pendingSkippedTurns,
        }
      })
    )
    .toEqual({ currentPlayerIndex: 1, pendingSkippedTurns: 1 })

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        board: Array<{ position: number; type: string; effect?: unknown }>
      }
    }
    const landingCell = debugWindow.gameState.board.find(cell => cell.position === 6)
    if (!landingCell) throw new Error('缺少第6格')
    landingCell.type = 'bonus'
    delete landingCell.effect
  })

  await expect(page.locator('.dice-cube')).toHaveClass(/can-roll/)
  await page.locator('.dice-cube').click({ force: true })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debugWindow = window as typeof window & {
          gameState: {
            currentPlayerIndex: number
            players: Array<{ pendingSkippedTurns?: number }>
          }
          lastEffect: { value: string }
        }
        return {
          currentPlayerIndex: debugWindow.gameState.currentPlayerIndex,
          pendingSkippedTurns: debugWindow.gameState.players[0].pendingSkippedTurns,
          lastEffect: debugWindow.lastEffect.value,
        }
      })
    )
    .toEqual({
      currentPlayerIndex: 1,
      pendingSkippedTurns: 0,
      lastEffect: '红方休息一回合，本回合已跳过',
    })
})

test('a forced overlay can pause, resume, and end the local session safely', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{
          id: number
          name: string
          color: string
          position: number
          isWinner: boolean
          hasTakenOff: boolean
        }>
        board: Array<{ position: number; type: string; effect?: unknown }>
        currentPlayerIndex: number
        gameStatus: string
        diceValue: number | null
      }
      gameStarted: { value: boolean }
    }
    debugWindow.gameState.players = [
      {
        id: 1,
        name: '红方',
        color: '#ef4444',
        position: 7,
        isWinner: false,
        hasTakenOff: true,
      },
      {
        id: 2,
        name: '蓝方',
        color: '#3b82f6',
        position: 5,
        isWinner: false,
        hasTakenOff: true,
      },
    ]
    debugWindow.gameState.currentPlayerIndex = 0
    debugWindow.gameState.gameStatus = 'waiting'
    debugWindow.gameState.diceValue = null
    debugWindow.gameStarted.value = true

    const trapCell = debugWindow.gameState.board.find(cell => cell.position === 8)
    if (!trapCell) throw new Error('缺少第8格')
    trapCell.type = 'trap'
    trapCell.effect = {
      type: 'trap',
      value: 0,
      description: '测试机关',
    }

    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array) => {
        values[0] = 0
        return values
      },
    })
  })

  await page.locator('.dice-cube').click({ force: true })
  await expect(page.getByText('测试机关', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '暂停本局' }).click()
  await expect(page.getByRole('heading', { name: '本局已暂停' })).toBeVisible()

  const trapWhilePaused = await page.evaluate(() => {
    return (
      window as typeof window & {
        showTrapDisplay: { value: boolean }
      }
    ).showTrapDisplay.value
  })
  expect(trapWhilePaused).toBe(true)

  await page.getByRole('button', { name: '继续游戏' }).click()
  await expect(page.getByText('测试机关', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '暂停本局' }).click()
  await page.getByRole('button', { name: '结束本局' }).click()
  await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible()
  await expect(page.getByText('测试机关', { exact: true })).toBeHidden()

  const resetResolutionState = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      currentPunishmentTarget: { value: unknown }
      pendingRuleResolution: { value: unknown }
      sessionPaused: { value: boolean }
    }
    return {
      currentPunishmentTarget: debugWindow.currentPunishmentTarget.value,
      pendingRuleResolution: debugWindow.pendingRuleResolution.value,
      sessionPaused: debugWindow.sessionPaused.value,
    }
  })
  expect(resetResolutionState).toEqual({
    currentPunishmentTarget: null,
    pendingRuleResolution: null,
    sessionPaused: false,
  })
})

test('clear local game data removes every persisted game key', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const storageKeys = [
    'ludo_game_config',
    'ludo_player_settings',
    'flying-chess-config-backup',
    'flying-chess-game-mode',
    'hasShownGuide',
    'autoGuideEnabled',
  ]
  await page.evaluate(keys => {
    keys.forEach(key => localStorage.setItem(key, 'persisted'))
  }, storageKeys)

  await page.locator('.clear-cache-btn').click()

  const remainingValues = await page.evaluate(
    keys => keys.map(key => localStorage.getItem(key)),
    storageKeys
  )
  expect(remainingValues).toEqual(storageKeys.map(() => null))
  await expect(page.locator('.clear-success-toast')).toContainText('本地游戏数据已清除')
})

test('invalid import leaves existing local data unchanged', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  const existingData = {
    ludo_game_config: 'existing-config',
    ludo_player_settings: 'existing-players',
    'flying-chess-config-backup': 'existing-backup',
  }
  await page.evaluate(entries => {
    Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value))
  }, existingData)

  await page.locator('.guide-controls .export-btn').click()
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await page.locator('.json-textarea').fill(
    JSON.stringify({
      version: '1.0.0',
      data: {
        boardConfig: {
          punishmentCells: 18,
          bonusCells: 0,
          reverseCells: 0,
          restCells: 0,
          restartCells: 0,
          trapCells: 0,
          totalCells: 19,
        },
      },
    })
  )
  await page.locator('.import-text-btn').click()

  await expect(page.locator('.import-feedback--error')).toBeVisible()
  const storedData = await page.evaluate(keys => {
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]))
  }, Object.keys(existingData))
  expect(storedData).toEqual(existingData)
})

test('invalid legacy board cache does not break startup', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  const migrationPage = await page.context().newPage()
  const pageErrors: string[] = []
  migrationPage.on('pageerror', error => pageErrors.push(error.message))
  await migrationPage.addInitScript(() => {
    localStorage.setItem(
      'ludo_game_config',
      JSON.stringify({
        boardConfig: {
          punishmentCells: 30,
          bonusCells: 1,
          reverseCells: 2,
          restCells: 1,
          restartCells: 4,
          trapCells: 2,
          totalCells: 40,
        },
        savedAt: Date.now(),
      })
    )
  })

  await migrationPage.goto('/flying-chess/')
  await expect(migrationPage.locator('.start-btn')).toBeVisible()
  const boardState = await migrationPage.evaluate(() => {
    const gameState = (
      window as typeof window & {
        gameState: { boardConfig: { totalCells: number }; board: unknown[] }
      }
    ).gameState
    return {
      totalCells: gameState.boardConfig.totalCells,
      boardLength: gameState.board.length,
    }
  })

  expect(boardState).toEqual({ totalCells: 40, boardLength: 40 })
  const repairedBoardConfig = await migrationPage.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('ludo_game_config') ?? '{}') as {
      boardConfig?: unknown
    }
    return cached.boardConfig
  })
  expect(repairedBoardConfig).toEqual({
    punishmentCells: 26,
    chainPunishmentCells: 2,
    bonusCells: 1,
    reverseCells: 2,
    restCells: 1,
    restartCells: 4,
    trapCells: 2,
    totalCells: 40,
  })
  expect(pageErrors).toEqual([])
  await migrationPage.close()
})
