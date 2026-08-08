import { describe, expect, it } from 'vitest'
import { createPartySession } from '@flying-chess/game-core/party-mode'
import { recordPartyMomentum } from '@flying-chess/game-core/party-momentum'
import { createLocalPartyMomentumCompletion } from '../services/localPartyMomentum'

describe('本地 Party Momentum 完成适配层', () => {
  it('打开惩罚流程不计热度，最终完成只产出一次事件', () => {
    const adapter = createLocalPartyMomentumCompletion()
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    adapter.begin({ participantPlayerIndices: [1], amplified: false, chain: false })
    expect(session.heat).toBe(0)

    const event = adapter.complete()
    if (event) session = recordPartyMomentum(session, event)
    const replay = adapter.complete()
    if (replay) session = recordPartyMomentum(session, replay)

    expect(session).toMatchObject({ heat: 5, heatContributionByPlayer: [0, 5] })
    expect(replay).toBeNull()
  })

  it('延迟入队不计热度，恢复并最终完成后才记录', () => {
    const adapter = createLocalPartyMomentumCompletion()
    let session = createPartySession({ playerCount: 2, startedAt: 0 })

    adapter.begin({ participantPlayerIndices: [0], amplified: true, chain: false })
    const deferred = adapter.defer()
    expect(adapter.complete()).toBeNull()
    expect(session.heat).toBe(0)

    if (!deferred) throw new Error('expected deferred momentum context')
    adapter.resume(deferred)
    const event = adapter.complete()
    if (event) session = recordPartyMomentum(session, event)

    expect(session).toMatchObject({ heat: 8, heatContributionByPlayer: [8, 0] })
  })

  it('合并双向参与者并保留加码和连锁结构化标记', () => {
    const adapter = createLocalPartyMomentumCompletion()
    adapter.begin({ participantPlayerIndices: [2], amplified: false, chain: true })
    adapter.markAmplified()
    adapter.includeParticipants([0, 2])

    expect(adapter.complete()).toEqual({
      type: 'punishment_completed',
      participantPlayerIndices: [0, 2],
      amplified: true,
      chain: true,
      mutual: true,
    })
  })

  it('Classic 未初始化适配流程时完全不产生 Momentum 事件', () => {
    const adapter = createLocalPartyMomentumCompletion()

    expect(adapter.complete()).toBeNull()
    expect(adapter.defer()).toBeNull()
  })
})
