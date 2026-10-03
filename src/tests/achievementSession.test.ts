import { describe, expect, it } from 'vitest'
import { useAchievementSession } from '../composables/useAchievementSession'
import { createLocalProgress, recordLocalProgress } from '../services/localProgress'

describe('gameplay achievement notifications', () => {
  it('does not replay historical or cloud-loaded thresholds on the next local event', () => {
    const session = useAchievementSession()
    const historical = {
      ...createLocalProgress(),
      totals: { ...createLocalProgress().totals, completedGames: 10, punishmentCount: 100 },
    }
    session.record(historical, recordLocalProgress(historical, { kind: 'game_completed' }))
    expect(session.unlocked.value).toEqual([])
    expect(session.pending.value).toEqual([])
  })

  it('groups simultaneous threshold crossings and suppresses duplicate gameplay callbacks', () => {
    const session = useAchievementSession()
    const before = createLocalProgress()
    const after = recordLocalProgress(before, {
      kind: 'punishment_completed',
      playerName: 'A',
      count: 100,
    })
    session.record(before, after)
    expect(session.unlocked.value.map(item => item.id)).toEqual([
      'endurance_30',
      'endurance_100',
      'unlucky',
    ])
    session.pending.value = []
    session.record(before, after)
    expect(session.pending.value).toEqual([])
    expect(session.unlocked.value).toHaveLength(3)
  })

  it('clears in-session achievements on a new game or account change', () => {
    const session = useAchievementSession()
    const before = createLocalProgress()
    const after = recordLocalProgress(before, { kind: 'game_completed' })
    session.record(before, after)
    session.reset()
    expect(session.unlocked.value).toEqual([])
    expect(session.pending.value).toEqual([])
    session.record(after, recordLocalProgress(after, { kind: 'game_completed' }))
    expect(session.unlocked.value).toEqual([])
  })
})
