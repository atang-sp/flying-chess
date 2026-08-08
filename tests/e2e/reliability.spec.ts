import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import packageJson from '../../package.json' with { type: 'json' }

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

type PartyPunishmentVariant = 'blindbox' | 'conditional' | 'deferred' | 'mutual' | 'encore'

async function showInjectedPartyPunishment(
  page: Page,
  variant: PartyPunishmentVariant | undefined,
  pendingMiniGameImmunity = false
) {
  await startPartyGame(page)
  await page.evaluate(
    ({ selectedVariant, pendingImmunity }) => {
      const debugWindow = window as typeof window & {
        gameState: {
          gameStatus: string
          currentPlayerIndex: number
          players: Array<{
            name: string
            color: string
            hasTakenOff?: boolean
            pendingMiniGameImmunity?: boolean
          }>
        }
        partyMode: {
          session: { value: (Record<string, unknown> & { playerCount: number }) | null }
        }
        offerPartyPunishmentInterventionOrPresent: (
          resolution: Record<string, unknown>,
          triggeringPlayer: Record<string, unknown>,
          diceValue?: number
        ) => void
      }
      const action = {
        tool: { name: '手掌', intensity: 1, ratio: 100 },
        bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
        position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
        strikes: 10,
        description: '用手掌打手心10下，姿势：站立',
      }
      const [target, executor] = debugWindow.gameState.players
      if (!target || !executor) throw new Error('party punishment test requires two players')
      target.hasTakenOff = true
      target.pendingMiniGameImmunity = pendingImmunity
      debugWindow.gameState.currentPlayerIndex = 0
      debugWindow.gameState.gameStatus = 'configuring'
      const session = debugWindow.partyMode.session.value
      if (!session) throw new Error('party session missing')
      debugWindow.partyMode.session.value = {
        ...session,
        tokensRemaining: Array.from({ length: session.playerCount }, () => 0),
      }
      debugWindow.offerPartyPunishmentInterventionOrPresent(
        {
          kind: 'punishment',
          source: 'board_punishment',
          actorIndex: 0,
          targetPlayerIndex: 0,
          executorIndex: 1,
          action,
          count: { kind: 'fixed', value: 10 },
          turnConsequence: { kind: 'none' },
          variant: selectedVariant,
        },
        target,
        1
      )
    },
    { selectedVariant: variant, pendingImmunity: pendingMiniGameImmunity }
  )

  if (variant) await expect(page.getByTestId('punishment-variant')).toBeVisible()
  await expect(page.locator('.punishment-display')).toBeVisible()
}

async function reachPartyPunishmentIntervention(page: Page) {
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
  await page.getByTestId('party-choice-skip').click()
  await expect(page.getByTestId('party-intervention')).toBeVisible()
}

async function completePartyTurnOnBonusCell(page: Page) {
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{ position: number; hasTakenOff?: boolean }>
        board: Array<{ position: number; type: string; effect?: Record<string, unknown> }>
      }
    }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'bonus'
      cell.effect = undefined
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

test('development startup does not register a missing production service worker', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  const serviceWorkerErrors: string[] = []
  page.on('console', message => {
    const text = message.text()
    if (text.includes('SW registration failed') || text.includes('unsupported MIME type')) {
      serviceWorkerErrors.push(text)
    }
  })

  await page.goto('/flying-chess/')
  await page.waitForLoadState('networkidle')

  expect(serviceWorkerErrors).toEqual([])
  await expect(page.locator('.version-text')).toHaveText(`v${packageJson.version}`)
})

test('selects and starts party mode with anonymous mode telemetry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)

  await expect
    .poll(async () => (await getTelemetryEvents(page)).map(event => event.name))
    .toEqual(['app_open', 'mode_selected', 'mode_switched', 'setup_started', 'game_started'])

  const events = await getTelemetryEvents(page)
  expect(events[1].data).toMatchObject({
    mode_id: 'party',
    ruleset_version: 'party_v3',
  })
  expect(events[2].data).toMatchObject({
    mode_id: 'party',
    previous_mode_id: 'classic',
    ruleset_version: 'party_v3',
  })
  expect(events[4].data).toMatchObject({
    mode_id: 'party',
    ruleset_version: 'party_v3',
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
    .toBe(JSON.stringify({ mode: 'party', rulesetVersion: 'party_v3' }))
})

test('Party heat meter is Party-only and reacts to the shared Momentum state', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await expect(page.getByRole('region', { name: 'Party 全局热度' })).toHaveCount(0)
  await startPartyGame(page)

  const meter = page.getByRole('region', { name: 'Party 全局热度' })
  await expect(meter).toContainText('0 / 100')
  await expect(meter.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(meter).toContainText('30')
  await expect(meter).toContainText('70')
  await expect(meter).toContainText('100')

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      partyMode: {
        recordMomentum: (event: {
          type: 'punishment_completed'
          participantPlayerIndices: number[]
          amplified: boolean
          chain: boolean
          mutual: boolean
        }) => void
      }
    }
    debugWindow.partyMode.recordMomentum({
      type: 'punishment_completed',
      participantPlayerIndices: [0],
      amplified: false,
      chain: false,
      mutual: false,
    })
  })

  await expect(meter).toContainText('5 / 100')
  await expect(meter.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5')
  await expect(meter).toContainText('当前玩家贡献 5')
})

test('native WebRTC pairs two phone controllers without cloud signalling', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')
  test.setTimeout(60_000)

  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await page.getByRole('button', { name: /多设备模式/ }).click()
  await page.getByTestId('start-game').click()

  const lobby = page.locator('.multi-device-lobby')
  await expect(lobby).toBeVisible()
  await expect(lobby).toContainText('不使用默认云端信令或外部中继')
  const controllers: Page[] = []

  for (let index = 0; index < 2; index += 1) {
    const offerField = page.getByTestId('lan-pairing-offer')
    await expect.poll(() => offerField.inputValue()).not.toBe('')
    const offer = await offerField.inputValue()

    const controllerPage = await context.newPage()
    controllers.push(controllerPage)
    await controllerPage.goto('/flying-chess/controller.html')
    await controllerPage.getByTestId('lan-pairing-offer-input').fill(offer)
    await controllerPage.getByRole('button', { name: '生成配对应答' }).click()
    const answerField = controllerPage.getByTestId('lan-pairing-answer')
    await expect.poll(() => answerField.inputValue()).not.toBe('')

    await page.getByTestId('lan-pairing-answer-input').fill(await answerField.inputValue())
    await page.getByTestId('lan-pairing-submit').click()
    await expect(
      page.getByTitle(`多设备模式 - ${index + 1}/2 已连接`),
      `controller ${index + 1} should finish its WebRTC handshake`
    ).toBeVisible({ timeout: 15_000 })
  }

  await expect(lobby).toBeHidden()
  for (const controllerPage of controllers) {
    await expect(controllerPage.locator('.controller-main')).toBeVisible()
    await expect(controllerPage.getByTitle('干预筹码')).toBeVisible()
  }
  await expect(controllers[0].getByRole('button', { name: '🎲 掷骰子' })).toBeVisible()
  await controllers[0].getByRole('button', { name: '🎲 掷骰子' }).click()
  await expect(controllers[1].getByRole('button', { name: /小 \(1-3\)/ })).toBeVisible()

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { players: Array<{ position: number }> }
      partyMode: { session: { value: Record<string, unknown> | null } }
      completePartyTurnForPlayer: (playerIndex: number) => string
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

  const firstTieAction = controllers[0].locator('.action-group').filter({ hasText: '并列决胜' })
  await expect(firstTieAction).toBeVisible()
  await firstTieAction.getByRole('button', { name: '🎲 掷骰子' }).click()
  const secondTieAction = controllers[1].locator('.action-group').filter({ hasText: '并列决胜' })
  await expect(secondTieAction).toBeVisible()
  await secondTieAction.getByRole('button', { name: '🎲 掷骰子' }).click()

  await expect(page.getByTestId('party-tie-break')).toBeHidden()
  await expect(page.getByTestId('party-highlight-card')).toBeVisible()
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
  await expect(page.getByTestId('party-status')).toContainText('玩家1 0 枚')
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

  await expect(page.getByTestId('party-status')).toContainText('玩家1 0 枚')
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
  await expect(page.getByTestId('party-status')).toContainText('玩家1 0 枚')
})

test('party punishment intervention lets the target consume immunity', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await reachPartyPunishmentIntervention(page)
  await page.getByRole('button', { name: '免疫本次惩罚' }).click()

  await expect(page.getByTestId('party-intervention')).toBeHidden()
  await expect(page.locator('.punishment-display')).toBeHidden()
  await expect(page.getByTestId('party-status')).toContainText('玩家1 0 枚')
})

test('party punishment intervention lets another player amplify the count', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await reachPartyPunishmentIntervention(page)
  const originalCount = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      pendingRuleResolution: {
        value: { count?: { kind?: string; value?: number } } | null
      }
    }
    const count = debugWindow.pendingRuleResolution.value?.count
    if (count?.kind !== 'fixed' || count.value === undefined) {
      throw new Error('expected a fixed punishment count before amplification')
    }
    return count.value
  })
  const playerTwoTokensBefore = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      partyMode: { session: { value: { tokensRemaining: readonly number[] } | null } }
    }
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('expected an active Party session before amplification')
    return session.tokensRemaining[1] ?? 0
  })
  await page.getByRole('button', { name: '加码为 2 倍' }).click()

  const punishment = page.locator('.punishment-display')
  await expect(punishment).toBeVisible()
  await expect(punishment.locator('.strikes')).toHaveText(`${originalCount * 2} 下`)
  await expect(page.getByTestId('party-status')).toContainText(
    `玩家2 ${playerTwoTokensBefore - 1} 枚`
  )
})

test('party records punishment heat only on final confirmation and ignores a duplicate click', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await reachPartyPunishmentIntervention(page)
  const heatBeforeConfirmation = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      partyMode: { session: { value: { heat: number } | null } }
    }
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('expected an active Party session before confirmation')
    return session.heat
  })
  // A correct reaction may already have contributed +2 before the punishment flow starts.
  expect([0, 2]).toContain(heatBeforeConfirmation)

  await page.getByTestId('party-intervention-skip').click()
  const punishment = page.locator('.punishment-display')
  await expect(punishment).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Party 全局热度进度' })).toHaveAttribute(
    'aria-valuenow',
    String(heatBeforeConfirmation)
  )

  await page.getByRole('button', { name: '确认执行' }).evaluate(button => {
    const confirmation = button as HTMLButtonElement
    confirmation.click()
    confirmation.click()
  })

  await expect(page.getByRole('progressbar', { name: 'Party 全局热度进度' })).toHaveAttribute(
    'aria-valuenow',
    String(heatBeforeConfirmation + 5)
  )
})

test('party mini-game immunity consumes the punishment without adding completion heat', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await showInjectedPartyPunishment(page, 'mutual', true)
  const heatBeforeConfirmation = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      partyMode: { session: { value: { heat: number } | null } }
    }
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('expected an active Party session')
    return session.heat
  })
  expect(heatBeforeConfirmation).toBe(0)

  const punishment = page.locator('.punishment-display')
  await expect(punishment.locator('.strikes')).toHaveText('0 下')
  await punishment.getByRole('button', { name: '确认执行' }).click()

  await expect(punishment).toBeHidden()
  await expect(page.getByRole('progressbar', { name: 'Party 全局热度进度' })).toHaveAttribute(
    'aria-valuenow',
    String(heatBeforeConfirmation)
  )
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

test('party conditional punishment resolves its condition through the live overlay', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await showInjectedPartyPunishment(page, 'conditional')

  const punishment = page.locator('.punishment-display')
  await expect(page.getByTestId('punishment-variant')).toContainText('条件惩罚')
  await punishment.getByPlaceholder('例如：连续猜中一次硬币正反').fill('完成测试条件')
  await punishment.getByRole('button', { name: '条件完成，次数减半' }).click()

  await expect(page.getByTestId('conditional-variant-decision')).toBeHidden()
  await expect(page.getByTestId('punishment-variant')).toContainText('条件已经判定')
  await expect(punishment.locator('.strikes')).toHaveText('5 下')
})

test('party deferred punishment returns before the target player rolls again', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await showInjectedPartyPunishment(page, 'deferred')
  const heatBeforeQueue = await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      partyMode: { session: { value: { heat: number } | null } }
    }
    const session = debugWindow.partyMode.session.value
    if (!session) throw new Error('expected an active Party session')
    return session.heat
  })
  expect(heatBeforeQueue).toBe(0)
  await page.getByTestId('defer-punishment').click()
  await expect(page.locator('.punishment-display')).toBeHidden()
  await expect(page.getByRole('progressbar', { name: 'Party 全局热度进度' })).toHaveAttribute(
    'aria-valuenow',
    String(heatBeforeQueue)
  )

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: { currentPlayerIndex: number; gameStatus: string }
    }
    debugWindow.gameState.currentPlayerIndex = 0
    debugWindow.gameState.gameStatus = 'waiting'
  })
  await page.getByRole('button', { name: '投掷骰子' }).click({ force: true })

  await expect(page.getByTestId('punishment-variant')).toContainText('延迟惩罚')
  await expect(page.getByTestId('punishment-variant')).toContainText('已到约定回合')
  await expect(page.getByTestId('defer-punishment')).toBeHidden()
  await expect(
    page.locator('.punishment-display').getByRole('button', { name: '确认执行' })
  ).toBeEnabled()
  await page.locator('.punishment-display').getByRole('button', { name: '确认执行' }).click()
  await expect(page.getByRole('progressbar', { name: 'Party 全局热度进度' })).toHaveAttribute(
    'aria-valuenow',
    String(heatBeforeQueue + 5)
  )
})

test('party mutual and encore punishments complete their required second phases', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await showInjectedPartyPunishment(page, 'mutual')
  const punishment = page.locator('.punishment-display')
  await punishment.getByRole('button', { name: '确认执行' }).click()
  await expect(page.getByTestId('punishment-variant')).toContainText('交换角色')
  await expect(punishment).toContainText('玩家2')
  await punishment.getByRole('button', { name: '确认第二次执行' }).click()
  await expect(punishment).toBeHidden()

  await showInjectedPartyPunishment(page, 'encore')
  await punishment.getByRole('button', { name: '确认执行' }).click()
  await expect(page.getByTestId('punishment-variant')).toContainText('返场阶段')
  await expect(punishment.locator('.strikes')).toHaveText('5 下')
  await punishment.getByRole('button', { name: '确认执行' }).click()
  await expect(punishment).toBeHidden()
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

test('party event deck triggers a real vote after its configured turn boundary', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-party-event-deck',
      JSON.stringify([
        {
          id: 'e2e-turn-vote',
          title: '端到端命运投票',
          description: '每回合结束后触发一次投票。',
          tags: ['测试', '投票'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'vote', prompt: '是否继续？', options: ['继续', '加码'] },
        },
      ])
    )
  })
  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        players: Array<{ position: number; hasTakenOff?: boolean }>
        board: Array<{ position: number; type: string; effect?: Record<string, unknown> }>
      }
    }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'bonus'
      cell.effect = undefined
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

  const eventCard = page.getByTestId('party-event-card')
  await expect(eventCard).toContainText('端到端命运投票')
  for (const playerName of ['玩家1', '玩家2']) {
    await expect(eventCard).toContainText(`${playerName} 请投票`)
    await eventCard.getByRole('button', { name: '继续' }).click()
  }
  await expect(page.getByText('继续 2 票')).toBeVisible()
  await eventCard.getByRole('button', { name: '确认投票结果' }).click()
  await expect(eventCard).toBeHidden()
})

test('party event deck runs secret rock-paper-scissors and resolves its winner', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-party-event-deck',
      JSON.stringify([
        {
          id: 'e2e-turn-rps',
          title: '端到端全员猜拳',
          description: '每回合结束后触发一次猜拳。',
          tags: ['测试', '猜拳'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'rock_paper_scissors' },
        },
      ])
    )
  })
  await startPartyGame(page)
  await completePartyTurnOnBonusCell(page)

  const eventCard = page.getByTestId('party-event-card')
  await expect(eventCard).toContainText('端到端全员猜拳')
  await expect(eventCard).toContainText('玩家1 请出拳')
  await eventCard.getByRole('button', { name: '石头' }).click()
  await expect(eventCard).toContainText('玩家2 请出拳')
  await eventCard.getByRole('button', { name: '剪刀' }).click()
  await expect(eventCard).toContainText('石头获胜：玩家1')
  await eventCard.getByRole('button', { name: '确认猜拳结果' }).click()
  await expect(eventCard).toBeHidden()
})

test('party event deck binds two selected players through the live overlay', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-party-event-deck',
      JSON.stringify([
        {
          id: 'e2e-turn-binding',
          title: '端到端命运绑定',
          description: '每回合结束后选择两名绑定玩家。',
          tags: ['测试', '绑定'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'bind_players', durationTurns: 3 },
        },
      ])
    )
  })
  await startPartyGame(page)
  await completePartyTurnOnBonusCell(page)

  const eventCard = page.getByTestId('party-event-card')
  await expect(eventCard).toContainText('端到端命运绑定')
  await expect(eventCard.getByRole('button', { name: '确认绑定' })).toBeEnabled()
  await eventCard.getByRole('button', { name: '确认绑定' }).click()
  await expect(eventCard).toBeHidden()
})

test('party memory mini-game completes a revealed sequence without applying a penalty', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-party-event-deck',
      JSON.stringify([
        {
          id: 'e2e-turn-memory',
          title: '端到端记忆翻牌',
          description: '每回合结束后触发记忆挑战。',
          tags: ['测试', '记忆'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'mini_game', game: 'memory' },
        },
      ])
    )
  })
  await startPartyGame(page)
  await completePartyTurnOnBonusCell(page)
  const eventCard = page.getByTestId('party-event-card')
  await expect(eventCard).toBeVisible()
  const actorIndex = await page.evaluate(() => {
    return (window as typeof window & { gameState: { currentPlayerIndex: number } }).gameState
      .currentPlayerIndex
  })
  await eventCard.getByRole('button', { name: '开始小游戏' }).click()

  const miniGame = page.getByTestId('party-mini-game')
  await expect(miniGame).toContainText('记忆翻牌')
  const sequence = await miniGame.locator('.memory-sequence span').allTextContents()
  expect(sequence).toHaveLength(3)
  await expect(miniGame.locator('.memory-options')).toBeVisible({ timeout: 3000 })
  for (const symbol of sequence) {
    await miniGame.getByRole('button', { name: symbol, exact: true }).click()
  }

  await expect(miniGame).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(index => {
        const debugWindow = window as typeof window & {
          gameState: { players: Array<{ pendingMiniGameMultiplier?: number }> }
        }
        return debugWindow.gameState.players[index].pendingMiniGameMultiplier
      }, actorIndex)
    )
    .toBeUndefined()
})

test('party quick quiz failure applies the next-punishment multiplier', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-party-event-deck',
      JSON.stringify([
        {
          id: 'e2e-turn-quiz',
          title: '端到端快速问答',
          description: '每回合结束后触发快速问答。',
          tags: ['测试', '问答'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'mini_game', game: 'quick_quiz' },
        },
      ])
    )
  })
  await startPartyGame(page)
  await completePartyTurnOnBonusCell(page)
  const eventCard = page.getByTestId('party-event-card')
  await expect(eventCard).toBeVisible()
  const actorIndex = await page.evaluate(() => {
    return (window as typeof window & { gameState: { currentPlayerIndex: number } }).gameState
      .currentPlayerIndex
  })
  await eventCard.getByRole('button', { name: '开始小游戏' }).click()

  const miniGame = page.getByTestId('party-mini-game')
  await expect(miniGame).toContainText('快速问答')
  await miniGame.getByRole('button', { name: '放弃 / 判定失败' }).click()

  await expect(miniGame).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(index => {
        const debugWindow = window as typeof window & {
          gameState: { players: Array<{ pendingMiniGameMultiplier?: number }> }
        }
        return debugWindow.gameState.players[index].pendingMiniGameMultiplier
      }, actorIndex)
    )
    .toBe(2)
})

test('mini-game trap runs reaction interaction and grants the winner one immunity', async ({
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
    }
    debugWindow.gameState.players[0].position = 1
    debugWindow.gameState.players[0].hasTakenOff = true
    for (const cell of debugWindow.gameState.board) {
      if (cell.position < 2 || cell.position > 7) continue
      cell.type = 'trap'
      cell.effect = {
        type: 'trap',
        value: 0,
        description: '端到端反应测试',
        trapVariant: 'mini_game_reaction',
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

  const miniGame = page.getByTestId('party-mini-game')
  await expect(miniGame).toContainText('反应速度测试')
  await miniGame.getByRole('button', { name: '全员准备好了' }).click()
  const playerOneButton = miniGame.getByRole('button', { name: '玩家1 抢按' })
  await expect(playerOneButton).toBeEnabled({ timeout: 3000 })
  await playerOneButton.click()
  await expect(miniGame).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debugWindow = window as typeof window & {
          gameState: { players: Array<{ pendingMiniGameImmunity?: boolean }> }
        }
        return debugWindow.gameState.players[0].pendingMiniGameImmunity
      })
    )
    .toBe(true)
})

test('community catalog one-click load and Party Studio custom theme stay opt-in', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await expect(page.getByRole('heading', { name: '终局奖惩' })).toBeHidden()
  await page.getByTestId('mode-party').click()

  await page.getByText('社区配置市场').click()
  await expect(page.getByText('破冰加量包', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '一键加载' }).first().click()
  await expect(page.getByText(/已加载“破冰加量包”/)).toBeVisible()
  await page.getByText('事件卡 / 命运轮盘').click()
  await expect(page.getByText('第一印象', { exact: true })).toBeVisible()

  await page.getByText('Party Studio 场景编辑器').click()
  await page.getByLabel('本局使用自定义场景').check()
  await page.getByLabel('主题强调色').fill('#ff0000')
  await page.getByTestId('start-game').click()
  await expect(page.locator('.app')).toHaveClass(/app--party-studio/)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debugWindow = window as typeof window & {
          partyMode: { session: { value: { directorConfig?: { actCount: number } } | null } }
        }
        return debugWindow.partyMode.session.value?.directorConfig?.actCount
      })
    )
    .toBe(3)
})

test('local progress panel renders achievements and shame wall without network identity', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.addInitScript(() => {
    localStorage.setItem(
      'flying-chess-local-progress-v1',
      JSON.stringify({
        version: 1,
        totals: {
          completedGames: 2,
          punishmentCount: 42,
          mercyRequests: 1,
          longestChain: 3,
          variantCompletions: { blindbox: 1 },
        },
        players: {
          小红: { playerName: '小红', punishmentCount: 42, mercyRequests: 1 },
        },
      })
    )
  })
  await page.goto('/flying-chess/')
  await page.getByText('进度、成就与本地耻辱墙').click()
  const panel = page.locator('.progress-panel')
  await expect(panel).toContainText('42')
  await expect(panel).toContainText('累计耐受')
  await expect(panel).toContainText('小红')
  await expect(panel).toContainText('这些记录仅保存在当前设备')
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

test('party play again preserves the selected scene configuration', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.getByTestId('mode-party').click()
  await page.getByRole('button', { name: /初见破冰/ }).click()
  await page.getByTestId('start-game').click()
  await expect(page.locator('[data-kind="qa"]')).toHaveCount(8)

  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      finishGameWithPlayer: (playerIndex: number) => void
    }
    debugWindow.finishGameWithPlayer(0)
  })
  await page.locator('.play-again-button').click()

  await expect(page.getByTestId('party-status')).toBeVisible()
  await expect(page.locator('[data-kind="qa"]')).toHaveCount(8)
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

test('party defers a natural finish after heat reaches 100 until every seat completes the round', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
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
      heat: 100,
      heatContributionByPlayer: [100, 0],
      heatLimitPending: true,
    }
    debugWindow.resolveNaturalVictory(0)
  })

  await expect(page.getByTestId('party-highlight-card')).toBeHidden()
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

test('in-game configuration import ends the old party session before applying a new roster', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await startPartyGame(page)
  await page.locator('.guide-controls .export-btn').click()
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await page.locator('.json-textarea').fill(
    JSON.stringify({
      version: '1.0.0',
      exportedAt: '2026-08-07T00:00:00.000Z',
      gameTitle: '飞行棋配置',
      data: {
        playerSettings: {
          playerCount: 3,
          playerNames: ['甲', '乙', '丙'],
        },
      },
    })
  )
  await page.locator('.import-text-btn').click()

  await expect(page.getByTestId('mode-party')).toBeVisible()
  await expect(page.getByTestId('party-status')).toBeHidden()

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('mode-party').click()
  await page.getByTestId('start-game').click()

  await expect(page.getByLabel('丙剩余1枚干预筹码')).toBeVisible()
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

test('auto guide setting toggles once and persists the selected value', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.getByTitle('引导设置').click()
  const autoGuide = page.getByRole('checkbox', { name: '自动显示引导' })
  await expect(autoGuide).not.toBeChecked()

  await autoGuide.click()

  await expect(autoGuide).toBeChecked()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('autoGuideEnabled')))
    .toBe('true')
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

test('升温局开局前拒绝暖场阶段无法生成的惩罚配置', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome')

  await page.goto('/flying-chess/')
  await page.evaluate(() => {
    const debugWindow = window as typeof window & {
      gameState: {
        punishmentConfig: {
          tools: Record<string, { intensity: number; ratio: number }>
          bodyParts: Record<string, { sensitivity: number; ratio: number }>
          positions: Record<string, { ratio: number; compatibleBodyParts: string[] }>
        }
      }
    }
    Object.values(debugWindow.gameState.punishmentConfig.tools).forEach(tool => {
      tool.intensity = 8
      tool.ratio = 100
    })
    Object.values(debugWindow.gameState.punishmentConfig.bodyParts).forEach(bodyPart => {
      bodyPart.sensitivity = 8
      bodyPart.ratio = 100
    })
    Object.values(debugWindow.gameState.punishmentConfig.positions).forEach(position => {
      position.ratio = 100
      position.compatibleBodyParts = []
    })
  })

  await page.getByTestId('mode-party').click()
  await page.getByTestId('start-game').click()

  await expect(page.getByRole('dialog', { name: '升温局配置无效' })).toBeVisible()
  await expect(page.locator('.game-board')).toBeHidden()
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
      activeMode: { value: 'classic' | 'party' | null }
      partyEventQueue: { value: unknown[] }
      checkGameStateHealth: () => void
    }
    const originalNow = Date.now
    const startedAt = originalNow()

    try {
      Date.now = () => startedAt
      debugWindow.activeMode.value = 'party'
      debugWindow.partyEventQueue.value.push({ id: 'preserved-event' })
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
        activeMode: debugWindow.activeMode.value,
        queuedEvents: debugWindow.partyEventQueue.value.length,
      }
    } finally {
      Date.now = originalNow
    }
  })

  expect(states).toEqual({
    withOverlay: 'moving',
    afterOverlay: 'waiting',
    activeMode: 'party',
    queuedEvents: 1,
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
  test.setTimeout(45_000)

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
  await expect(page.getByText('休息一回合', { exact: true }).first()).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: '确认', exact: true }).click()
  await expect
    .poll(
      () =>
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
        }),
      { timeout: 10_000 }
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

  await expect(page.locator('.dice-cube')).toHaveClass(/can-roll/, { timeout: 10_000 })
  await page.locator('.dice-cube').click({ force: true })
  await expect
    .poll(
      () =>
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
        }),
      { timeout: 10_000 }
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
