import { describe, expect, it } from 'vitest'
import {
  createDeferredPunishment,
  createEncorePunishmentReturn,
  createMutualPunishmentReturn,
  getPunishmentVariantPresentation,
  resolveConditionalPunishment,
} from '../services/punishmentVariants'
import { resolveRule } from '../services/ruleResolution'
import type { Player, PunishmentAction, PunishmentConfig } from '../types/game'

const players: Player[] = [
  { id: 1, name: '红方', color: '#ef4444', position: 8, isWinner: false },
  { id: 2, name: '蓝方', color: '#3b82f6', position: 5, isWinner: false },
]

const punishmentConfig: PunishmentConfig = {
  tools: { 手掌: { name: '手掌', intensity: 1, ratio: 100 } },
  bodyParts: { 手心: { name: '手心', sensitivity: 2, ratio: 100 } },
  positions: { 站立: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] } },
  minStrikes: 5,
  maxStrikes: 15,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const action: PunishmentAction = {
  tool: punishmentConfig.tools['手掌'],
  bodyPart: punishmentConfig.bodyParts['手心'],
  position: punishmentConfig.positions['站立'],
  strikes: 10,
  description: '用手掌打手心10下，姿势：站立',
}

function resolution(variant: 'conditional' | 'deferred' | 'mutual' | 'encore') {
  return resolveRule({
    source: 'board_punishment',
    actorIndex: 0,
    players,
    punishmentConfig,
    boardAction: action,
    punishmentVariant: variant,
    randomSource: {
      weightedChoice: entries => entries[0],
      randomInt: minimum => minimum,
      choice: entries => entries[0],
    },
  })
}

describe('升温局惩罚变体', () => {
  it.each([
    ['blindbox', '盲盒惩罚', true],
    ['conditional', '条件惩罚', false],
    ['deferred', '延迟惩罚', false],
    ['mutual', '双向惩罚', false],
    ['encore', '返场惩罚', false],
  ] as const)('为 %s 提供稳定的名称和现场执行契约', (variant, label, concealsDetails) => {
    const presentation = getPunishmentVariantPresentation(variant)

    expect(presentation).toMatchObject({ label, concealsDetails })
    expect(presentation.instruction.length).toBeGreaterThan(10)
  })

  it('条件达成时把固定惩罚减半，失败时保持原惩罚', () => {
    const original = resolution('conditional')

    expect(resolveConditionalPunishment(original, true)).toMatchObject({
      variantPhase: 'conditional_resolved',
      count: { kind: 'fixed', value: 5 },
      action: { strikes: 5 },
    })
    expect(resolveConditionalPunishment(original, false)).toMatchObject({
      variantPhase: 'conditional_resolved',
      count: { kind: 'fixed', value: 10 },
      action: { strikes: 10 },
    })
  })

  it('延迟惩罚回放时保留内容但不允许再次延迟', () => {
    const deferred = createDeferredPunishment(resolution('deferred'))

    expect(deferred).toMatchObject({
      targetPlayerIndex: 0,
      variant: 'deferred',
      variantPhase: 'deferred_execution',
      count: { kind: 'fixed', value: 10 },
    })
  })

  it('双向惩罚第二次执行交换受罚者与执行者', () => {
    const returned = createMutualPunishmentReturn(resolution('mutual'))

    expect(returned).toMatchObject({
      targetPlayerIndex: 1,
      executorIndex: 0,
      variant: 'mutual',
      variantPhase: 'mutual_return',
    })
  })

  it('进度解锁的返场惩罚让同一目标再执行半数', () => {
    expect(createEncorePunishmentReturn(resolution('encore'))).toMatchObject({
      targetPlayerIndex: 0,
      variant: 'encore',
      variantPhase: 'encore_return',
      count: { kind: 'fixed', value: 5 },
      action: { strikes: 5 },
    })
  })
})
