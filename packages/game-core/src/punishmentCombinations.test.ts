import { describe, expect, it } from 'vitest'
import type { BoardCell, PunishmentAction, PunishmentConfig } from './domainTypes'
import {
  generateBalancedPunishmentCombinationDefinitions,
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
  it('平衡分配仍只返回强度与姿势完整兼容的组合', () => {
    const definitions = generateBalancedPunishmentCombinationDefinitions(
      config,
      10,
      deterministicRandom
    )

    expect(definitions).toHaveLength(1)
    expect(definitions[0]).toMatchObject({
      tool: { name: '重工具' },
      bodyPart: { name: '强部位' },
      position: { name: '限定姿势' },
    })
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
