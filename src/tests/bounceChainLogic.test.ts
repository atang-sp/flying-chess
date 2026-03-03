import { describe, it, expect } from 'vitest'
import { GameService } from '../services/gameService'
import type { BoardCell, Player, PunishmentAction, PunishmentConfig } from '../types/game'

const createBaseBoard = (size: number): BoardCell[] => {
  return Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    type: 'bonus',
    position: i + 1,
    effect: {
      type: 'move',
      value: 0,
      description: i + 1 === size ? '终点' : '普通格',
    },
  }))
}

const createPlayer = (position: number): Player => ({
  id: 1,
  name: '测试玩家',
  color: '#ff6b6b',
  position,
  isWinner: false,
  hasTakenOff: true,
  failedTakeoffAttempts: 0,
})

const createPunishmentAction = (): PunishmentAction => ({
  tool: { name: '手掌', intensity: 1, ratio: 100 },
  bodyPart: { name: '屁股', sensitivity: 1, ratio: 100 },
  position: { name: '站立', ratio: 100, compatibleBodyParts: [] },
  strikes: 5,
  description: '测试惩罚',
})

const getCellEffect = (board: BoardCell[], position: number) =>
  board.find(cell => cell.position === position)?.effect

const isChainEffect = (effect: BoardCell['effect'] | undefined): boolean => {
  if (!effect) return false
  return (
    effect.type === 'move' ||
    effect.type === 'reverse' ||
    effect.type === 'restart' ||
    effect.type === 'rest'
  )
}

describe('反弹与连锁规则回归', () => {
  it('反弹后落到惩罚格时，落点惩罚可被继续结算', () => {
    const boardSize = 40
    const board = createBaseBoard(boardSize)
    const punishment = createPunishmentAction()

    // 39 + 4 = 43，超出 3 格，反弹到 37
    board[36] = {
      id: 37,
      type: 'punishment',
      position: 37,
      effect: {
        type: 'punishment',
        value: 0,
        description: punishment.description,
        punishment,
      },
    }

    const player = createPlayer(39)
    const config: PunishmentConfig = GameService.createPunishmentConfig()
    const result = GameService.movePlayer(player, 4, board, 0, 2, config)

    expect(result.cellEffect?.type).toBe('bounce')
    expect(result.newPosition).toBe(37)

    const landingCell = board.find(cell => cell.position === result.newPosition)
    expect(landingCell?.effect?.type).toBe('punishment')
    expect(landingCell?.effect?.punishment?.description).toBe('测试惩罚')
  })

  it('反弹后落在移动格时，会继续触发下一跳效果', () => {
    const board = createBaseBoard(10)

    // 9 + 4 = 13，超出 3 格，反弹到 7
    board[6] = {
      id: 7,
      type: 'special',
      position: 7,
      effect: {
        type: 'move',
        value: 2,
        description: '前进2步',
      },
    }
    board[8] = {
      id: 9,
      type: 'special',
      position: 9,
      effect: {
        type: 'reverse',
        value: 1,
        description: '后退1步',
      },
    }

    const player = createPlayer(9)
    const config: PunishmentConfig = GameService.createPunishmentConfig()
    const bounceResult = GameService.movePlayer(player, 4, board, 0, 2, config)

    expect(bounceResult.cellEffect?.type).toBe('bounce')
    expect(bounceResult.newPosition).toBe(7)

    player.position = bounceResult.newPosition
    const landingEffect = getCellEffect(board, player.position)
    expect(landingEffect?.type).toBe('move')

    const firstChainResult = GameService.processCellEffect(player, landingEffect, board.length)
    player.position = firstChainResult.newPosition

    const secondLandingEffect = getCellEffect(board, player.position)
    expect(secondLandingEffect?.type).toBe('reverse')
  })

  it('连锁循环在 5 次上限时会终止', () => {
    const board = createBaseBoard(40)

    // 构造循环：10(前进1) -> 11(后退1) -> 10 ...
    board[9] = {
      id: 10,
      type: 'bonus',
      position: 10,
      effect: {
        type: 'move',
        value: 1,
        description: '前进1步',
      },
    }
    board[10] = {
      id: 11,
      type: 'special',
      position: 11,
      effect: {
        type: 'reverse',
        value: 1,
        description: '后退1步',
      },
    }

    const player = createPlayer(9)
    const config: PunishmentConfig = GameService.createPunishmentConfig()
    const firstMove = GameService.movePlayer(player, 1, board, 0, 2, config)
    player.position = firstMove.newPosition

    const MAX_CHAIN = 5
    let chainCount = 0
    let chainStoppedByGuard = false
    let currentEffect = firstMove.cellEffect

    while (isChainEffect(currentEffect)) {
      if (chainCount >= MAX_CHAIN) {
        chainStoppedByGuard = true
        break
      }

      chainCount++
      const processed = GameService.processCellEffect(player, currentEffect, board.length)
      player.position = processed.newPosition
      currentEffect = board.find(cell => cell.position === player.position)?.effect
    }

    expect(chainStoppedByGuard).toBe(true)
    expect(chainCount).toBe(MAX_CHAIN)
    expect([10, 11]).toContain(player.position)
  })
})
