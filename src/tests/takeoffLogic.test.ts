import { describe, it, expect, beforeEach } from 'vitest'
import { GameService } from '../services/gameService'
import type { Player, PunishmentConfig, BoardCell } from '../types/game'

describe('起飞逻辑测试', () => {
  let player: Player
  let punishmentConfig: PunishmentConfig
  let board: BoardCell[]

  beforeEach(() => {
    // 创建测试玩家
    player = {
      id: 1,
      name: '测试玩家',
      color: '#ff6b6b',
      position: 0,
      isWinner: false,
      hasTakenOff: false,
      failedTakeoffAttempts: 0,
    }

    // 创建测试惩罚配置
    punishmentConfig = {
      tools: {
        手掌: { name: '手掌', intensity: 2, ratio: 100 },
      },
      bodyParts: {
        屁股: { name: '屁股', sensitivity: 3, ratio: 100 },
      },
      positions: {
        站立: { name: '站立', ratio: 100 },
      },
      minStrikes: 5,
      maxStrikes: 15,
      step: 5,
      maxTakeoffFailures: 5, // 设置最大失败次数为5
    }

    // 创建简单的测试棋盘
    board = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      type: 'punishment' as const,
      position: i,
      effect: {
        type: 'punishment' as const,
        value: 1,
        description: '测试格子',
      },
    }))
  })

  it('应该在掷到6点时成功起飞', () => {
    const result = GameService.movePlayer(player, 6, board, 0, 1, punishmentConfig)

    expect(player.hasTakenOff).toBe(true)
    expect(player.failedTakeoffAttempts).toBe(0)
    expect(result.newPosition).toBe(1)
    expect(result.canTakeOff).toBe(true)
    expect(result.effect).toContain('起飞成功')
  })

  it('应该在未掷到6点时记录失败次数', () => {
    const result = GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)

    expect(player.hasTakenOff).toBe(false)
    expect(player.failedTakeoffAttempts).toBe(1)
    expect(result.newPosition).toBe(0)
    expect(result.punishment).toBeDefined()
  })

  it('应该在连续失败5次后强制起飞', () => {
    // 模拟连续4次失败
    for (let i = 0; i < 4; i++) {
      GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)
      expect(player.failedTakeoffAttempts).toBe(i + 1)
      expect(player.hasTakenOff).toBe(false)
    }

    // 第5次失败应该触发强制起飞
    const result = GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)

    expect(player.hasTakenOff).toBe(true)
    expect(player.failedTakeoffAttempts).toBe(0)
    expect(result.newPosition).toBe(1)
    expect(result.forcedTakeoffDueToFailure).toBe(true)
    expect(result.effect).toContain('连续5次未起飞，自动起飞')
  })

  it('应该在不同的最大失败次数设置下正确工作', () => {
    // 设置最大失败次数为3
    punishmentConfig.maxTakeoffFailures = 3

    // 模拟连续2次失败
    for (let i = 0; i < 2; i++) {
      GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)
      expect(player.failedTakeoffAttempts).toBe(i + 1)
      expect(player.hasTakenOff).toBe(false)
    }

    // 第3次失败应该触发强制起飞
    const result = GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)

    expect(player.hasTakenOff).toBe(true)
    expect(player.failedTakeoffAttempts).toBe(0)
    expect(result.newPosition).toBe(1)
    expect(result.forcedTakeoffDueToFailure).toBe(true)
    expect(result.effect).toContain('连续3次未起飞，自动起飞')
  })

  it('应该在起飞成功后重置失败计数器', () => {
    // 先失败几次
    for (let i = 0; i < 3; i++) {
      GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)
    }
    expect(player.failedTakeoffAttempts).toBe(3)

    // 然后成功起飞
    const result = GameService.movePlayer(player, 6, board, 0, 1, punishmentConfig)

    expect(player.hasTakenOff).toBe(true)
    expect(player.failedTakeoffAttempts).toBe(0)
    expect(result.canTakeOff).toBe(true)
  })

  it('应该在maxTakeoffFailures为undefined时不触发强制起飞', () => {
    punishmentConfig.maxTakeoffFailures = undefined as any

    // 即使失败很多次也不应该强制起飞
    for (let i = 0; i < 10; i++) {
      const result = GameService.movePlayer(player, 3, board, 0, 1, punishmentConfig)
      expect(player.hasTakenOff).toBe(false)
      expect(player.failedTakeoffAttempts).toBe(i + 1)
      expect(result.forcedTakeoffDueToFailure).toBeUndefined()
    }
  })

  it('应该在已经起飞的玩家正常移动', () => {
    // 先让玩家起飞
    player.hasTakenOff = true
    player.position = 1

    const result = GameService.movePlayer(player, 4, board, 0, 1, punishmentConfig)

    expect(result.newPosition).toBe(5) // 1 + 4 = 5
    expect(result.punishment).toBeUndefined()
  })
})
