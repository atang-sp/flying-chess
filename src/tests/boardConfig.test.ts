import { describe, expect, it } from 'vitest'
import { GameService } from '../services/gameService'
import type { BoardConfig } from '../types/game'

const createValidConfig = (): BoardConfig => ({
  punishmentCells: 28,
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
})
