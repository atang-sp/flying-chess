import { describe, expect, it } from 'vitest'
import { shouldRecoverMovingState } from '../services/gameStateHealth'

const noBlockingOverlay = {
  takeoffPunishment: false,
  trap: false,
  bounce: false,
  takeoffRelief: false,
  doublePunishmentReveal: false,
  chainPunishmentRoll: false,
  mercyDecision: false,
}

describe('游戏移动状态健康检查', () => {
  it('只在移动状态无覆盖层且超时后恢复', () => {
    expect(shouldRecoverMovingState('moving', 5001, noBlockingOverlay)).toBe(true)
    expect(shouldRecoverMovingState('moving', 5000, noBlockingOverlay)).toBe(false)
    expect(shouldRecoverMovingState('waiting', 5001, noBlockingOverlay)).toBe(false)
  })

  it.each([
    'takeoffPunishment',
    'trap',
    'bounce',
    'takeoffRelief',
    'doublePunishmentReveal',
    'chainPunishmentRoll',
    'mercyDecision',
  ] as const)('%s 覆盖层显示期间不恢复移动状态', overlay => {
    expect(
      shouldRecoverMovingState('moving', 5001, {
        ...noBlockingOverlay,
        [overlay]: true,
      })
    ).toBe(false)
  })
})
