import { DEFAULT_GAME_MODE, RULESET_VERSION_BY_MODE, type GameMode } from '../config/modes'

export type GameEndOutcome = 'completed' | 'user_ended' | 'config_import'

export interface GameTelemetry {
  setMode(mode: GameMode): void
  selectMode(mode: GameMode): void
  openApp(): void
  startSetup(playerCount: number): void
  startGame(playerCount: number): void
  finishGame(outcome: GameEndOutcome, turnCount: number): void
  playAgain(): void
}

export type TelemetryEventName =
  | 'app_open'
  | 'setup_started'
  | 'game_started'
  | 'game_completed'
  | 'game_ended'
  | 'play_again'
  | 'mode_selected'
  | 'mode_switched'

type DeviceType = 'mobile' | 'desktop'

export type TelemetryEventData = Readonly<Record<string, string>>

export interface TelemetryEvent {
  readonly name: TelemetryEventName
  readonly data: TelemetryEventData
}

export interface TelemetryAdapter {
  track(name: TelemetryEventName, data: TelemetryEventData): void | Promise<void>
}

declare global {
  interface Window {
    __GAME_TELEMETRY_TEST_ADAPTER__?: TelemetryAdapter
  }
}

interface GameTelemetryOptions {
  readonly adapter: TelemetryAdapter
  readonly now?: () => number
  readonly getViewportWidth?: () => number
}

interface UmamiTracker {
  track(name: TelemetryEventName, data: TelemetryEventData): void | Promise<void>
}

export interface UmamiScriptLoadOptions {
  readonly src: string
  readonly attributes: Readonly<Record<string, string>>
  readonly onLoad: () => void
  readonly onError: () => void
}

interface UmamiAdapterOptions {
  readonly websiteId: string
  readonly scriptUrl: string
  readonly domain?: string
  readonly loadScript?: (options: UmamiScriptLoadOptions) => void
  readonly getTracker?: () => UmamiTracker | undefined
}

const APP_VERSION = '1.8.0'
const MAX_BUFFERED_EVENTS = 20
const COMMON_FIELDS = ['app_version', 'mode_id', 'ruleset_version', 'device_type'] as const
const EVENT_FIELDS: Record<TelemetryEventName, readonly string[]> = {
  app_open: COMMON_FIELDS,
  mode_selected: COMMON_FIELDS,
  mode_switched: [...COMMON_FIELDS, 'previous_mode_id'],
  setup_started: [...COMMON_FIELDS, 'player_count_bucket'],
  game_started: [...COMMON_FIELDS, 'player_count_bucket'],
  game_completed: [
    ...COMMON_FIELDS,
    'player_count_bucket',
    'duration_bucket',
    'turn_count_bucket',
    'end_type',
  ],
  game_ended: [
    ...COMMON_FIELDS,
    'player_count_bucket',
    'duration_bucket',
    'turn_count_bucket',
    'end_type',
  ],
  play_again: [
    ...COMMON_FIELDS,
    'player_count_bucket',
    'duration_bucket',
    'turn_count_bucket',
    'end_type',
  ],
}

function bucketPlayerCount(playerCount: number): string {
  if (playerCount <= 1) return '1'
  if (playerCount === 2) return '2'
  if (playerCount <= 4) return '3_4'
  return '5_plus'
}

function bucketDuration(elapsedMs: number): string {
  if (elapsedMs < 10 * 60_000) return 'lt_10m'
  if (elapsedMs < 20 * 60_000) return '10_20m'
  if (elapsedMs < 40 * 60_000) return '20_40m'
  return '40m_plus'
}

function bucketTurnCount(turnCount: number): string {
  if (turnCount <= 10) return '1_10'
  if (turnCount <= 20) return '11_20'
  if (turnCount <= 40) return '21_40'
  return '41_plus'
}

function sanitizeEventData(
  name: TelemetryEventName,
  candidate: Record<string, unknown>
): TelemetryEventData {
  return Object.fromEntries(
    EVENT_FIELDS[name]
      .filter(key => typeof candidate[key] === 'string')
      .map(key => [key, candidate[key] as string])
  )
}

function loadBrowserScript(options: UmamiScriptLoadOptions): void {
  const script = document.createElement('script')
  script.src = options.src
  script.defer = true
  Object.entries(options.attributes).forEach(([name, value]) => script.setAttribute(name, value))
  script.addEventListener('load', options.onLoad, { once: true })
  script.addEventListener('error', options.onError, { once: true })
  document.head.appendChild(script)
}

export function createUmamiAdapter({
  websiteId,
  scriptUrl,
  domain = 'atang-sp.github.io',
  loadScript = loadBrowserScript,
  getTracker = () => (window as typeof window & { umami?: UmamiTracker }).umami,
}: UmamiAdapterOptions): TelemetryAdapter {
  const queuedEvents: TelemetryEvent[] = []
  let state: 'loading' | 'ready' | 'failed' = 'loading'
  let tracker: UmamiTracker | undefined

  const discardQueue = (): void => {
    queuedEvents.splice(0, queuedEvents.length)
  }

  const dispatch = (event: TelemetryEvent): void => {
    if (!tracker) return
    try {
      const result = tracker.track(event.name, event.data)
      void Promise.resolve(result).catch(() => undefined)
    } catch {
      // Transport failures are intentionally ignored.
    }
  }

  const fail = (): void => {
    if (state !== 'loading') return
    state = 'failed'
    tracker = undefined
    discardQueue()
  }

  try {
    loadScript({
      src: scriptUrl,
      attributes: {
        'data-website-id': websiteId,
        'data-domains': domain,
        'data-do-not-track': 'true',
        'data-exclude-search': 'true',
        'data-exclude-hash': 'true',
        'data-performance': 'false',
      },
      onLoad: () => {
        if (state !== 'loading') return
        try {
          tracker = getTracker()
        } catch {
          fail()
          return
        }
        if (!tracker) {
          fail()
          return
        }
        state = 'ready'
        queuedEvents.splice(0, queuedEvents.length).forEach(dispatch)
      },
      onError: fail,
    })
  } catch {
    fail()
  }

  return {
    track(name: TelemetryEventName, data: TelemetryEventData): void {
      if (state === 'failed') return
      const event = { name, data }
      if (state === 'ready') {
        dispatch(event)
        return
      }
      if (queuedEvents.length < MAX_BUFFERED_EVENTS) {
        queuedEvents.push(event)
      }
    },
  }
}

export class MemoryTelemetryAdapter implements TelemetryAdapter {
  readonly events: TelemetryEvent[] = []

  track(name: TelemetryEventName, data: TelemetryEventData): void {
    this.events.push({ name, data })
  }
}

export function createGameTelemetry({
  adapter,
  now = () => performance.now(),
  getViewportWidth = () => window.innerWidth,
}: GameTelemetryOptions): GameTelemetry {
  let appOpened = false
  let currentMode: GameMode = DEFAULT_GAME_MODE
  let activeGame: { readonly playerCount: number; readonly startedAt: number } | undefined
  let lastCompletedGame: Record<string, string> | undefined

  const getDeviceType = (): DeviceType => (getViewportWidth() <= 768 ? 'mobile' : 'desktop')

  const commonData = (): Record<string, unknown> => ({
    app_version: APP_VERSION,
    mode_id: currentMode,
    ruleset_version: RULESET_VERSION_BY_MODE[currentMode],
    device_type: getDeviceType(),
  })

  const track = (name: TelemetryEventName, candidate: Record<string, unknown>): void => {
    try {
      const data = sanitizeEventData(name, candidate)
      const result = adapter.track(name, data)
      void Promise.resolve(result).catch(() => undefined)
    } catch {
      // Telemetry must never interrupt game play.
    }
  }

  const safely = (action: () => void): void => {
    try {
      action()
    } catch {
      // All telemetry failures are fail-open for the game.
    }
  }

  return {
    setMode(mode: GameMode): void {
      safely(() => {
        currentMode = mode
      })
    },
    selectMode(mode: GameMode): void {
      safely(() => {
        const previousMode = currentMode
        currentMode = mode
        track('mode_selected', commonData())
        if (previousMode !== mode) {
          track('mode_switched', {
            ...commonData(),
            previous_mode_id: previousMode,
          })
        }
      })
    },
    openApp(): void {
      safely(() => {
        if (appOpened) return
        appOpened = true
        track('app_open', commonData())
      })
    },
    startSetup(playerCount: number): void {
      safely(() => {
        track('setup_started', {
          ...commonData(),
          player_count_bucket: bucketPlayerCount(playerCount),
        })
      })
    },
    startGame(playerCount: number): void {
      safely(() => {
        if (activeGame) return
        lastCompletedGame = undefined
        activeGame = { playerCount, startedAt: now() }
        track('game_started', {
          ...commonData(),
          player_count_bucket: bucketPlayerCount(playerCount),
        })
      })
    },
    finishGame(outcome: GameEndOutcome, turnCount: number): void {
      safely(() => {
        if (!activeGame) return

        const summary = {
          player_count_bucket: bucketPlayerCount(activeGame.playerCount),
          duration_bucket: bucketDuration(Math.max(0, now() - activeGame.startedAt)),
          turn_count_bucket: bucketTurnCount(turnCount),
          end_type: outcome,
        }
        activeGame = undefined
        lastCompletedGame = outcome === 'completed' ? summary : undefined

        track(outcome === 'completed' ? 'game_completed' : 'game_ended', {
          ...commonData(),
          ...summary,
        })
      })
    },
    playAgain(): void {
      safely(() => {
        if (!lastCompletedGame) return
        const summary = lastCompletedGame
        lastCompletedGame = undefined
        track('play_again', {
          ...commonData(),
          ...summary,
        })
      })
    },
  }
}

const disabledAdapter: TelemetryAdapter = {
  track: () => undefined,
}

function createDefaultAdapter(): TelemetryAdapter {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.__GAME_TELEMETRY_TEST_ADAPTER__ ?? disabledAdapter
  }
  if (!import.meta.env.PROD) return disabledAdapter

  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim()
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL?.trim()
  if (!websiteId || !scriptUrl) return disabledAdapter

  return createUmamiAdapter({ websiteId, scriptUrl })
}

export const gameTelemetry: GameTelemetry = createGameTelemetry({
  adapter: createDefaultAdapter(),
})
