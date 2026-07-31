import { describe, expect, it } from 'vitest'
import {
  applyPartyPunishmentIntervention,
  getPartyPunishmentInterventionOptions,
  projectSharedScreenInterventionOptions,
} from '../services/partyPunishmentInterventions'
import { finalizePunishmentCount, resolveRule } from '../services/ruleResolution'
import type { Player, PunishmentAction, PunishmentConfig } from '../types/game'

const players: Player[] = [
  { id: 1, name: '红方', color: '#ef4444', position: 8, isWinner: false },
  { id: 2, name: '蓝方', color: '#3b82f6', position: 5, isWinner: false },
  { id: 3, name: '绿方', color: '#22c55e', position: 3, isWinner: false },
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

function createResolution() {
  return resolveRule({
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
}

describe('升温局惩罚筹码干预', () => {
  it('转嫁给原执行者时交换受罚者和执行者', () => {
    const resolution = createResolution()

    expect(resolution).toMatchObject({ targetPlayerIndex: 0, executorIndex: 1 })

    const outcome = applyPartyPunishmentIntervention(
      resolution,
      {
        action: 'transfer',
        playerIndex: 0,
        targetPlayerIndex: 1,
      },
      players.length
    )

    expect(outcome).toMatchObject({
      action: 'transfer',
      spentByPlayerIndex: 0,
      resolution: { targetPlayerIndex: 1, executorIndex: 0 },
    })
    expect(resolution).toMatchObject({ targetPlayerIndex: 0, executorIndex: 1 })
  })

  it('由非受罚玩家把固定次数惩罚加码为两倍', () => {
    const resolution = createResolution()

    const outcome = applyPartyPunishmentIntervention(
      resolution,
      {
        action: 'amplify',
        playerIndex: 2,
      },
      players.length
    )

    expect(outcome).toMatchObject({
      action: 'amplify',
      spentByPlayerIndex: 2,
      resolution: {
        count: { kind: 'fixed', value: 20 },
        action: { strikes: 20, description: '用手掌打手心20下，姿势：站立' },
      },
    })
    expect(resolution.count).toEqual({ kind: 'fixed', value: 10 })
  })

  it('只允许当前受罚玩家用免疫取消本次惩罚', () => {
    const resolution = createResolution()

    const outcome = applyPartyPunishmentIntervention(
      resolution,
      {
        action: 'immunity',
        playerIndex: 0,
      },
      players.length
    )

    expect(outcome).toEqual({
      action: 'immunity',
      spentByPlayerIndex: 0,
      resolution: null,
    })
    expect(() =>
      applyPartyPunishmentIntervention(
        resolution,
        {
          action: 'immunity',
          playerIndex: 2,
        },
        players.length
      )
    ).toThrow('只有当前受罚玩家可以免疫惩罚')
  })

  it('根据受罚角色和剩余筹码返回每人可用的干预', () => {
    const resolution = createResolution()

    const options = getPartyPunishmentInterventionOptions(resolution, players, [1, 0, 2], false)

    expect(options).toEqual([
      {
        playerIndex: 0,
        actions: ['transfer', 'immunity'],
        transferTargetPlayerIndices: [1, 2],
      },
      {
        playerIndex: 2,
        actions: ['amplify'],
        transferTargetPlayerIndices: [],
      },
    ])
    expect(getPartyPunishmentInterventionOptions(resolution, players, [1, 1, 1], true)).toEqual([])
  })

  it('对待选次数惩罚保留加码倍率直到最终结算', () => {
    const pendingResolution = resolveRule({
      source: 'board_punishment',
      actorIndex: 0,
      players,
      punishmentConfig,
      boardAction: { ...action, dynamicType: 'other_player_choice' },
    })

    const outcome = applyPartyPunishmentIntervention(
      pendingResolution,
      {
        action: 'amplify',
        playerIndex: 2,
      },
      players.length
    )
    if (!outcome.resolution) throw new Error('加码不应取消惩罚')

    expect(outcome.resolution).toMatchObject({
      count: { kind: 'awaiting_external_count' },
      countMultiplier: 2,
    })
    expect(finalizePunishmentCount(outcome.resolution, 10)).toMatchObject({
      count: { kind: 'fixed', value: 20 },
      action: { strikes: 20 },
    })
  })

  it('拒绝把惩罚转嫁给不存在的玩家索引', () => {
    expect(() =>
      applyPartyPunishmentIntervention(
        createResolution(),
        { action: 'transfer', playerIndex: 0, targetPlayerIndex: 9 },
        players.length
      )
    ).toThrow('转嫁目标必须是存在的其他玩家')
  })

  it('共享主屏只投影本机玩家的干预，远端玩家动作保持私密', () => {
    const options = getPartyPunishmentInterventionOptions(
      createResolution(),
      players,
      [1, 1, 1],
      false
    )

    expect(projectSharedScreenInterventionOptions(options, index => index !== 1)).toEqual([
      {
        playerIndex: 1,
        actions: ['amplify'],
        transferTargetPlayerIndices: [],
      },
    ])
  })
})
