import { describe, expect, it } from 'vitest'
import { createHealthResponse, createReadinessResponse } from '../src/serverHealth'

describe('server health payloads', () => {
  it('keeps liveness and readiness on fixed aggregate allowlists', () => {
    const health = createHealthResponse(
      {
        version: '1.15.0',
        buildSha: 'abcdef1',
        protocolVersion: 1,
        startedAt: 1_000,
      },
      {
        rooms: 2,
        activeGames: 1,
        connections: 4,
        drainBlockingRooms: 2,
      },
      3_500,
      12_345
    )

    expect(health).toEqual({
      status: 'ok',
      version: '1.15.0',
      buildSha: 'abcdef1',
      protocolVersion: 1,
      uptimeSeconds: 2,
      rssBytes: 12_345,
      rooms: 2,
      activeGames: 1,
      connections: 4,
      drainBlockingRooms: 2,
    })
    expect(createReadinessResponse(false)).toEqual({
      status: 'ready',
      acceptingNewRooms: true,
      draining: false,
    })
    expect(createReadinessResponse(true)).toEqual({
      status: 'draining',
      acceptingNewRooms: false,
      draining: true,
    })
  })
})
