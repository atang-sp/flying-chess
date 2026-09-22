import { describe, expect, it } from 'vitest'
import { GameService } from '../services/gameService'
import { GAME_CONFIG } from '../config/gameConfig'
import type { TrapAction } from '@flying-chess/game-core/types'

describe('一键快速开局与经典对局优先机制', () => {
  it('经典模式快速开局直接生成棋盘与平衡惩罚，进入就绪等待态', () => {
    const punishmentConfig = GameService.createPunishmentConfig()
    const boardConfig = GameService.createBoardConfig()
    const traps: TrapAction[] = GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)

    // 4人经典标准对局快速开局
    const players = GameService.createCustomPlayers(4, ['红方', '黄方', '蓝方', '绿方'])
    expect(players).toHaveLength(4)
    expect(players[0].name).toBe('红方')
    expect(players[3].name).toBe('绿方')

    // 生成棋盘
    const board = GameService.createBoard(punishmentConfig, boardConfig, traps)
    const punishmentCells = board.filter(cell => cell.type === 'punishment')
    expect(punishmentCells.length).toBeGreaterThan(0)

    // 生成并应用平衡惩罚组合
    const combinations = GameService.generateBalancedPunishmentCombinationDefinitions(
      punishmentConfig,
      punishmentCells.length
    )
    expect(combinations.length).toBe(punishmentCells.length)

    const updatedBoard = GameService.updateBoardWithConfirmedCombinationDefinitions(
      board,
      combinations,
      punishmentConfig
    )

    // 验证所有惩罚格子均已被赋予惩罚描述与规则
    const updatedPunishmentCells = updatedBoard.filter(cell => cell.type === 'punishment')
    for (const cell of updatedPunishmentCells) {
      expect(cell.effect?.punishment).toBeDefined()
      expect(cell.effect?.punishment?.description).toBeTruthy()
    }
  })

  it('经典双人极速局快速开局生成2人对决棋盘', () => {
    const punishmentConfig = GameService.createPunishmentConfig()
    const boardConfig = GameService.createBoardConfig()
    const traps: TrapAction[] = GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)

    const players = GameService.createCustomPlayers(2, ['玩家1', '玩家2'])
    expect(players).toHaveLength(2)

    const board = GameService.createBoard(punishmentConfig, boardConfig, traps)
    const punishmentCells = board.filter(cell => cell.type === 'punishment')

    const combinations = GameService.generateBalancedPunishmentCombinationDefinitions(
      punishmentConfig,
      punishmentCells.length
    )
    const updatedBoard = GameService.updateBoardWithConfirmedCombinationDefinitions(
      board,
      combinations,
      punishmentConfig
    )

    expect(updatedBoard.length).toBe(boardConfig.totalCells)
    expect(players.every(p => p.position === 0 && !p.isMoving)).toBe(true)
  })
})
