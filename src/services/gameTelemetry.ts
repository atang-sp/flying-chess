export type GameEndOutcome = 'completed' | 'user_ended' | 'config_import'

export interface GameTelemetry {
  startGame(): void
  finishGame(outcome: GameEndOutcome): void
}

export type TelemetryEventName = 'game_started' | 'game_completed'

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

const MAX_BUFFERED_EVENTS = 20

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

export function createGameTelemetry({ adapter }: GameTelemetryOptions): GameTelemetry {
  let activeGame = false

  const track = (name: TelemetryEventName): void => {
    try {
      const result = adapter.track(name, {})
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
    startGame(): void {
      safely(() => {
        if (activeGame) return
        activeGame = true
        track('game_started')
      })
    },
    finishGame(outcome: GameEndOutcome): void {
      safely(() => {
        if (!activeGame) return
        activeGame = false
        if (outcome === 'completed') {
          track('game_completed')
        }
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
