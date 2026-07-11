import { describe, expect, it } from 'vitest'
import { resolveRule } from '../services/ruleResolution'
import type { Player, PunishmentAction } from '../types/game'

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

const boardAction: PunishmentAction = {
  tool: { name: '皮拍', intensity: 3, ratio: 100 },
  bodyPart: { name: '臀部', sensitivity: 4, ratio: 100 },
  position: { name: '俯卧', ratio: 100, compatibleBodyParts: ['臀部'] },
  strikes: 10,
  description: '用皮拍打臀部10下，姿势：俯卧',
}

describe('规则结果解析', () => {
  it('保留棋盘上已确认的静态惩罚动作', () => {
    const result = resolveRule({
      source: 'board_punishment',
      actorIndex: 1,
      players,
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
})
