import { describe, expect, it } from 'vitest'
import {
  createGameTelemetry,
  createUmamiAdapter,
  MemoryTelemetryAdapter,
  type TelemetryEvent,
} from '../services/gameTelemetry'

describe('gameTelemetry', () => {
  it('emits app_open once with only the common anonymous fields', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({
      adapter,
      getViewportWidth: () => 768,
    })

    telemetry.openApp()
    telemetry.openApp()

    expect(adapter.events).toEqual<TelemetryEvent[]>([
      {
        name: 'app_open',
        data: {
          app_version: '1.8.0',
          mode_id: 'classic',
          ruleset_version: 'classic_v1',
          device_type: 'mobile',
        },
      },
    ])
  })

  it('tracks a real mode selection and switch with only categorical mode fields', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({
      adapter,
      getViewportWidth: () => 1280,
    })

    telemetry.setMode('party')
    telemetry.selectMode('classic')

    expect(adapter.events).toEqual([
      {
        name: 'mode_selected',
        data: {
          app_version: '1.8.0',
          mode_id: 'classic',
          ruleset_version: 'classic_v1',
          device_type: 'desktop',
        },
      },
      {
        name: 'mode_switched',
        data: {
          app_version: '1.8.0',
          mode_id: 'classic',
          ruleset_version: 'classic_v1',
          device_type: 'desktop',
          previous_mode_id: 'party',
        },
      },
    ])
  })

  it.each([
    [1, '1'],
    [2, '2'],
    [3, '3_4'],
    [4, '3_4'],
    [5, '5_plus'],
    [12, '5_plus'],
  ])('buckets setup player count %i as %s without sending the raw count', (playerCount, bucket) => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({
      adapter,
      getViewportWidth: () => 769,
    })

    telemetry.startSetup(playerCount)

    expect(adapter.events).toEqual([
      {
        name: 'setup_started',
        data: {
          app_version: '1.8.0',
          mode_id: 'classic',
          ruleset_version: 'classic_v1',
          device_type: 'desktop',
          player_count_bucket: bucket,
        },
      },
    ])
    expect(adapter.events[0].data).not.toHaveProperty('player_count')
  })

  it('records setup before one game start and suppresses duplicate starts', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter, getViewportWidth: () => 1280 })

    telemetry.startSetup(4)
    telemetry.startGame(4)
    telemetry.startGame(4)

    expect(adapter.events.map(event => event.name)).toEqual(['setup_started', 'game_started'])
    expect(adapter.events[1].data).toMatchObject({
      player_count_bucket: '3_4',
    })
  })

  it.each([
    [0, 1, 'lt_10m', '1_10'],
    [599_999, 10, 'lt_10m', '1_10'],
    [600_000, 11, '10_20m', '11_20'],
    [1_199_999, 20, '10_20m', '11_20'],
    [1_200_000, 21, '20_40m', '21_40'],
    [2_399_999, 40, '20_40m', '21_40'],
    [2_400_000, 41, '40m_plus', '41_plus'],
  ])(
    'buckets a completed game at %i ms and %i turns as %s / %s',
    (elapsedMs, turns, durationBucket, turnBucket) => {
      const adapter = new MemoryTelemetryAdapter()
      let currentTime = 0
      const telemetry = createGameTelemetry({
        adapter,
        now: () => currentTime,
        getViewportWidth: () => 1280,
      })

      telemetry.startGame(2)
      currentTime = elapsedMs
      telemetry.finishGame('completed', turns)

      expect(adapter.events[1]).toEqual({
        name: 'game_completed',
        data: {
          app_version: '1.8.0',
          mode_id: 'classic',
          ruleset_version: 'classic_v1',
          device_type: 'desktop',
          player_count_bucket: '2',
          duration_bucket: durationBucket,
          turn_count_bucket: turnBucket,
          end_type: 'completed',
        },
      })
      expect(adapter.events[1].data).not.toHaveProperty('duration_ms')
      expect(adapter.events[1].data).not.toHaveProperty('turn_count')
    }
  )

  it.each(['user_ended', 'config_import'] as const)('records %s as game_ended once', outcome => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({
      adapter,
      now: () => 60_000,
      getViewportWidth: () => 1280,
    })

    telemetry.startGame(3)
    telemetry.finishGame(outcome, 8)
    telemetry.finishGame('completed', 99)

    expect(adapter.events.map(event => event.name)).toEqual(['game_started', 'game_ended'])
    expect(adapter.events[1].data.end_type).toBe(outcome)
  })

  it('reuses the completed-game summary for play_again and emits it only once', () => {
    const adapter = new MemoryTelemetryAdapter()
    let currentTime = 100
    const telemetry = createGameTelemetry({
      adapter,
      now: () => currentTime,
      getViewportWidth: () => 390,
    })

    telemetry.playAgain()
    telemetry.startGame(3)
    currentTime += 1_300_000
    telemetry.finishGame('completed', 22)
    telemetry.playAgain()
    telemetry.playAgain()

    expect(adapter.events.map(event => event.name)).toEqual([
      'game_started',
      'game_completed',
      'play_again',
    ])
    expect(adapter.events[2]).toEqual({
      name: 'play_again',
      data: {
        app_version: '1.8.0',
        mode_id: 'classic',
        ruleset_version: 'classic_v1',
        device_type: 'mobile',
        player_count_bucket: '3_4',
        duration_bucket: '20_40m',
        turn_count_bucket: '21_40',
        end_type: 'completed',
      },
    })
  })

  it('swallows both synchronous throws and asynchronous rejections from the adapter', async () => {
    let callCount = 0
    const telemetry = createGameTelemetry({
      adapter: {
        track: () => {
          callCount += 1
          if (callCount === 1) throw new Error('sync transport failure')
          return Promise.reject(new Error('async transport failure'))
        },
      },
      getViewportWidth: () => 1280,
    })

    expect(() => telemetry.openApp()).not.toThrow()
    expect(() => telemetry.startSetup(2)).not.toThrow()
    await Promise.resolve()

    expect(callCount).toBe(2)
  })

  it('keeps every public method non-throwing when clock or viewport access fails', () => {
    let clockReads = 0
    const telemetry = createGameTelemetry({
      adapter: new MemoryTelemetryAdapter(),
      now: () => {
        clockReads += 1
        if (clockReads > 1) throw new Error('clock unavailable')
        return 0
      },
      getViewportWidth: () => {
        throw new Error('viewport unavailable')
      },
    })

    expect(() => telemetry.openApp()).not.toThrow()
    expect(() => telemetry.startSetup(2)).not.toThrow()
    expect(() => telemetry.startGame(2)).not.toThrow()
    expect(() => telemetry.finishGame('completed', 1)).not.toThrow()
    expect(() => telemetry.playAgain()).not.toThrow()
  })

  it('buffers at most 20 events until the Umami script loads and then flushes in order', () => {
    const tracked: string[] = []
    let completeLoad: () => void = () => undefined
    const adapter = createUmamiAdapter({
      websiteId: '123e4567-e89b-12d3-a456-426614174000',
      scriptUrl: 'https://cloud.umami.is/script.js',
      loadScript: options => {
        expect(options.attributes).toEqual({
          'data-website-id': '123e4567-e89b-12d3-a456-426614174000',
          'data-domains': 'atang-sp.github.io',
          'data-do-not-track': 'true',
          'data-exclude-search': 'true',
          'data-exclude-hash': 'true',
          'data-performance': 'false',
        })
        completeLoad = options.onLoad
      },
      getTracker: () => ({
        track: (_name, data) => {
          tracked.push(data.sequence)
        },
      }),
    })

    for (let sequence = 0; sequence < 25; sequence += 1) {
      adapter.track('app_open', { sequence: String(sequence) })
    }
    completeLoad()

    expect(tracked).toEqual(Array.from({ length: 20 }, (_, index) => String(index)))
  })

  it('drops queued and future events after the Umami script fails to load', () => {
    const tracked: string[] = []
    let failLoad: () => void = () => undefined
    let completeLoad: () => void = () => undefined
    const adapter = createUmamiAdapter({
      websiteId: '123e4567-e89b-12d3-a456-426614174000',
      scriptUrl: 'https://cloud.umami.is/script.js',
      loadScript: options => {
        failLoad = options.onError
        completeLoad = options.onLoad
      },
      getTracker: () => ({
        track: name => {
          tracked.push(name)
        },
      }),
    })

    adapter.track('app_open', {})
    failLoad()
    adapter.track('setup_started', {})
    completeLoad()

    expect(tracked).toEqual([])
  })
})
