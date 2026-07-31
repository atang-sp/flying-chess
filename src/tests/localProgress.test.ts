import { describe, expect, it } from 'vitest'
import {
  createLocalProgress,
  getLocalAchievements,
  getShameWall,
  getUnlockedPartyContent,
  recordLocalProgress,
  validateLocalProgress,
} from '../services/localProgress'

describe('本地跨局进度与成就', () => {
  it('累计惩罚、求饶、连锁和完成局数并生成耻辱墙', () => {
    let progress = createLocalProgress()
    progress = recordLocalProgress(progress, {
      kind: 'punishment_completed',
      playerName: '小红',
      count: 12,
      variant: 'blindbox',
    })
    progress = recordLocalProgress(progress, { kind: 'mercy_requested', playerName: '小红' })
    progress = recordLocalProgress(progress, { kind: 'chain_recorded', length: 3 })
    progress = recordLocalProgress(progress, { kind: 'game_completed' })

    expect(progress.totals).toMatchObject({
      completedGames: 1,
      punishmentCount: 12,
      mercyRequests: 1,
      longestChain: 3,
    })
    expect(getShameWall(progress)[0]).toMatchObject({ playerName: '小红', punishmentCount: 12 })
  })

  it('按明确阈值解锁成就、小游戏机关和进阶变体', () => {
    let progress = createLocalProgress()
    progress = recordLocalProgress(progress, { kind: 'game_completed' })
    expect(getUnlockedPartyContent(progress).punishmentVariants).not.toContain('encore')
    progress = recordLocalProgress(progress, { kind: 'game_completed' })
    progress = recordLocalProgress(progress, { kind: 'chain_recorded', length: 3 })
    for (let index = 0; index < 3; index += 1) {
      progress = recordLocalProgress(progress, {
        kind: 'punishment_completed',
        playerName: '小蓝',
        count: 10,
        variant: index === 0 ? 'deferred' : undefined,
      })
    }

    expect(
      getLocalAchievements(progress)
        .filter(item => item.unlocked)
        .map(item => item.id)
    ).toEqual(expect.arrayContaining(['first_game', 'chain_three', 'endurance_30']))
    expect(getUnlockedPartyContent(progress)).toMatchObject({
      punishmentVariants: expect.arrayContaining(['deferred', 'mutual']),
      miniGameTraps: expect.arrayContaining(['mini_game_memory', 'mini_game_quiz']),
    })
    expect(getUnlockedPartyContent(progress).punishmentVariants).toContain('encore')
  })

  it('拒绝损坏或未来版本的本地进度缓存', () => {
    expect(validateLocalProgress(createLocalProgress())).toBe(true)
    expect(validateLocalProgress({ version: 99 })).toBe(false)
    expect(
      validateLocalProgress({ ...createLocalProgress(), totals: { punishmentCount: -1 } })
    ).toBe(false)
  })
})
