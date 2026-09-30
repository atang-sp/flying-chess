import { describe, expect, it } from 'vitest'
import {
  createUmamiAdapter,
  MemoryTelemetryAdapter,
  createGameTelemetry,
} from '../services/gameTelemetry'

describe('createGameTelemetry', () => {
  it('emits game_started when startGame is called', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()

    expect(adapter.events).toEqual([{ name: 'game_started', data: {} }])
  })

  it('emits game_completed when finishGame is called with completed outcome', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('completed')

    expect(adapter.events.map(e => e.name)).toEqual(['game_started', 'game_completed'])
  })

  it('does not emit game_completed for user_ended outcome', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('user_ended')

    expect(adapter.events.map(e => e.name)).toEqual(['game_started'])
  })

  it('does not emit game_completed for config_import outcome', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('config_import')

    expect(adapter.events.map(e => e.name)).toEqual(['game_started'])
  })

  it('ignores duplicate startGame calls while a game is active', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.startGame()
    telemetry.startGame()

    expect(adapter.events.map(e => e.name)).toEqual(['game_started'])
  })

  it('ignores finishGame when no game is active', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.finishGame('completed')

    expect(adapter.events).toEqual([])
  })

  it('allows a new game after the previous one finished', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('completed')
    telemetry.startGame()
    telemetry.finishGame('completed')

    expect(adapter.events.map(e => e.name)).toEqual([
      'game_started',
      'game_completed',
      'game_started',
      'game_completed',
    ])
  })

  it('allows a new game after a non-completed finish', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('user_ended')
    telemetry.startGame()
    telemetry.finishGame('completed')

    expect(adapter.events.map(e => e.name)).toEqual([
      'game_started',
      'game_started',
      'game_completed',
    ])
  })

  it('sends empty event data for all events', () => {
    const adapter = new MemoryTelemetryAdapter()
    const telemetry = createGameTelemetry({ adapter })

    telemetry.startGame()
    telemetry.finishGame('completed')

    for (const event of adapter.events) {
      expect(event.data).toEqual({})
    }
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
    })

    expect(() => telemetry.startGame()).not.toThrow()
    expect(() => telemetry.finishGame('completed')).not.toThrow()
    await Promise.resolve()

    expect(callCount).toBe(2)
  })
})

describe('createUmamiAdapter', () => {
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
          tracked.push((data as Record<string, string>).sequence)
        },
      }),
    })

    for (let sequence = 0; sequence < 25; sequence += 1) {
      adapter.track('game_started', { sequence: String(sequence) })
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

    adapter.track('game_started', {})
    failLoad()
    adapter.track('game_completed', {})
    completeLoad()

    expect(tracked).toEqual([])
  })
})
