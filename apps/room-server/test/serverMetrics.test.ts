import { describe, expect, it } from 'vitest'
import {
  isMetricsRequestAuthorized,
  ServerMetrics,
  validateMetricsToken,
} from '../src/serverMetrics'

describe('server metrics', () => {
  it('exposes only the fixed aggregate counter and gauge allowlists', () => {
    const metrics = new ServerMetrics(1_000)
    metrics.increment('connectionsOpenedTotal')
    metrics.increment('roomsCreatedTotal')
    metrics.increment('roomsCreatedTotal')

    const snapshot = metrics.snapshot(
      {
        rooms: 2,
        activeGames: 1,
        connections: 3,
        drainBlockingRooms: 1,
      },
      true,
      5_500,
      12_345
    )

    expect(Object.keys(snapshot)).toEqual(['schemaVersion', 'counters', 'gauges'])
    expect(Object.keys(snapshot.counters)).toEqual([
      'connectionsOpenedTotal',
      'connectionsClosedTotal',
      'roomsCreatedTotal',
      'roomJoinsTotal',
      'roomResumesTotal',
      'gamesStartedTotal',
      'gamesFinishedTotal',
      'hostTransfersTotal',
      'roomsExpiredTotal',
      'protocolRejectedTotal',
      'rateLimitedMessagesTotal',
    ])
    expect(snapshot.counters).toMatchObject({
      connectionsOpenedTotal: 1,
      roomsCreatedTotal: 2,
      protocolRejectedTotal: 0,
    })
    expect(snapshot.gauges).toEqual({
      rooms: 2,
      activeGames: 1,
      connections: 3,
      drainBlockingRooms: 1,
      draining: 1,
      rssBytes: 12_345,
      uptimeSeconds: 4,
    })
  })

  it('validates token strength and compares bearer credentials through fixed-length digests', () => {
    const token = 'synthetic-metrics-token-at-least-32-bytes'
    expect(() => validateMetricsToken(token)).not.toThrow()
    expect(() => validateMetricsToken('too-short')).toThrow('32-512 bytes')
    expect(() => validateMetricsToken(`${token} with-space`)).toThrow('without whitespace')
    expect(isMetricsRequestAuthorized(`Bearer ${token}`, token)).toBe(true)
    expect(isMetricsRequestAuthorized('Bearer different-token', token)).toBe(false)
    expect(isMetricsRequestAuthorized(undefined, token)).toBe(false)
  })
})
