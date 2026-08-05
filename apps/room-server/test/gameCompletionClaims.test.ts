import { describe, expect, it } from 'vitest'
import {
  buildGameCompletionClaimUrl,
  createGameCompletionClaim,
  verifyGameCompletionClaim,
} from '../src/gameCompletionClaims'

const secret = 'test-only-achievement-secret-with-at-least-32-bytes'
const completedAt = Date.UTC(2026, 7, 4, 12, 0, 0)

describe('server-confirmed game completion claims', () => {
  it('signs the minimal event contract and verifies it before expiry', () => {
    const token = createGameCompletionClaim(
      {
        claimId: 'claim-1',
        gameId: 'game-1',
        playerId: 'player-1',
        rulesetVersion: 'party_v2',
        completedAt,
        place: 2,
        winner: false,
      },
      { secret }
    )

    expect(verifyGameCompletionClaim(token, secret, completedAt + 1_000)).toEqual({
      v: 1,
      iss: 'flying-chess-room-server',
      aud: 'where-is-my-friends',
      event: 'game_completed',
      jti: 'claim-1',
      game_id: 'game-1',
      player_id: 'player-1',
      mode: 'online_party',
      ruleset_version: 'party_v2',
      completed_at: completedAt / 1_000,
      place: 2,
      winner: false,
      iat: completedAt / 1_000,
      exp: completedAt / 1_000 + 7 * 24 * 60 * 60,
    })
  })

  it('rejects tampering, expiry, weak secrets, and non-HTTPS handoffs', () => {
    const token = createGameCompletionClaim(
      {
        claimId: 'claim-2',
        gameId: 'game-2',
        playerId: 'player-2',
        rulesetVersion: 'party_v2',
        completedAt,
        place: 1,
        winner: true,
      },
      { secret, ttlMs: 1_000 }
    )
    const [header, body, signature] = token.split('.')
    const tamperedBody = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body ?? '', 'base64url').toString('utf8')),
        winner: false,
      })
    ).toString('base64url')

    expect(() =>
      verifyGameCompletionClaim(`${header}.${tamperedBody}.${signature}`, secret)
    ).toThrow('signature is invalid')
    expect(() => verifyGameCompletionClaim(token, secret, completedAt + 2_000)).toThrow(
      'expired or has invalid timestamps'
    )
    expect(() =>
      createGameCompletionClaim(
        {
          claimId: 'claim-3',
          gameId: 'game-3',
          playerId: 'player-3',
          rulesetVersion: 'party_v2',
          completedAt,
          place: 1,
          winner: true,
        },
        { secret: 'weak' }
      )
    ).toThrow('at least 32 bytes')
    expect(() => buildGameCompletionClaimUrl('http://forum.example/claim', token)).toThrow(
      'must use HTTPS'
    )
  })

  it('builds a fragment-only handoff so the claim never enters HTTP access logs', () => {
    const token = createGameCompletionClaim(
      {
        claimId: 'claim-4',
        gameId: 'game-4',
        playerId: 'player-4',
        rulesetVersion: 'party_v2',
        completedAt,
        place: 1,
        winner: true,
      },
      { secret }
    )
    const url = new URL(buildGameCompletionClaimUrl('https://forum.example/flying-chess', token))
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))

    expect(url.search).toBe('')
    expect(fragment.get('token')).toBe(token)
  })
})
