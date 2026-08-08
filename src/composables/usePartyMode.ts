import { computed, shallowRef } from 'vue'
import {
  beginPartyTurn,
  completePartyTurn,
  createPartyHighlight,
  createPartySession,
  decidePartyReaction,
  pausePartySession,
  recordPartyChain,
  resolvePartyReactionRoll,
  resumePartySession,
  spendPartyToken,
  submitPartyPrediction,
  type PartyPrediction,
  type PartyReactionDecision,
  type PartySession,
  type PartyDirectorConfig,
  type PartyTokenAction,
} from '@flying-chess/game-core/party-mode'

export function usePartyMode(now: () => number = () => performance.now()) {
  const session = shallowRef<PartySession | null>(null)

  const replace = (nextSession: PartySession): PartySession => {
    session.value = nextSession
    return nextSession
  }

  const requireSession = (): PartySession => {
    if (!session.value) throw new Error('升温局尚未开始')
    return session.value
  }

  return {
    session,
    isActive: computed(() => session.value !== null),
    highlight: computed(() => (session.value ? createPartyHighlight(session.value) : null)),
    start(playerCount: number, directorConfig?: PartyDirectorConfig): PartySession {
      return replace(createPartySession({ playerCount, startedAt: now(), directorConfig }))
    },
    clear(): void {
      session.value = null
    },
    beginTurn(playerIndex: number): PartySession {
      const current = requireSession()
      if (current.activeTurnPlayerIndex !== undefined) return current
      return replace(beginPartyTurn(current, playerIndex))
    },
    submitPrediction(playerIndex: number, prediction: PartyPrediction): PartySession {
      return replace(submitPartyPrediction(requireSession(), { playerIndex, prediction }))
    },
    resolveRoll(rolledValue: number): PartySession {
      return replace(resolvePartyReactionRoll(requireSession(), rolledValue))
    },
    decideReaction(playerIndex: number, decision: PartyReactionDecision): PartySession {
      return replace(decidePartyReaction(requireSession(), { playerIndex, decision }))
    },
    spendToken(playerIndex: number, action: PartyTokenAction): PartySession {
      return replace(spendPartyToken(requireSession(), { playerIndex, action }))
    },
    completeTurn(
      playerIndex: number,
      nextRoundEligibleReactionTargets?: readonly number[]
    ): PartySession {
      return replace(
        completePartyTurn(requireSession(), {
          playerIndex,
          now: now(),
          nextRoundEligibleReactionTargets,
        })
      )
    },
    pause(): PartySession {
      return replace(pausePartySession(requireSession(), now()))
    },
    resume(): PartySession {
      return replace(resumePartySession(requireSession(), now()))
    },
    recordChain(chainLength: number): PartySession {
      return replace(recordPartyChain(requireSession(), chainLength))
    },
  }
}
