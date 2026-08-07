import type { OnlineCommandAuthority, OnlineGameState } from './index'

export function isOnlineCoreOperation(state: OnlineGameState): boolean {
  return (
    state.phase === 'awaiting_roll' ||
    state.phase === 'awaiting_move' ||
    state.phase === 'awaiting_tiebreak' ||
    state.phase === 'awaiting_chain_roll'
  )
}

export function canPlayerSkipOwnOnlineAction(state: OnlineGameState, playerId: string): boolean {
  const playerIndex = state.players.findIndex(player => player.id === playerId)
  if (playerIndex < 0) return false
  const pending = state.pendingAction
  const reaction = state.partySession.reaction
  if (state.phase === 'awaiting_prediction' || state.phase === 'awaiting_reaction') {
    return reaction?.reactorPlayerIndex === playerIndex
  }
  if (pending?.kind === 'punishment_choice' || pending?.kind === 'acknowledgement') {
    return pending.playerIndex === playerIndex
  }
  if (pending?.kind === 'punishment_intervention') {
    return (
      pending.options.some(option => option.playerIndex === playerIndex) &&
      !pending.declinedPlayerIndices.includes(playerIndex)
    )
  }
  if (pending?.kind === 'punishment_count') return pending.chooserPlayerIndex === playerIndex
  if (pending?.kind === 'punishment_variant' || pending?.kind === 'mercy_decision') {
    return pending.decisionPlayerIndex === playerIndex
  }
  if (pending?.kind === 'content') return pending.playerIndex === playerIndex
  if (pending?.kind === 'event_vote') return pending.votes[playerIndex] === undefined
  if (pending?.kind === 'event_rps') return pending.choices[playerIndex] === undefined
  if (pending?.kind === 'event_activation' || pending?.kind === 'event_result') {
    return state.currentPlayerId === playerId
  }
  if (pending?.kind === 'event_mini_game') return pending.actorIndex === playerIndex
  return false
}

export function canViewerAccessOnlineSkip(
  state: OnlineGameState,
  viewerId: string,
  authority: Exclude<OnlineCommandAuthority, 'system'>
): boolean {
  return (
    authority === 'host' ||
    isOnlineCoreOperation(state) ||
    canPlayerSkipOwnOnlineAction(state, viewerId)
  )
}
