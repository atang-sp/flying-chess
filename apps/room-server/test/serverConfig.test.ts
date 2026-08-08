import { describe, expect, it } from 'vitest'
import { readRoomServerEnvironment } from '../src/serverConfig'

describe('room server environment', () => {
  it('uses bounded development defaults and accepts explicit release metadata', () => {
    expect(readRoomServerEnvironment({})).toEqual({
      version: 'dev',
      buildSha: 'unknown',
      drainTimeoutMs: 30 * 60 * 1_000,
    })
    expect(
      readRoomServerEnvironment({
        ROOM_SERVER_VERSION: '1.15.0',
        ROOM_SERVER_BUILD_SHA: 'abcdef1234567890',
        ROOM_DRAIN_TIMEOUT_MS: '250',
      })
    ).toEqual({
      version: '1.15.0',
      buildSha: 'abcdef1234567890',
      drainTimeoutMs: 250,
    })
  })

  it.each(['0', '-1', '1.5', 'not-a-number', '90000000'])(
    'rejects invalid ROOM_DRAIN_TIMEOUT_MS=%s',
    value => {
      expect(() => readRoomServerEnvironment({ ROOM_DRAIN_TIMEOUT_MS: value })).toThrow(
        'ROOM_DRAIN_TIMEOUT_MS'
      )
    }
  )

  it('rejects explicitly blank or unsafe build metadata', () => {
    expect(() => readRoomServerEnvironment({ ROOM_SERVER_VERSION: '' })).toThrow(
      'ROOM_SERVER_VERSION'
    )
    expect(() => readRoomServerEnvironment({ ROOM_SERVER_BUILD_SHA: 'not-a-commit' })).toThrow(
      'ROOM_SERVER_BUILD_SHA'
    )
  })

  it('keeps metrics disabled by default and rejects weak configured tokens', () => {
    expect(readRoomServerEnvironment({})).not.toHaveProperty('metricsToken')
    expect(() => readRoomServerEnvironment({ ROOM_METRICS_TOKEN: '' })).toThrow(
      'ROOM_METRICS_TOKEN'
    )
    expect(() => readRoomServerEnvironment({ ROOM_METRICS_TOKEN: 'too-short' })).toThrow(
      'ROOM_METRICS_TOKEN'
    )
    expect(
      readRoomServerEnvironment({
        ROOM_METRICS_TOKEN: 'synthetic-metrics-token-at-least-32-bytes',
      })
    ).toMatchObject({ metricsToken: 'synthetic-metrics-token-at-least-32-bytes' })
  })
})
