import { describe, expect, it } from 'vitest'
import {
  consumePartyMiniGameModifier,
  createMemoryChallenge,
  createReactionRace,
  recordReactionPress,
} from '../services/partyMiniGames'
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
const resolution = resolveRule({
  source: 'board_punishment',
  actorIndex: 0,
  players,
  punishmentConfig,
  boardAction: action,
  randomSource: {
    weightedChoice: entries => entries[0],
    randomInt: minimum => minimum,
    choice: entries => entries[0],
  },
})

describe('回合间小游戏规则', () => {
  it('反应赛只接受第一名合法玩家并拒绝重复提交', () => {
    let race = createReactionRace(players.length)
    race = recordReactionPress(race, 1, 120)
    expect(race).toMatchObject({ winnerPlayerIndex: 1, winningTimeMs: 120 })
    expect(recordReactionPress(race, 0, 130)).toBe(race)
    expect(() => recordReactionPress(createReactionRace(2), 9, 1)).toThrow('反应玩家不存在')
  })

  it('记忆挑战可由注入的随机源生成稳定序列', () => {
    const challenge = createMemoryChallenge(3, entries => entries[0])
    expect(challenge.sequence).toEqual(['✈️', '✈️', '✈️'])
    expect(challenge.options).toContain('✈️')
  })

  it('小游戏免罚和加倍只消费一次并生成明确惩罚结果', () => {
    const immune = consumePartyMiniGameModifier(resolution, {
      ...players[0],
      pendingMiniGameImmunity: true,
    })
    expect(immune.resolution).toMatchObject({
      count: { kind: 'fixed', value: 0 },
      action: { strikes: 0 },
    })
    expect(immune.player.pendingMiniGameImmunity).toBeUndefined()

    const amplified = consumePartyMiniGameModifier(resolution, {
      ...players[0],
      pendingMiniGameMultiplier: 2,
    })
    expect(amplified.resolution).toMatchObject({ count: { kind: 'fixed', value: 20 } })
    expect(amplified.player.pendingMiniGameMultiplier).toBeUndefined()
  })
})
