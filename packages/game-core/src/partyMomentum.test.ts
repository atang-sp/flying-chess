import { describe, expect, it } from 'vitest'
import {
  beginPartyTurn,
  completePartyTurn,
  createPartySession,
  decidePartyReaction,
  resolvePartyReactionRoll,
  submitPartyPrediction,
  type PartySession,
} from './partyMode'
import {
  PARTY_STARTING_TOKENS,
  isPartyPunishmentCompleted,
  recordPartyMomentum,
  removePartyMomentumPlayer,
} from './partyMomentum'

describe('Party Momentum', () => {
  it('only treats a positive fixed punishment count as an actual completion', () => {
    expect(isPartyPunishmentCompleted({ count: { kind: 'fixed', value: 1 } })).toBe(true)
    expect(isPartyPunishmentCompleted({ count: { kind: 'fixed', value: 0 } })).toBe(false)
    expect(
      isPartyPunishmentCompleted({
        count: {
          kind: 'awaiting_external_count',
          minimum: 1,
          maximum: 10,
          step: 1,
          eligibleChooserIndices: [1],
        },
      })
    ).toBe(false)
  })

  it('starts every player at zero contribution and one renewable token', () => {
    const session = createPartySession({ playerCount: 3, startedAt: 0 })

    expect(session).toMatchObject({
      heat: 0,
      heatLimitPending: false,
      heatContributionByPlayer: [0, 0, 0],
      tokensRemaining: [PARTY_STARTING_TOKENS, PARTY_STARTING_TOKENS, PARTY_STARTING_TOKENS],
    })
  })

  it('adds five heat for a completed ordinary punishment', () => {
    const session = recordPartyMomentum(createPartySession({ playerCount: 2, startedAt: 0 }), {
      type: 'punishment_completed',
      participantPlayerIndices: [1],
      amplified: false,
      chain: false,
      mutual: false,
    })

    expect(session.heat).toBe(5)
    expect(session.heatContributionByPlayer).toEqual([0, 5])
    expect(session.tokensRemaining).toEqual([1, 1])
  })

  it('adds the fixed amplification bonus for an amplified punishment', () => {
    const session = recordPartyMomentum(createPartySession({ playerCount: 2, startedAt: 0 }), {
      type: 'punishment_completed',
      participantPlayerIndices: [0],
      amplified: true,
      chain: false,
      mutual: false,
    })

    expect(session.heat).toBe(8)
  })

  it('adds the fixed chain bonus only after a chain punishment completes', () => {
    const session = recordPartyMomentum(createPartySession({ playerCount: 2, startedAt: 0 }), {
      type: 'punishment_completed',
      participantPlayerIndices: [0],
      amplified: false,
      chain: true,
      mutual: false,
    })

    expect(session.heat).toBe(7)
  })

  it('caps an amplified chain mutual completion at twelve heat', () => {
    const session = recordPartyMomentum(createPartySession({ playerCount: 2, startedAt: 0 }), {
      type: 'punishment_completed',
      participantPlayerIndices: [0, 1],
      amplified: true,
      chain: true,
      mutual: true,
    })

    expect(session.heat).toBe(12)
  })

  it('deduplicates and sorts participants before deterministic remainder allocation', () => {
    const session = recordPartyMomentum(createPartySession({ playerCount: 3, startedAt: 0 }), {
      type: 'punishment_completed',
      participantPlayerIndices: [2, 0, 1, 2],
      amplified: false,
      chain: false,
      mutual: true,
    })

    expect(session.heat).toBe(7)
    expect(session.heatContributionByPlayer).toEqual([3, 2, 2])
  })

  it('allocates only the accepted increment when heat rises from 99 to 100', () => {
    const initial = createPartySession({ playerCount: 2, startedAt: 0 })
    const session = recordPartyMomentum(
      {
        ...initial,
        heat: 99,
        heatContributionByPlayer: [99, 0],
      },
      {
        type: 'punishment_completed',
        participantPlayerIndices: [1, 0],
        amplified: true,
        chain: true,
        mutual: true,
      }
    )

    expect(session).toMatchObject({
      heat: 100,
      heatContributionByPlayer: [100, 0],
      heatLimitPending: true,
    })
    expect(session.heatContributionByPlayer.reduce((total, value) => total + value, 0)).toBe(
      session.heat
    )
  })

  it('adds two heat and renews one token for a successful reaction', () => {
    const initial = createPartySession({ playerCount: 2, startedAt: 0 })
    const session = recordPartyMomentum(
      { ...initial, tokensRemaining: [1, 0] },
      { type: 'successful_reaction', playerIndex: 1 }
    )

    expect(session).toMatchObject({
      heat: 2,
      heatContributionByPlayer: [0, 2],
      tokensRemaining: [1, 1],
    })
  })

  it('caps tokens at three while still rewarding events after heat reaches 100', () => {
    const initial = createPartySession({ playerCount: 2, startedAt: 0 })
    const fullHeat = {
      ...initial,
      heat: 100,
      heatContributionByPlayer: [100, 0],
      heatLimitPending: true,
      tokensRemaining: [1, 2],
    }

    const rewarded = recordPartyMomentum(fullHeat, {
      type: 'successful_reaction',
      playerIndex: 1,
    })
    const capped = recordPartyMomentum(rewarded, {
      type: 'successful_reaction',
      playerIndex: 1,
    })

    expect(rewarded).toMatchObject({
      heat: 100,
      heatContributionByPlayer: [100, 0],
      tokensRemaining: [1, 3],
    })
    expect(capped.tokensRemaining).toEqual([1, 3])
  })

  it('renews one token for each actual participant in a strengthened punishment', () => {
    const initial = createPartySession({ playerCount: 3, startedAt: 0 })
    const session = recordPartyMomentum(
      { ...initial, tokensRemaining: [0, 1, 3] },
      {
        type: 'punishment_completed',
        participantPlayerIndices: [2, 0],
        amplified: false,
        chain: true,
        mutual: false,
      }
    )

    expect(session.tokensRemaining).toEqual([1, 1, 3])
  })

  it('preserves global heat when an active seat leaves by merging its contribution forward', () => {
    const initial = createPartySession({ playerCount: 3, startedAt: 0 })
    const session = removePartyMomentumPlayer(
      {
        ...initial,
        heat: 9,
        heatContributionByPlayer: [2, 3, 4],
        tokensRemaining: [1, 2, 3],
      },
      1
    )

    expect(session).toMatchObject({
      playerCount: 2,
      heat: 9,
      heatContributionByPlayer: [2, 7],
      tokensRemaining: [1, 3],
    })
  })

  it('rejects invalid players and scores without partially updating the input', () => {
    const session = createPartySession({ playerCount: 2, startedAt: 0 })
    const snapshot = JSON.stringify(session)
    const event = {
      type: 'punishment_completed' as const,
      participantPlayerIndices: [0],
      amplified: false,
      chain: false,
      mutual: false,
    }

    expect(() => recordPartyMomentum(session, { ...event, participantPlayerIndices: [] })).toThrow(
      '至少需要一名'
    )
    expect(() =>
      recordPartyMomentum(session, { ...event, participantPlayerIndices: [-1] })
    ).toThrow('无效玩家索引')
    expect(() =>
      recordPartyMomentum(session, {
        type: 'successful_reaction',
        playerIndex: Number.NaN,
      })
    ).toThrow('无效玩家索引')
    expect(() => recordPartyMomentum({ ...session, heat: Number.NaN }, event)).toThrow('0–100')
    expect(() =>
      recordPartyMomentum({ ...session, heat: -1, heatContributionByPlayer: [-1, 0] }, event)
    ).toThrow()
    expect(() =>
      recordPartyMomentum({ ...session, heat: 1, heatContributionByPlayer: [0, 0] }, event)
    ).toThrow('贡献总和')
    expect(() => recordPartyMomentum({ ...session, heatLimitPending: true }, event)).toThrow(
      '终局等待状态'
    )
    expect(JSON.stringify(session)).toBe(snapshot)
  })

  it('records a correct reaction only after the reactor decides and ignores an incorrect prediction', () => {
    let successful = beginPartyTurn(createPartySession({ playerCount: 2, startedAt: 0 }), 0)
    successful = submitPartyPrediction(successful, { playerIndex: 1, prediction: 'low' })
    successful = resolvePartyReactionRoll(successful, 2)
    expect(successful).toMatchObject({ heat: 0, tokensRemaining: [1, 1] })

    successful = decidePartyReaction(successful, { playerIndex: 1, decision: 'keep' })
    expect(successful).toMatchObject({
      heat: 2,
      heatContributionByPlayer: [0, 2],
      tokensRemaining: [1, 2],
    })

    let incorrect = beginPartyTurn(createPartySession({ playerCount: 2, startedAt: 0 }), 0)
    incorrect = submitPartyPrediction(incorrect, { playerIndex: 1, prediction: 'high' })
    incorrect = resolvePartyReactionRoll(incorrect, 2)
    expect(incorrect).toMatchObject({
      heat: 0,
      heatContributionByPlayer: [0, 0],
      tokensRemaining: [1, 1],
    })
  })

  it('waits for a complete round boundary before heat advances the act', () => {
    let session = createPartySession({ playerCount: 2, startedAt: 0 })
    for (let index = 0; index < 6; index += 1) {
      session = recordPartyMomentum(session, {
        type: 'punishment_completed',
        participantPlayerIndices: [0],
        amplified: false,
        chain: false,
        mutual: false,
      })
    }

    expect(session).toMatchObject({ heat: 30, act: 'warmup' })
    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    expect(session.act).toBe('warmup')
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    expect(session.act).toBe('heating')
  })

  it('advances at 70 only on a round boundary and never regresses an attained act', () => {
    let session: PartySession = {
      ...createPartySession({ playerCount: 2, startedAt: 0 }),
      heat: 70,
      heatContributionByPlayer: [70, 0],
      act: 'heating' as const,
    }

    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    expect(session.act).toBe('heating')
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    expect(session.act).toBe('finale')

    session = {
      ...session,
      heat: 0,
      heatContributionByPlayer: [0, 0],
    }
    session = completePartyTurn(session, { playerIndex: 0, now: 3 })
    session = completePartyTurn(session, { playerIndex: 1, now: 4 })
    expect(session.act).toBe('finale')
  })

  it('marks heat 100 pending immediately but ends only after the current round completes', () => {
    const initial = createPartySession({ playerCount: 2, startedAt: 0 })
    let session: PartySession = recordPartyMomentum(
      { ...initial, heat: 99, heatContributionByPlayer: [99, 0] },
      { type: 'successful_reaction', playerIndex: 1 }
    )

    expect(session).toMatchObject({ heat: 100, heatLimitPending: true, shouldEnd: false })
    session = completePartyTurn(session, { playerIndex: 0, now: 1 })
    expect(session.shouldEnd).toBe(false)
    session = completePartyTurn(session, { playerIndex: 1, now: 2 })
    expect(session.shouldEnd).toBe(true)
  })

  it('coalesces simultaneous time and heat limits into one round-boundary end state', () => {
    const minute = 60_000
    const initial = createPartySession({ playerCount: 2, startedAt: 0 })
    let session: PartySession = {
      ...initial,
      heat: 100,
      heatContributionByPlayer: [50, 50],
      heatLimitPending: true,
    }

    session = completePartyTurn(session, { playerIndex: 0, now: 21 * minute })
    expect(session).toMatchObject({
      heatLimitPending: true,
      timeLimitPending: true,
      shouldEnd: false,
    })
    session = completePartyTurn(session, { playerIndex: 1, now: 21 * minute })
    expect(session).toMatchObject({
      heatLimitPending: true,
      timeLimitPending: true,
      shouldEnd: true,
    })
  })
})
