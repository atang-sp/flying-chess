import { describe, expect, it } from 'vitest'
import { GameService } from '../services/gameService'
import type { BoardConfig } from '@flying-chess/game-core/types'
import {
  createModeConfig,
  createStandardConfigSnapshot,
  validateBoardConfig,
} from '@flying-chess/game-core/config'

const createValidConfig = (): BoardConfig => ({
  punishmentCells: 28,
  chainPunishmentCells: 0,
  bonusCells: 1,
  reverseCells: 2,
  restCells: 1,
  restartCells: 4,
  trapCells: 2,
  totalCells: 40,
})

describe('棋盘配置校验', () => {
  it('为起点和终点保留两个不可分配格子', () => {
    const config: BoardConfig = {
      punishmentCells: 30,
      chainPunishmentCells: 0,
      bonusCells: 1,
      reverseCells: 2,
      restCells: 1,
      restartCells: 4,
      trapCells: 2,
      totalCells: 40,
    }

    expect(GameService.validateBoardConfig(config)).toBe(false)
  })

  it('拒绝静默截断无效棋盘配置', () => {
    const config = createValidConfig()
    config.trapCells += 1

    expect(() => GameService.createBoard(undefined, config)).toThrowError('棋盘配置无效')
  })

  it.each([19, 101, 40.5])('拒绝不支持的总格子数 %s', totalCells => {
    const config = createValidConfig()
    config.totalCells = totalCells

    expect(GameService.validateBoardConfig(config)).toBe(false)
  })

  it('接受默认棋盘配置', () => {
    expect(GameService.validateBoardConfig(createValidConfig())).toBe(true)
  })

  it.each([
    [
      20,
      {
        punishmentCells: 12,
        chainPunishmentCells: 1,
        bonusCells: 1,
        reverseCells: 1,
        restCells: 0,
        restartCells: 2,
        trapCells: 1,
        totalCells: 20,
      },
    ],
    [
      40,
      {
        punishmentCells: 26,
        chainPunishmentCells: 2,
        bonusCells: 1,
        reverseCells: 2,
        restCells: 1,
        restartCells: 4,
        trapCells: 2,
        totalCells: 40,
      },
    ],
    [
      80,
      {
        punishmentCells: 53,
        chainPunishmentCells: 5,
        bonusCells: 2,
        reverseCells: 4,
        restCells: 2,
        restartCells: 8,
        trapCells: 4,
        totalCells: 80,
      },
    ],
    [
      100,
      {
        punishmentCells: 67,
        chainPunishmentCells: 7,
        bonusCells: 2,
        reverseCells: 5,
        restCells: 2,
        restartCells: 10,
        trapCells: 5,
        totalCells: 100,
      },
    ],
  ] as const)('为 %s 格棋盘稳定分配目标比例', (totalCells, expected) => {
    expect(GameService.createAutoBoardConfig(totalCells)).toEqual(expected)
  })

  it('自动分配保留问答和大冒险格子', () => {
    const config = GameService.createAutoBoardConfig(30, { qaCells: 5, dareCells: 3 })

    expect(config.qaCells).toBe(5)
    expect(config.dareCells).toBe(3)
    expect(validateBoardConfig(config)).toBe(true)
  })

  it('较小的标准棋盘进入 Party 时仍保持合法且不污染标准快照', () => {
    const standard = createStandardConfigSnapshot({
      boardConfig: {
        totalCells: 30,
        punishmentCells: 18,
        chainPunishmentCells: 1,
        bonusCells: 1,
        reverseCells: 1,
        restCells: 1,
        restartCells: 2,
        trapCells: 1,
      },
    })
    const party = createModeConfig('party', standard)

    expect(validateBoardConfig(party.boardConfig)).toBe(true)
    expect(standard.boardConfig).toMatchObject({ totalCells: 30, punishmentCells: 18 })
  })

  it('本地 Party 棋盘和后续连锁惩罚都使用暖场阶段约束', () => {
    const party = createModeConfig('party', createStandardConfigSnapshot())
    const board = GameService.createBoard(
      party.punishmentConfig,
      party.boardConfig,
      party.traps,
      undefined,
      undefined,
      party
    )
    const boardPunishment = board.find(cell => cell.type === 'punishment')?.effect?.punishment
    const chainPunishment = GameService.generateRandomPunishment(
      party.punishmentConfig,
      party.stageConstraints.warmup
    )
    const actions = [boardPunishment, chainPunishment]

    for (const action of actions) {
      expect(action).toBeDefined()
      expect(action?.tool.intensity).toBeLessThanOrEqual(3)
      expect(action?.strikes).toBeGreaterThanOrEqual(5)
      expect(action?.strikes).toBeLessThanOrEqual(15)
    }
  })
})
