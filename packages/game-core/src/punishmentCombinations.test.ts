import { describe, expect, it } from 'vitest'
import type { BoardCell, PunishmentAction, PunishmentConfig } from './domainTypes'
import {
  generateBalancedPunishmentCombinationDefinitions,
  generatePunishmentCombinationDefinitions,
  updateBoardWithConfirmedCombinationDefinitions,
  updateBoardWithConfirmedCombinations,
} from './punishmentCombinations'

const config: PunishmentConfig = {
  tools: {
    重工具: { name: '重工具', intensity: 8, ratio: 100 },
    轻工具: { name: '轻工具', intensity: 2, ratio: 0 },
  },
  bodyParts: {
    弱部位: { name: '弱部位', sensitivity: 2, ratio: 100 },
    强部位: { name: '强部位', sensitivity: 8, ratio: 1 },
  },
  positions: {
    限定姿势: { name: '限定姿势', ratio: 100, compatibleBodyParts: ['强部位'] },
  },
  minStrikes: 5,
  maxStrikes: 10,
  step: 5,
  maxTakeoffFailures: 2,
  doublePunishmentChance: 0,
}

const deterministicRandom = {
  random: () => 0,
  randomInt: (minimum: number) => minimum,
}

describe('惩罚组合领域模块', () => {
  it('平衡分配会填满目标数量且只返回完整兼容的组合', () => {
    const definitions = generateBalancedPunishmentCombinationDefinitions(
      config,
      10,
      deterministicRandom
    )

    expect(definitions).toHaveLength(10)
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tool: expect.objectContaining({ name: '重工具' }),
          bodyPart: expect.objectContaining({ name: '强部位' }),
          position: expect.objectContaining({ name: '限定姿势' }),
        }),
      ])
    )
    expect(
      definitions.every(
        definition =>
          definition.tool.name === '重工具' &&
          definition.bodyPart.name === '强部位' &&
          definition.position.name === '限定姿势'
      )
    ).toBe(true)
  })

  it('有效三元组很少时仍按部位比例分配全部格子', () => {
    const narrowConfig: PunishmentConfig = {
      tools: { 单一工具: { name: '单一工具', intensity: 1, ratio: 100 } },
      bodyParts: {
        主要部位: { name: '主要部位', sensitivity: 1, ratio: 80 },
        次要部位: { name: '次要部位', sensitivity: 1, ratio: 20 },
      },
      positions: { 单一姿势: { name: '单一姿势', ratio: 100, compatibleBodyParts: [] } },
      minStrikes: 5,
      maxStrikes: 5,
      step: 5,
      maxTakeoffFailures: 2,
      doublePunishmentChance: 0,
    }

    const definitions = generateBalancedPunishmentCombinationDefinitions(
      narrowConfig,
      10,
      deterministicRandom
    )
    const bodyPartCounts = definitions.reduce<Record<string, number>>((counts, definition) => {
      counts[definition.bodyPart.name] = (counts[definition.bodyPart.name] ?? 0) + 1
      return counts
    }, {})

    expect(definitions).toHaveLength(10)
    expect(bodyPartCounts).toEqual({ 主要部位: 8, 次要部位: 2 })
  })

  it('兼容性过滤不会因为候选部位较少而压低工具权重', () => {
    const constrainedConfig: PunishmentConfig = {
      tools: {
        轻工具: { name: '轻工具', intensity: 1, ratio: 50 },
        重工具: { name: '重工具', intensity: 10, ratio: 50 },
      },
      bodyParts: {
        低耐受: { name: '低耐受', sensitivity: 1, ratio: 90 },
        高耐受: { name: '高耐受', sensitivity: 10, ratio: 10 },
      },
      positions: { 任意姿势: { name: '任意姿势', ratio: 100, compatibleBodyParts: [] } },
      minStrikes: 5,
      maxStrikes: 5,
      step: 5,
      maxTakeoffFailures: 2,
      doublePunishmentChance: 0,
    }

    const definitions = generateBalancedPunishmentCombinationDefinitions(
      constrainedConfig,
      20,
      deterministicRandom
    )
    const combinationCounts = definitions.reduce<Record<string, number>>((counts, definition) => {
      const key = `${definition.tool.name}/${definition.bodyPart.name}`
      counts[key] = (counts[key] ?? 0) + 1
      return counts
    }, {})

    expect(combinationCounts).toEqual({
      '轻工具/低耐受': 9,
      '轻工具/高耐受': 1,
      '重工具/高耐受': 10,
    })
  })

  it('完全兼容时同时保持工具、部位和姿势的配置比例', () => {
    const fullyCompatibleConfig: PunishmentConfig = {
      tools: {
        常见工具: { name: '常见工具', intensity: 1, ratio: 60 },
        次要工具: { name: '次要工具', intensity: 1, ratio: 40 },
      },
      bodyParts: {
        常见部位: { name: '常见部位', sensitivity: 1, ratio: 80 },
        次要部位: { name: '次要部位', sensitivity: 1, ratio: 20 },
      },
      positions: {
        常见姿势: { name: '常见姿势', ratio: 70, compatibleBodyParts: [] },
        次要姿势: { name: '次要姿势', ratio: 30, compatibleBodyParts: [] },
      },
      minStrikes: 5,
      maxStrikes: 5,
      step: 5,
      maxTakeoffFailures: 2,
      doublePunishmentChance: 0,
    }

    const definitions = generateBalancedPunishmentCombinationDefinitions(
      fullyCompatibleConfig,
      100,
      deterministicRandom
    )
    const countBy = (getName: (definition: (typeof definitions)[number]) => string) =>
      definitions.reduce<Record<string, number>>((counts, definition) => {
        const name = getName(definition)
        counts[name] = (counts[name] ?? 0) + 1
        return counts
      }, {})

    expect(countBy(definition => definition.tool.name)).toEqual({ 常见工具: 60, 次要工具: 40 })
    expect(countBy(definition => definition.bodyPart.name)).toEqual({
      常见部位: 80,
      次要部位: 20,
    })
    expect(countBy(definition => definition.position.name)).toEqual({
      常见姿势: 70,
      次要姿势: 30,
    })
  })

  it('随机组合生成也会按权重填满目标数量', () => {
    const weightedConfig: PunishmentConfig = {
      tools: { 单一工具: { name: '单一工具', intensity: 1, ratio: 100 } },
      bodyParts: {
        常见部位: { name: '常见部位', sensitivity: 1, ratio: 80 },
        稀有部位: { name: '稀有部位', sensitivity: 1, ratio: 20 },
      },
      positions: { 单一姿势: { name: '单一姿势', ratio: 100, compatibleBodyParts: [] } },
      minStrikes: 5,
      maxStrikes: 5,
      step: 5,
      maxTakeoffFailures: 2,
      doublePunishmentChance: 0,
    }
    const highQuantileRandom = {
      random: () => 0.8,
      randomInt: (minimum: number) => minimum,
    }

    const definitions = generatePunishmentCombinationDefinitions(
      weightedConfig,
      6,
      highQuantileRandom
    )

    expect(definitions).toHaveLength(6)
    expect(definitions.every(definition => definition.bodyPart.name === '稀有部位')).toBe(true)
  })

  it('写回棋盘时多样性排序不会改变确认页中的分布', () => {
    const distributionConfig: PunishmentConfig = {
      tools: { 单一工具: { name: '单一工具', intensity: 1, ratio: 100 } },
      bodyParts: {
        主要部位: { name: '主要部位', sensitivity: 1, ratio: 80 },
        次要部位: { name: '次要部位', sensitivity: 1, ratio: 20 },
      },
      positions: { 单一姿势: { name: '单一姿势', ratio: 100, compatibleBodyParts: [] } },
      minStrikes: 5,
      maxStrikes: 5,
      step: 5,
      maxTakeoffFailures: 2,
      doublePunishmentChance: 0,
    }
    const definitions = generateBalancedPunishmentCombinationDefinitions(
      distributionConfig,
      10,
      deterministicRandom
    )
    const board: BoardCell[] = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'punishment',
      effect: { type: 'punishment', value: 0, description: '待分配' },
    }))

    const updated = updateBoardWithConfirmedCombinationDefinitions(
      board,
      definitions,
      distributionConfig,
      {},
      deterministicRandom
    )
    const actualCounts = updated.reduce<Record<string, number>>((counts, cell) => {
      const name = cell.effect?.punishment?.bodyPart.name
      if (name) counts[name] = (counts[name] ?? 0) + 1
      return counts
    }, {})

    expect(actualCounts).toEqual({ 主要部位: 8, 次要部位: 2 })
  })

  it('写入动态格子时不修改调用方的棋盘或已确认动作', () => {
    const action: PunishmentAction = {
      tool: { name: '轻工具', intensity: 2, ratio: 1 },
      bodyPart: { name: '弱部位', sensitivity: 2, ratio: 1 },
      position: { name: '任意', ratio: 1, compatibleBodyParts: [] },
      strikes: 5,
      description: '原始动作',
    }
    const board: BoardCell[] = [
      {
        id: 1,
        position: 1,
        type: 'punishment',
        effect: { type: 'punishment', value: 0, description: '原始格子' },
      },
    ]

    const updated = updateBoardWithConfirmedCombinations(board, [action], {
      1: { type: 'previous_player' },
    })

    expect(updated[0]?.effect?.punishment).toMatchObject({
      dynamicType: 'previous_player',
      description: expect.stringContaining('上一个玩家'),
    })
    expect(board[0]?.effect?.punishment).toBeUndefined()
    expect(action.dynamicType).toBeUndefined()
    expect(action.description).toBe('原始动作')
  })
})
