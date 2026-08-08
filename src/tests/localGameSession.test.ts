import { describe, expect, it } from 'vitest'
import { useLocalGameSession } from '../composables/useLocalGameSession'

describe('本地对局会话', () => {
  it('只恢复卡住的移动态而不改变本局玩法和生命周期', () => {
    const session = useLocalGameSession({
      selectedMode: 'party',
      victoryConfig: {
        actionText: '测试',
        baseCount: 1,
        countUnit: '下',
        loserGradientEnabled: false,
        gradientStep: 1,
      },
    })
    session.activeMode.value = 'party'
    session.gameStarted.value = true
    session.sessionPaused.value = true
    session.gameState.gameStatus = 'moving'
    session.gameState.diceValue = 6
    session.gameState.pendingEffect = {
      type: 'move',
      value: 1,
      description: '测试效果',
    }
    session.gameState.players = [
      {
        id: 1,
        name: '玩家',
        color: '#fff',
        position: 1,
        isWinner: false,
        isMoving: true,
      },
    ]

    session.recoverStalledMovement()

    expect(session.gameState).toMatchObject({
      gameStatus: 'waiting',
      diceValue: null,
      pendingEffect: null,
      players: [{ isMoving: false }],
    })
    expect(session.activeMode.value).toBe('party')
    expect(session.gameStarted.value).toBe(true)
    expect(session.sessionPaused.value).toBe(true)
  })
})
