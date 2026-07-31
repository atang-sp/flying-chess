import { describe, expect, it } from 'vitest'
import {
  beginPartyTurn,
  completePartyTurn,
  createPartyTieBreakState,
  createPartyHighlight,
  createPartyPunishmentChoices,
  createPartySession,
  decidePartyReaction,
  isPartyPunishmentChoiceEligible,
  getPartyTimeLimitLeaders,
  pausePartySession,
  resolvePartyReactionRoll,
  recordPartyChain,
  rollPartyTieBreak,
  resumePartySession,
  spendPartyToken,
  submitPartyPrediction,
} from '../services/partyMode'
import type { PunishmentConfig } from '../types/game'

describe('升温局阶段导演', () => {
  it('按完整轮次从暖场推进到升温和终局', () => {
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    expect(session).toMatchObject({
      act: 'warmup',
      roundNumber: 1,
      completedRounds: 0,
    })

    for (let completedTurn = 0; completedTurn < 4; completedTurn += 1) {
      session = completePartyTurn(session, {
        playerIndex: completedTurn % 2,
        now: completedTurn + 1,
      })
    }

    expect(session).toMatchObject({
      act: 'heating',
      roundNumber: 3,
      completedRounds: 2,
    })

    for (let completedTurn = 4; completedTurn < 10; completedTurn += 1) {
      session = completePartyTurn(session, {
        playerIndex: completedTurn % 2,
        now: completedTurn + 1,
      })
    }

    expect(session).toMatchObject({
      act: 'finale',
      roundNumber: 6,
      completedRounds: 5,
    })
  })

  it('只在轮次边界按活跃时长提前切幕并触发二十分钟结束', () => {
    const minute = 60_000
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    session = completePartyTurn(session, { playerIndex: 0, now: 7 * minute })
    expect(session).toMatchObject({ act: 'warmup', shouldEnd: false })

    session = completePartyTurn(session, { playerIndex: 1, now: 7 * minute })
    expect(session).toMatchObject({ act: 'heating', shouldEnd: false })

    session = completePartyTurn(session, { playerIndex: 0, now: 15 * minute })
    expect(session.act).toBe('heating')

    session = completePartyTurn(session, { playerIndex: 1, now: 15 * minute })
    expect(session).toMatchObject({ act: 'finale', shouldEnd: false })

    session = completePartyTurn(session, { playerIndex: 0, now: 21 * minute })
    expect(session).toMatchObject({
      timeLimitPending: true,
      shouldEnd: false,
    })

    session = completePartyTurn(session, { playerIndex: 1, now: 21 * minute })
    expect(session.shouldEnd).toBe(true)
  })

  it('暂停时间不计入切幕和结束时长', () => {
    const minute = 60_000
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    session = pausePartySession(session, 5 * minute)
    session = resumePartySession(session, 15 * minute)
    session = completePartyTurn(session, { playerIndex: 0, now: 20 * minute })
    session = completePartyTurn(session, { playerIndex: 1, now: 20 * minute })

    expect(session).toMatchObject({
      activeElapsedMs: 10 * minute,
      act: 'heating',
      shouldEnd: false,
    })
  })

  it('每名玩家持有两枚通用筹码且每回合最多使用一枚', () => {
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    session = beginPartyTurn(session, 0)
    session = spendPartyToken(session, { playerIndex: 0, action: 'reroll' })

    expect(session.tokensRemaining).toEqual([1, 2])
    expect(() => spendPartyToken(session, { playerIndex: 0, action: 'punishment_choice' })).toThrow(
      '每回合最多使用一枚干预筹码'
    )

    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    session = beginPartyTurn(session, 1)
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    session = beginPartyTurn(session, 0)
    session = spendPartyToken(session, {
      playerIndex: 0,
      action: 'punishment_choice',
    })

    expect(session.tokensRemaining).toEqual([0, 2])

    session = completePartyTurn(session, { playerIndex: 0, now: 3 })
    session = beginPartyTurn(session, 1)
    session = completePartyTurn(session, { playerIndex: 1, now: 4 })
    session = beginPartyTurn(session, 0)

    expect(() => spendPartyToken(session, { playerIndex: 0, action: 'reroll' })).toThrow(
      '干预筹码已经用完'
    )
  })

  it('惩罚干预消耗决策玩家自己的筹码但不放开骰子干预权', () => {
    let session = createPartySession({ playerCount: 3, startedAt: 0 })
    session = beginPartyTurn(session, 0)

    expect(() => spendPartyToken(session, { playerIndex: 1, action: 'reroll' })).toThrow(
      '只有当前玩家可以使用该干预筹码'
    )

    session = spendPartyToken(session, { playerIndex: 1, action: 'amplify' })

    expect(session.tokensRemaining).toEqual([2, 1, 2])
    expect(session.interventionUsedThisTurn).toBe('amplify')
    expect(() => spendPartyToken(session, { playerIndex: 0, action: 'immunity' })).toThrow(
      '每回合最多使用一枚干预筹码'
    )
  })

  it('每轮轮换一次预测反应且镜像后的骰子不能再次重掷', () => {
    let session = createPartySession({ playerCount: 3, startedAt: 0 })

    session = beginPartyTurn(session, 0)
    expect(session.reaction).toMatchObject({
      status: 'awaiting_prediction',
      targetPlayerIndex: 0,
      reactorPlayerIndex: 1,
    })

    session = submitPartyPrediction(session, {
      playerIndex: 1,
      prediction: 'low',
    })
    session = resolvePartyReactionRoll(session, 2)
    expect(session.reaction?.status).toBe('awaiting_decision')

    session = decidePartyReaction(session, {
      playerIndex: 1,
      decision: 'mirror',
    })
    expect(session.reaction).toMatchObject({
      status: 'resolved',
      finalDiceValue: 5,
    })
    expect(() => spendPartyToken(session, { playerIndex: 0, action: 'reroll' })).toThrow(
      '同一次骰子最多改变一次'
    )

    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    session = beginPartyTurn(session, 1)
    expect(session.reaction).toBeUndefined()
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    session = beginPartyTurn(session, 2)
    expect(session.reaction).toBeUndefined()
    session = completePartyTurn(session, { playerIndex: 2, now: 3 })

    session = beginPartyTurn(session, 0)
    expect(session.reaction).toBeUndefined()
    session = completePartyTurn(session, { playerIndex: 0, now: 4 })
    session = beginPartyTurn(session, 1)
    expect(session.reaction).toMatchObject({
      targetPlayerIndex: 1,
      reactorPlayerIndex: 2,
    })
  })

  it('新一轮互动目标会按轮换顺序跳过仍在停飞的玩家', () => {
    let session = createPartySession({ playerCount: 3, startedAt: 0 })

    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    session = completePartyTurn(session, {
      playerIndex: 2,
      now: 3,
      nextRoundEligibleReactionTargets: [0, 2],
    })

    expect(session.reactionTargetPlayerIndex).toBe(2)

    session = beginPartyTurn(session, 0)
    expect(session.reaction).toBeUndefined()
    session = completePartyTurn(session, { playerIndex: 0, now: 4 })
    session = beginPartyTurn(session, 1)
    expect(session.reaction).toBeUndefined()
    session = completePartyTurn(session, { playerIndex: 1, now: 5 })
    session = beginPartyTurn(session, 2)
    expect(session.reaction).toMatchObject({
      targetPlayerIndex: 2,
      reactorPlayerIndex: 0,
    })
  })

  it('随机二选一只接入普通静态棋盘惩罚', () => {
    const staticAction = {
      tool: { name: '手掌', intensity: 1, ratio: 100 },
      bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
      position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
      strikes: 5,
      description: '静态惩罚',
    }

    expect(
      isPartyPunishmentChoiceEligible({
        source: 'board_punishment',
        cellType: 'punishment',
        action: staticAction,
      })
    ).toBe(true)
    expect(
      isPartyPunishmentChoiceEligible({
        source: 'takeoff_failure',
        cellType: 'punishment',
        action: staticAction,
      })
    ).toBe(false)
    expect(
      isPartyPunishmentChoiceEligible({
        source: 'board_punishment',
        cellType: 'chain_punishment',
        action: staticAction,
      })
    ).toBe(false)
    expect(
      isPartyPunishmentChoiceEligible({
        source: 'board_punishment',
        cellType: 'punishment',
        action: { ...staticAction, dynamicType: 'dice_multiplier' },
      })
    ).toBe(false)
  })

  it('随机二选一生成两个互不相同的兼容静态结果', () => {
    const config: PunishmentConfig = {
      tools: {
        手掌: { name: '手掌', intensity: 1, ratio: 100 },
      },
      bodyParts: {
        手心: { name: '手心', sensitivity: 2, ratio: 100 },
      },
      positions: {
        站立: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
      },
      minStrikes: 5,
      maxStrikes: 10,
      step: 5,
      maxTakeoffFailures: 5,
      doublePunishmentChance: 20,
    }
    let countSelection = 0

    const choices = createPartyPunishmentChoices(config, {
      weightedChoice: entries => entries[0],
      randomInt: () => {
        countSelection += 1
        return countSelection
      },
      choice: entries => entries[0],
    })

    expect(choices).toHaveLength(2)
    expect(choices[0].strikes).toBe(5)
    expect(choices[1].strikes).toBe(10)
    expect(choices[0].description).not.toBe(choices[1].description)
    expect(choices.every(choice => choice.dynamicType === undefined)).toBe(true)
  })

  it('高光卡只汇总非敏感的幕次、决定、反应和连锁数据', () => {
    let session = createPartySession({ playerCount: 2, startedAt: 0 })
    session = beginPartyTurn(session, 0)
    session = submitPartyPrediction(session, { playerIndex: 1, prediction: 'high' })
    session = resolvePartyReactionRoll(session, 6)
    session = decidePartyReaction(session, { playerIndex: 1, decision: 'keep' })
    session = spendPartyToken(session, {
      playerIndex: 0,
      action: 'punishment_choice',
    })
    session = recordPartyChain(session, 4)

    expect(createPartyHighlight(session)).toEqual({
      act: 'warmup',
      keyDecision: '筹码使用: 二选一 1 次',
      reactionSummary: '成功反应 1 次',
      chainSummary: '最长连锁 4 次',
    })
  })

  it('二十分钟结束时保留所有最远位置玩家进入掷骰决胜', () => {
    expect(getPartyTimeLimitLeaders([12, 18, 18, 7])).toEqual([1, 2])
    expect(getPartyTimeLimitLeaders([40, 21])).toEqual([0])
  })

  it('并列决胜只保留最高点玩家并在再次并列时继续', () => {
    let state = createPartyTieBreakState([0, 1, 2])

    let result = rollPartyTieBreak(state, 0, 6)
    state = result.state
    result = rollPartyTieBreak(state, 1, 6)
    state = result.state
    result = rollPartyTieBreak(state, 2, 4)
    state = result.state

    expect(result.winnerPlayerIndex).toBeUndefined()
    expect(state).toMatchObject({
      candidatePlayerIndices: [0, 1],
      currentCandidateOffset: 0,
      roundNumber: 2,
      rolls: {},
    })

    result = rollPartyTieBreak(state, 0, 5)
    state = result.state
    result = rollPartyTieBreak(state, 1, 3)

    expect(result.winnerPlayerIndex).toBe(0)
  })
})
