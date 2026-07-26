import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyTurnConsequence,
  consumePendingSkippedTurn,
  createCompatiblePunishmentAction,
  finalizePunishmentCount,
  resolveRule,
  scaleResolvedPunishmentCount,
} from '../services/ruleResolution'
import { GameService } from '../services/gameService'
import { SecureRandom } from '../utils/secureRandom'
import type {
  BoardCell,
  BoardConfig,
  Player,
  PunishmentAction,
  PunishmentConfig,
} from '../types/game'

const players: Player[] = [
  {
    id: 1,
    name: '红方',
    color: '#ef4444',
    position: 4,
    isWinner: false,
  },
  {
    id: 2,
    name: '蓝方',
    color: '#3b82f6',
    position: 7,
    isWinner: false,
  },
]

const threePlayers: Player[] = [
  ...players,
  {
    id: 3,
    name: '绿方',
    color: '#22c55e',
    position: 10,
    isWinner: false,
  },
]

const boardAction: PunishmentAction = {
  tool: { name: '皮拍', intensity: 3, ratio: 100 },
  bodyPart: { name: '臀部', sensitivity: 4, ratio: 100 },
  position: { name: '俯卧', ratio: 100, compatibleBodyParts: ['臀部'] },
  strikes: 10,
  description: '用皮拍打臀部10下，姿势：俯卧',
}

const compatibilityConfig: PunishmentConfig = {
  tools: {
    皮拍: { name: '皮拍', intensity: 4, ratio: 100 },
  },
  bodyParts: {
    低敏感部位: { name: '低敏感部位', sensitivity: 1, ratio: 100 },
    臀部: { name: '臀部', sensitivity: 4, ratio: 1 },
  },
  positions: {
    仰卧: { name: '仰卧', ratio: 100, compatibleBodyParts: ['臀部'] },
    侧卧: { name: '侧卧', ratio: 1, compatibleBodyParts: ['低敏感部位'] },
  },
  minStrikes: 5,
  maxStrikes: 15,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const boardConfig: BoardConfig = {
  punishmentCells: 1,
  chainPunishmentCells: 0,
  bonusCells: 0,
  reverseCells: 0,
  restCells: 0,
  restartCells: 0,
  trapCells: 0,
  totalCells: 20,
}

const disabledCompatibilityConfig: PunishmentConfig = {
  ...compatibilityConfig,
  tools: {
    高强度工具: { name: '高强度工具', intensity: 5, ratio: 100 },
    低强度工具: { name: '低强度工具', intensity: 1, ratio: 1 },
  },
  bodyParts: {
    高耐受部位: { name: '高耐受部位', sensitivity: 5, ratio: 100 },
    低耐受部位: { name: '低耐受部位', sensitivity: 1, ratio: 1 },
  },
  positions: {
    已禁用姿势: { name: '已禁用姿势', ratio: 0, compatibleBodyParts: ['高耐受部位'] },
    可用姿势: { name: '可用姿势', ratio: 1, compatibleBodyParts: ['低耐受部位'] },
  },
}

const deterministicRandom = {
  weightedChoice: <T>(entries: readonly T[]) => entries[0],
  randomInt: (minimum: number) => minimum,
  choice: <T>(entries: readonly T[]) => entries[entries.length - 1],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('规则结果解析', () => {
  it('保留棋盘上已确认的静态惩罚动作', () => {
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players,
      punishmentConfig: compatibilityConfig,
      boardAction,
    })

    expect(result).toMatchObject({
      kind: 'punishment',
      source: 'board_punishment',
      actorIndex: 1,
      targetPlayerIndex: 1,
      action: boardAction,
      count: { kind: 'fixed', value: 10 },
    })
  })

  it('只生成工具强度和姿势都兼容的惩罚动作', () => {
    const action = createCompatiblePunishmentAction(compatibilityConfig, {
      weightedChoice: entries => entries[0],
      randomInt: minimum => minimum,
      choice: entries => entries[0],
    })

    expect(action.tool.name).toBe('皮拍')
    expect(action.bodyPart.name).toBe('臀部')
    expect(action.position.name).toBe('仰卧')
    expect(action.strikes).toBe(5)
  })

  it('忽略会令组合失效的零比例部位和姿势', () => {
    const action = createCompatiblePunishmentAction(
      disabledCompatibilityConfig,
      deterministicRandom
    )

    expect(action.tool.name).toBe('低强度工具')
    expect(action.bodyPart.name).toBe('低耐受部位')
    expect(action.position.name).toBe('可用姿势')
  })

  it('让随机棋盘和起飞失败共用兼容组合规则', () => {
    vi.spyOn(SecureRandom, 'weightedChoice').mockImplementation(items => items[0])
    vi.spyOn(SecureRandom, 'randomInt').mockImplementation(minimum => minimum)

    const boardPunishment = GameService.createBoard(compatibilityConfig, boardConfig).find(
      cell => cell.type === 'punishment'
    )?.effect?.punishment
    const takeoffPunishment = GameService.movePlayer(
      { ...players[0], position: 0, hasTakenOff: false, failedTakeoffAttempts: 0 },
      2,
      GameService.createBoard(compatibilityConfig, boardConfig),
      0,
      players.length,
      compatibilityConfig
    ).punishment

    for (const action of [boardPunishment, takeoffPunishment]) {
      expect(action).toBeDefined()
      expect(action?.bodyPart.sensitivity).toBeGreaterThanOrEqual(
        action?.tool.intensity ?? Infinity
      )
      expect(
        action?.position.compatibleBodyParts.length === 0 ||
          action?.position.compatibleBodyParts.includes(action?.bodyPart.name ?? '')
      ).toBe(true)
      expect((action?.strikes ?? 0) % compatibilityConfig.step).toBe(0)
    }
  })

  it.each([
    ['previous_player', 0, 2],
    ['next_player', 2, 0],
    ['previous_player', 0, 0],
  ] as const)('按环状玩家顺序解析 %s 目标', (dynamicType, actorIndex, targetPlayerIndex) => {
    const activePlayers = actorIndex === 0 && targetPlayerIndex === 0 ? [players[0]] : threePlayers
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex,
      players: activePlayers,
      punishmentConfig: compatibilityConfig,
      boardAction: { ...boardAction, dynamicType },
    })

    expect(result.targetPlayerIndex).toBe(targetPlayerIndex)
  })

  it('把骰子倍数规则解析为固定次数', () => {
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players: threePlayers,
      punishmentConfig: compatibilityConfig,
      diceValue: 4,
      boardAction: { ...boardAction, dynamicType: 'dice_multiplier', multiplier: 3 },
    })

    expect(result).toMatchObject({
      targetPlayerIndex: 1,
      count: { kind: 'fixed', value: 12 },
      action: { strikes: 12, description: boardAction.description },
    })
  })

  it('把其他玩家决定次数保留为待外部决定状态', () => {
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players: threePlayers,
      punishmentConfig: compatibilityConfig,
      boardAction: { ...boardAction, dynamicType: 'other_player_choice' },
    })

    expect(result).toMatchObject({
      targetPlayerIndex: 1,
      action: { strikes: undefined },
      count: {
        kind: 'awaiting_external_count',
        minimum: 5,
        maximum: 15,
        step: 5,
        eligibleChooserIndices: [0, 2],
      },
    })

    if (!('eligibleChooserIndices' in result.count)) {
      throw new Error('预期得到待外部决定次数')
    }
    const eligibleChooserIndices = result.count.eligibleChooserIndices
    expect(Object.isFrozen(eligibleChooserIndices)).toBe(true)
    expect(() => (eligibleChooserIndices as number[]).push(7)).toThrow(TypeError)
  })

  it('用其他玩家选择的合法次数完成待定惩罚', () => {
    const pendingResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players: threePlayers,
      punishmentConfig: compatibilityConfig,
      boardAction: { ...boardAction, dynamicType: 'other_player_choice' },
    })

    const finalizedResult = finalizePunishmentCount(pendingResult, 15)

    expect(finalizedResult).toMatchObject({
      count: { kind: 'fixed', value: 15 },
      action: {
        strikes: 15,
        description: '用皮拍打臀部15下，姿势：俯卧',
      },
    })
    expect(pendingResult).toMatchObject({
      count: { kind: 'awaiting_external_count' },
      action: { strikes: undefined },
    })
  })

  it.each([4, 12, 20])('拒绝不符合范围或步长的外部次数 %i', selectedCount => {
    const pendingResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players: threePlayers,
      punishmentConfig: compatibilityConfig,
      boardAction: { ...boardAction, dynamicType: 'other_player_choice' },
    })

    expect(() => finalizePunishmentCount(pendingResult, selectedCount)).toThrow(
      '选择的惩罚次数不符合规则'
    )
  })

  it('在规则结果中解析执行者并安全处理单人局', () => {
    const multiplayerResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players: threePlayers,
      punishmentConfig: compatibilityConfig,
      randomSource: deterministicRandom,
      boardAction,
    })
    const singlePlayerResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 0,
      players: [players[0]],
      punishmentConfig: compatibilityConfig,
      randomSource: deterministicRandom,
      boardAction,
    })

    expect(multiplayerResult.executorIndex).toBe(2)
    expect(singlePlayerResult.executorIndex).toBeUndefined()
  })

  it('把受罚玩家待结算倍率写入同一个固定次数结果', () => {
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex: 0,
      players: [{ ...players[0], pendingMercyMultiplier: 1.5 }, players[1]],
      punishmentConfig: compatibilityConfig,
      boardAction,
    })

    expect(result).toMatchObject({
      count: { kind: 'fixed', value: 15 },
      action: { strikes: 15 },
      countMultiplier: 1.5,
    })
  })

  it('在外部次数确定时一并结算受罚玩家倍率', () => {
    const pendingResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 0,
      players: [{ ...players[0], pendingMercyMultiplier: 1.5 }, players[1]],
      punishmentConfig: compatibilityConfig,
      boardAction: { ...boardAction, dynamicType: 'other_player_choice' },
    })

    const finalizedResult = finalizePunishmentCount(pendingResult, 15)

    expect(finalizedResult).toMatchObject({
      count: { kind: 'fixed', value: 23 },
      action: { strikes: 23 },
      countMultiplier: 1.5,
    })
  })

  it('用结构化结果结算求饶减半而不改写原结果', () => {
    const originalResult = resolveRule({
      source: 'board_punishment',
      actorIndex: 0,
      players,
      punishmentConfig: compatibilityConfig,
      boardAction,
    })

    const halvedResult = scaleResolvedPunishmentCount(originalResult, 0.5)

    expect(halvedResult).toMatchObject({
      count: { kind: 'fixed', value: 5 },
      action: { strikes: 5 },
    })
    expect(originalResult).toMatchObject({
      count: { kind: 'fixed', value: 10 },
      action: { strikes: 10 },
    })
  })

  it('把休息格解析为下一回合跳过一次', () => {
    const restEffect: NonNullable<BoardCell['effect']> = {
      type: 'rest',
      value: 1,
      description: '休息一回合',
    }

    const result = resolveRule({
      source: 'cell_effect',
      actorIndex: 0,
      players,
      effect: restEffect,
    })

    expect(result).toMatchObject({
      kind: 'cell_effect',
      source: 'cell_effect',
      actorIndex: 0,
      effect: restEffect,
      turnConsequence: { kind: 'skip_next_turns', count: 1 },
    })
  })

  it('把机关解析为必须确认的结构化结果', () => {
    const trapEffect: NonNullable<BoardCell['effect']> = {
      type: 'trap',
      value: 0,
      description: '戴眼罩完成下一回合',
    }

    const result = resolveRule({
      source: 'trap',
      actorIndex: 1,
      players,
      effect: trapEffect,
    })

    expect(result).toMatchObject({
      kind: 'trap',
      source: 'trap',
      actorIndex: 1,
      acknowledgementRequired: true,
      description: '戴眼罩完成下一回合',
      turnConsequence: { kind: 'none' },
    })
  })

  it('累积并只消费一次待跳过回合', () => {
    const consequence = {
      kind: 'skip_next_turns' as const,
      count: 2,
    }

    const restedPlayer = applyTurnConsequence(players[0], consequence)
    const firstTurn = consumePendingSkippedTurn(restedPlayer)
    const secondTurn = consumePendingSkippedTurn(firstTurn.player)
    const thirdTurn = consumePendingSkippedTurn(secondTurn.player)

    expect(restedPlayer.pendingSkippedTurns).toBe(2)
    expect(players[0].pendingSkippedTurns).toBeUndefined()
    expect(firstTurn).toMatchObject({
      shouldSkip: true,
      player: { pendingSkippedTurns: 1 },
    })
    expect(secondTurn).toMatchObject({
      shouldSkip: true,
      player: { pendingSkippedTurns: 0 },
    })
    expect(thirdTurn).toMatchObject({
      shouldSkip: false,
      player: { pendingSkippedTurns: 0 },
    })
  })
})
