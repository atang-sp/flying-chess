import { describe, expect, it } from 'vitest'
import { createPlayerRoster, hasPlayerWon, nextPlayerIndex } from './playerRules'

describe('player rules', () => {
  it('creates a fresh roster with stable ids, fallback names, and rotating colors', () => {
    expect(
      createPlayerRoster({
        count: 3,
        names: ['甲'],
        colors: ['red', 'blue'],
      })
    ).toEqual([
      {
        id: 1,
        name: '甲',
        color: 'red',
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      },
      {
        id: 2,
        name: '玩家2',
        color: 'blue',
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      },
      {
        id: 3,
        name: '玩家3',
        color: 'red',
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      },
    ])
  })

  it('owns finish and turn-order decisions', () => {
    expect(hasPlayerWon({ position: 40 }, 40)).toBe(true)
    expect(nextPlayerIndex(2, 4)).toBe(3)
    expect(nextPlayerIndex(3, 4)).toBe(0)
  })

  it('rejects invalid roster and turn-order boundaries', () => {
    expect(() => createPlayerRoster({ count: 2, names: [], colors: [] })).toThrow(
      '至少需要一种玩家颜色'
    )
    expect(() => nextPlayerIndex(0, 0)).toThrow('玩家总数必须是正整数')
  })
})
