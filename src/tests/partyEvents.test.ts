import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARTY_EVENT_DECK,
  activatePartyEvent,
  applyPartyEventPunishmentRules,
  createPartyEventState,
  processPartyEventSignal,
  resolvePartyRockPaperScissors,
  tallyPartyVotes,
  validatePartyEventDeck,
} from '@flying-chess/game-core/party-events'
import { resolveRule } from '@flying-chess/game-core/rule-resolution'
import type { Player, PunishmentAction, PunishmentConfig } from '@flying-chess/game-core/types'

const players: Player[] = [
  { id: 1, name: '红方', color: '#ef4444', position: 8, isWinner: false },
  { id: 2, name: '蓝方', color: '#3b82f6', position: 5, isWinner: false },
  { id: 3, name: '绿方', color: '#22c55e', position: 2, isWinner: false },
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
  strikes: 5,
  description: '用手掌打手心5下，姿势：站立',
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

describe('升温局事件卡状态机', () => {
  it('按每 N 回合、连续惩罚和特定骰点分别触发且同回合不重复', () => {
    let state = createPartyEventState(DEFAULT_PARTY_EVENT_DECK)

    let result = processPartyEventSignal(state, { kind: 'turn_completed', hadPunishment: false })
    state = result.state
    expect(result.drawnCard).toBeUndefined()

    result = processPartyEventSignal(state, { kind: 'turn_completed', hadPunishment: false })
    state = result.state
    expect(result.drawnCard?.trigger).toEqual({ kind: 'every_n_turns', interval: 2 })

    result = processPartyEventSignal(state, { kind: 'dice_value', value: 6 })
    state = result.state
    expect(result.drawnCard?.trigger).toEqual({ kind: 'dice_value', value: 6 })

    result = processPartyEventSignal(state, { kind: 'dice_value', value: 6 })
    expect(result.drawnCard).toBeUndefined()

    state = processPartyEventSignal(state, { kind: 'punishment_resolved' }).state
    result = processPartyEventSignal(state, { kind: 'punishment_resolved' })
    expect(result.drawnCard?.trigger).toEqual({ kind: 'consecutive_punishments', count: 2 })
  })

  it('临时翻倍规则持续指定回合并结算待选或固定次数', () => {
    const card = DEFAULT_PARTY_EVENT_DECK.find(card => card.effect.kind === 'punishment_multiplier')
    if (!card) throw new Error('default multiplier card missing')
    let state = activatePartyEvent(createPartyEventState(DEFAULT_PARTY_EVENT_DECK), card)

    expect(applyPartyEventPunishmentRules(state, resolution)).toMatchObject({
      count: { kind: 'fixed', value: 10 },
      action: { strikes: 10 },
    })

    state = processPartyEventSignal(state, {
      kind: 'turn_completed',
      hadPunishment: true,
    }).state
    expect(state.activePunishmentMultiplier?.remainingTurns).toBe(2)
  })

  it('绑定关系只接受两名不同玩家并能查询共同承担者', () => {
    const card = DEFAULT_PARTY_EVENT_DECK.find(card => card.effect.kind === 'bind_players')
    if (!card) throw new Error('default binding card missing')

    expect(() =>
      activatePartyEvent(createPartyEventState(DEFAULT_PARTY_EVENT_DECK), card, [1, 1])
    ).toThrow('绑定事件需要两名不同玩家')

    const state = activatePartyEvent(createPartyEventState(DEFAULT_PARTY_EVENT_DECK), card, [0, 2])
    expect(state.activeBinding).toMatchObject({ playerIndices: [0, 2] })
  })

  it('逐人计票并结算全员猜拳赢家', () => {
    expect(tallyPartyVotes(['继续', '加码'], [0, 1, 1])).toEqual({
      counts: [1, 2],
      winningOptionIndices: [1],
    })
    expect(resolvePartyRockPaperScissors(['rock', 'scissors', 'rock'])).toEqual({
      winnerPlayerIndices: [0, 2],
      winningChoice: 'rock',
    })
    expect(resolvePartyRockPaperScissors(['rock', 'paper', 'scissors'])).toEqual({
      winnerPlayerIndices: [0, 1, 2],
      winningChoice: null,
    })
  })

  it('拒绝未知效果、重复 id 和越界触发参数的导入卡包', () => {
    expect(validatePartyEventDeck(DEFAULT_PARTY_EVENT_DECK)).toEqual({ ok: true })
    expect(validatePartyEventDeck([{ ...DEFAULT_PARTY_EVENT_DECK[0], id: '' }])).toMatchObject({
      ok: false,
    })
    expect(
      validatePartyEventDeck([DEFAULT_PARTY_EVENT_DECK[0], DEFAULT_PARTY_EVENT_DECK[0]])
    ).toMatchObject({ ok: false })
    expect(
      validatePartyEventDeck([
        {
          ...DEFAULT_PARTY_EVENT_DECK[0],
          trigger: { kind: 'every_n_turns', interval: 0 },
        },
      ])
    ).toMatchObject({ ok: false })
    expect(
      validatePartyEventDeck([
        {
          ...DEFAULT_PARTY_EVENT_DECK[0],
          effect: { kind: 'rock_paper_scissors' },
        },
      ])
    ).toEqual({ ok: true })
  })
})
