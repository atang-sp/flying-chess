import { describe, expect, it } from 'vitest'
import { isRoomDrainBlocking } from '../src/serverLifecycle'

describe('room drain blockers', () => {
  it.each([
    ['connected lobby', 'lobby', 1, true],
    ['running game with no connection', 'playing', 0, true],
    ['finished result still being read', 'finished', 1, true],
    ['disconnected lobby', 'lobby', 0, false],
    ['disconnected finished room', 'finished', 0, false],
  ] as const)('classifies %s explicitly', (_label, status, connectedSessions, expected) => {
    expect(isRoomDrainBlocking(status, connectedSessions)).toBe(expected)
  })
})
