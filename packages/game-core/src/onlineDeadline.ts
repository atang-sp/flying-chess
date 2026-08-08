import type { OnlineGameState } from './index'

export function timeoutDecisionPlayerId(state: OnlineGameState): string | undefined {
  const pending = state.pendingAction
  if (state.phase === 'awaiting_prediction' || state.phase === 'awaiting_reaction') {
    return state.players[state.partySession.reaction?.reactorPlayerIndex ?? -1]?.id
  }
  if (pending?.kind === 'punishment_choice' || pending?.kind === 'acknowledgement') {
    return state.players[pending.playerIndex]?.id
  }
  if (pending?.kind === 'punishment_count') return state.players[pending.chooserPlayerIndex]?.id
  if (pending?.kind === 'punishment_variant') {
    return state.players[pending.decisionPlayerIndex]?.id
  }
  if (pending?.kind === 'content') return state.players[pending.playerIndex]?.id
  if (pending?.kind === 'mercy_decision') {
    return state.players[pending.decisionPlayerIndex]?.id
  }
  if (pending?.kind === 'event_result' || pending?.kind === 'event_activation') {
    return state.currentPlayerId
  }
  if (pending?.kind === 'event_mini_game') return state.players[pending.actorIndex]?.id
  return undefined
}

function onlineDeadlineKey(state: OnlineGameState): string | null {
  const pending = state.pendingAction
  if (state.phase === 'awaiting_prediction' || state.phase === 'awaiting_reaction') {
    return state.phase
  }
  if (
    pending?.kind === 'punishment_choice' ||
    pending?.kind === 'punishment_count' ||
    pending?.kind === 'punishment_variant' ||
    pending?.kind === 'acknowledgement' ||
    pending?.kind === 'content' ||
    pending?.kind === 'mercy_decision' ||
    pending?.kind === 'event_activation' ||
    pending?.kind === 'event_result'
  ) {
    return `${pending.kind}:${state.revision}`
  }
  if (pending?.kind === 'punishment_intervention') return pending.kind
  if (
    pending?.kind === 'event_vote' ||
    pending?.kind === 'event_rps' ||
    pending?.kind === 'event_mini_game'
  ) {
    return `${pending.kind}:${pending.card.id}`
  }
  return null
}

export function scheduleOnlineDeadline(
  previous: OnlineGameState,
  next: OnlineGameState,
  now: number
): OnlineGameState {
  if (next.status === 'finished') return { ...next, deadlineAt: null }
  const previousKey = onlineDeadlineKey(previous)
  const nextKey = onlineDeadlineKey(next)
  if (nextKey === null) return { ...next, deadlineAt: null }
  if (previousKey === nextKey && previous.deadlineAt !== null) {
    return { ...next, deadlineAt: previous.deadlineAt }
  }
  return { ...next, deadlineAt: now + next.settings.turnDurationSeconds * 1_000 }
}
