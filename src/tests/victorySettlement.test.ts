import { describe, expect, it } from 'vitest'
import { resolveVictorySettlement } from '../services/victorySettlement'
import type { Player, VictoryConfig } from '../types/game'

const players: Player[] = [
  { id: 1, name: '冠军', color: '#ef4444', position: 40, isWinner: true },
  { id: 2, name: '第二名', color: '#3b82f6', position: 28, isWinner: false },
  { id: 3, name: '并列第二', color: '#22c55e', position: 28, isWinner: false },
  { id: 4, name: '最后一名', color: '#eab308', position: 7, isWinner: false },
]

const config: VictoryConfig = {
  actionText: '用手掌打屁股',
  baseCount: 5,
  countUnit: '下',
  loserGradientEnabled: true,
  gradientStep: 5,
}

describe('终局奖惩结算', () => {
  it('按进度档位递增惩罚且并列玩家保持同档', () => {
    const settlement = resolveVictorySettlement(players, 0, config)

    expect(settlement).toEqual([
      { playerIndex: 1, place: 2, count: 5 },
      { playerIndex: 2, place: 2, count: 5 },
      { playerIndex: 3, place: 3, count: 10 },
    ])
  })

  it('关闭梯度时所有败者都使用基础次数', () => {
    expect(
      resolveVictorySettlement(players, 0, { ...config, loserGradientEnabled: false })
    ).toEqual([
      { playerIndex: 1, place: 2, count: 5 },
      { playerIndex: 2, place: 2, count: 5 },
      { playerIndex: 3, place: 3, count: 5 },
    ])
  })
})
