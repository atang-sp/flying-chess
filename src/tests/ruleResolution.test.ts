import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCompatiblePunishmentAction,
  resolveRule,
} from '../services/ruleResolution'
import { GameService } from '../services/gameService'
import { SecureRandom } from '../utils/secureRandom'
import type { BoardConfig, Player, PunishmentAction, PunishmentConfig } from '../types/game'

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
}

const boardConfig: BoardConfig = {
  punishmentCells: 1,
  bonusCells: 0,
  reverseCells: 0,
  restCells: 0,
  restartCells: 0,
  trapCells: 0,
  totalCells: 20,
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
    })

    expect(action.tool.name).toBe('皮拍')
    expect(action.bodyPart.name).toBe('臀部')
    expect(action.position.name).toBe('仰卧')
    expect(action.strikes).toBe(5)
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
      expect(action?.bodyPart.sensitivity).toBeGreaterThanOrEqual(action?.tool.intensity ?? Infinity)
      expect(
        action?.position.compatibleBodyParts.length === 0 ||
          action?.position.compatibleBodyParts.includes(action?.bodyPart.name ?? '')
      ).toBe(true)
      expect((action?.strikes ?? 0) % compatibilityConfig.step).toBe(0)
    }
  })
})
