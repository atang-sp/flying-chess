import { normalizeBoardConfig } from './sharedConfig'
import { canViewerAccessOnlineSkip } from './onlineCommandPolicy'
import type {
  OnlineGameCommandName,
  OnlineGameProjectionContext,
  OnlineGameState,
  OnlineGameView,
} from './index'

export function projectOnlineGameView(
  state: OnlineGameState,
  viewerId: string,
  context: OnlineGameProjectionContext = { authority: 'player' }
): OnlineGameView {
  const viewerIndex = state.players.findIndex(player => player.id === viewerId)
  const isTurn = state.currentPlayerId === viewerId && state.status === 'playing'
  const reaction = state.partySession.reaction
  let allowedCommands: readonly OnlineGameCommandName[] = []
  if (
    state.phase === 'awaiting_prediction' &&
    reaction?.status === 'awaiting_prediction' &&
    reaction.reactorPlayerIndex === viewerIndex
  ) {
    allowedCommands = ['submit_prediction']
  } else if (state.phase === 'awaiting_roll' && isTurn) {
    allowedCommands = ['roll_dice']
  } else if (
    state.phase === 'awaiting_reaction' &&
    reaction?.status === 'awaiting_decision' &&
    reaction.reactorPlayerIndex === viewerIndex
  ) {
    allowedCommands = ['decide_reaction']
  } else if (state.phase === 'awaiting_move' && isTurn) {
    const canReroll =
      !state.partySession.diceChangedThisTurn &&
      state.partySession.interventionUsedThisTurn === undefined &&
      (state.partySession.tokensRemaining[viewerIndex] ?? 0) > 0
    allowedCommands = canReroll ? ['reroll', 'move'] : ['move']
  } else if (
    state.phase === 'awaiting_punishment_choice' &&
    state.pendingAction?.kind === 'punishment_choice' &&
    state.pendingAction.playerIndex === viewerIndex
  ) {
    allowedCommands = ['choose_punishment']
  } else if (
    state.phase === 'awaiting_punishment_intervention' &&
    state.pendingAction?.kind === 'punishment_intervention'
  ) {
    const option = state.pendingAction.options.find(
      candidate => candidate.playerIndex === viewerIndex
    )
    if (option && !state.pendingAction.declinedPlayerIndices.includes(viewerIndex)) {
      allowedCommands = ['intervene', 'decline_intervention']
    }
  } else if (
    state.phase === 'awaiting_acknowledgement' &&
    state.pendingAction?.kind === 'acknowledgement' &&
    state.pendingAction.playerIndex === viewerIndex
  ) {
    allowedCommands = state.pendingAction.mercyAvailable
      ? ['acknowledge', 'request_mercy']
      : ['acknowledge']
  } else if (
    state.phase === 'awaiting_mercy_decision' &&
    state.pendingAction?.kind === 'mercy_decision' &&
    state.pendingAction.decisionPlayerIndex === viewerIndex
  ) {
    allowedCommands = ['decide_mercy']
  } else if (
    state.phase === 'awaiting_punishment_count' &&
    state.pendingAction?.kind === 'punishment_count' &&
    state.pendingAction.chooserPlayerIndex === viewerIndex
  ) {
    allowedCommands = ['choose_punishment_count']
  } else if (
    state.phase === 'awaiting_punishment_variant' &&
    state.pendingAction?.kind === 'punishment_variant' &&
    state.pendingAction.decisionPlayerIndex === viewerIndex
  ) {
    allowedCommands =
      state.pendingAction.resolution.variant === 'conditional'
        ? ['resolve_condition']
        : ['defer_punishment']
  } else if (
    state.phase === 'awaiting_chain_roll' &&
    state.pendingAction?.kind === 'chain_roll' &&
    state.pendingAction.playerIndex === viewerIndex
  ) {
    allowedCommands = ['chain_roll']
  } else if (
    state.phase === 'awaiting_content' &&
    state.pendingAction?.kind === 'content' &&
    state.pendingAction.playerIndex === viewerIndex
  ) {
    allowedCommands = ['resolve_content']
  } else if (state.phase === 'awaiting_event' && state.pendingAction?.kind === 'event_vote') {
    if (state.pendingAction.votes[viewerIndex] === undefined) allowedCommands = ['vote']
  } else if (
    state.phase === 'awaiting_event' &&
    state.pendingAction?.kind === 'event_activation' &&
    isTurn
  ) {
    allowedCommands = ['resolve_event']
  } else if (state.phase === 'awaiting_event' && state.pendingAction?.kind === 'event_rps') {
    if (state.pendingAction.choices[viewerIndex] === undefined) allowedCommands = ['rps']
  } else if (
    state.phase === 'awaiting_event' &&
    state.pendingAction?.kind === 'event_result' &&
    isTurn
  ) {
    allowedCommands = ['acknowledge_event_result']
  } else if (
    state.phase === 'awaiting_mini_game' &&
    state.pendingAction?.kind === 'event_mini_game'
  ) {
    if (state.pendingAction.card.effect.game === 'reaction') {
      allowedCommands = ['mini_game_press']
    } else if (state.pendingAction.actorIndex === viewerIndex) {
      allowedCommands =
        state.pendingAction.card.effect.game === 'memory'
          ? ['mini_game_memory_answer']
          : ['mini_game_quiz_result']
    }
  } else if (
    state.phase === 'awaiting_tiebreak' &&
    state.pendingAction?.kind === 'tiebreak' &&
    state.currentPlayerId === viewerId
  ) {
    allowedCommands = ['tiebreak_roll']
  }
  if (state.status === 'playing') {
    const canSkip = canViewerAccessOnlineSkip(state, viewerId, context.authority)
    allowedCommands =
      state.partySession.pausedAt !== undefined
        ? ['resume_game']
        : [...allowedCommands, 'pause_game', ...(canSkip ? (['skip_action'] as const) : [])]
  }
  const pendingAction = projectPendingAction(state, viewerIndex)
  return {
    schemaVersion: state.schemaVersion,
    rulesetVersion: state.rulesetVersion,
    status: state.status,
    revision: state.revision,
    boardSize: state.boardSize,
    settings: {
      scenePreset: state.settings.scenePreset,
      boardPreset: state.settings.boardPreset,
      boardConfig: normalizeBoardConfig(state.settings.boardConfig),
      turnDurationSeconds: state.settings.turnDurationSeconds,
    },
    currentAct: state.partySession.act,
    roundNumber: state.partySession.roundNumber,
    heat: state.partySession.heat,
    heatContributionByPlayer: [...state.partySession.heatContributionByPlayer],
    heatLimitPending: state.partySession.heatLimitPending,
    myTokensRemaining: state.partySession.tokensRemaining[viewerIndex] ?? 0,
    reaction: reaction
      ? {
          status: reaction.status,
          targetPlayerId: state.players[reaction.targetPlayerIndex]?.id ?? '',
          reactorPlayerId: state.players[reaction.reactorPlayerIndex]?.id ?? '',
          prediction:
            viewerIndex === reaction.reactorPlayerIndex || reaction.status === 'resolved'
              ? reaction.prediction
              : undefined,
          predictionCorrect:
            viewerIndex === reaction.reactorPlayerIndex || reaction.status === 'resolved'
              ? reaction.predictionCorrect
              : undefined,
        }
      : null,
    board: state.board.map(cell => ({
      position: cell.position,
      type: cell.type,
      effect: cell.effect ? { type: cell.effect.type, value: cell.effect.value } : undefined,
    })),
    pendingAction,
    winnerPlayerId: state.winnerPlayerId,
    victorySettlement: state.victorySettlement,
    currentPlayerId: state.currentPlayerId,
    phase: state.phase,
    diceValue: state.diceValue,
    paused: state.partySession.pausedAt !== undefined,
    deadlineAt: state.deadlineAt,
    players: state.players.map(player => ({
      id: player.id,
      nickname: player.nickname,
      color: player.color,
      position: player.position,
      hasTakenOff: player.hasTakenOff,
      failedTakeoffAttempts: player.failedTakeoffAttempts,
      isWinner: player.isWinner,
      pendingSkippedTurns: player.pendingSkippedTurns,
    })),
    allowedCommands,
    lastEvent: state.lastEvent,
  }
}

function projectPendingAction(
  state: OnlineGameState,
  viewerIndex: number
): OnlineGameView['pendingAction'] {
  const pending = state.pendingAction
  if (!pending) return null
  if (pending.kind === 'punishment_choice') {
    return pending.playerIndex === viewerIndex
      ? {
          kind: pending.kind,
          choices: pending.choices.map(choice => ({ description: choice.description })),
        }
      : { kind: pending.kind }
  }
  if (pending.kind === 'punishment_intervention') {
    const option = pending.options.find(candidate => candidate.playerIndex === viewerIndex)
    return option
      ? {
          kind: pending.kind,
          actions: option.actions,
          transferTargetPlayerIds: option.transferTargetPlayerIndices.flatMap(index =>
            state.players[index] ? [state.players[index].id] : []
          ),
        }
      : { kind: pending.kind }
  }
  if (pending.kind === 'punishment_count') {
    return pending.chooserPlayerIndex === viewerIndex &&
      pending.resolution.count.kind === 'awaiting_external_count'
      ? {
          kind: pending.kind,
          minimum: pending.resolution.count.minimum,
          maximum: pending.resolution.count.maximum,
          step: pending.resolution.count.step,
        }
      : { kind: pending.kind }
  }
  if (pending.kind === 'punishment_variant') {
    const isRelated =
      pending.decisionPlayerIndex === viewerIndex ||
      pending.resolution.targetPlayerIndex === viewerIndex
    return isRelated
      ? {
          kind: pending.kind,
          variant: pending.resolution.variant,
          description: pending.resolution.action.description,
        }
      : { kind: pending.kind }
  }
  if (pending.kind === 'mercy_decision') {
    const isRelated =
      pending.requesterPlayerIndex === viewerIndex || pending.decisionPlayerIndex === viewerIndex
    return isRelated
      ? {
          kind: pending.kind,
          description: pending.resolution.action.description,
          requesterPlayerId: state.players[pending.requesterPlayerIndex]?.id,
        }
      : { kind: pending.kind }
  }
  if (pending.kind === 'event_vote') {
    return {
      kind: pending.kind,
      title: pending.card.title,
      prompt: pending.card.effect.prompt,
      options: pending.card.effect.options,
      submittedCount: Object.keys(pending.votes).length,
      hasSubmitted: pending.votes[viewerIndex] !== undefined,
    }
  }
  if (pending.kind === 'event_activation') {
    return {
      kind: pending.kind,
      title: pending.card.title,
      description: pending.card.description,
      selectionPlayerCount: pending.card.effect.kind === 'bind_players' ? 2 : 0,
    }
  }
  if (pending.kind === 'event_rps') {
    return {
      kind: pending.kind,
      title: pending.card.title,
      submittedCount: Object.keys(pending.choices).length,
      hasSubmitted: pending.choices[viewerIndex] !== undefined,
    }
  }
  if (pending.kind === 'event_result') {
    return { kind: pending.kind, title: pending.title, summary: pending.summary }
  }
  if (pending.kind === 'event_mini_game') {
    return {
      kind: pending.kind,
      title: pending.card.title,
      game: pending.card.effect.game,
      actorPlayerId: state.players[pending.actorIndex]?.id ?? '',
      goAt: pending.goAt,
      deadline: pending.deadline,
      sequence: pending.actorIndex === viewerIndex ? pending.sequence : undefined,
      options: pending.actorIndex === viewerIndex ? pending.options : undefined,
    }
  }
  if (pending.kind === 'tiebreak') {
    const candidatePlayerIds = pending.state.candidatePlayerIndices.flatMap(index =>
      state.players[index] ? [state.players[index].id] : []
    )
    const rolls = Object.fromEntries(
      Object.entries(pending.state.rolls).flatMap(([index, value]) => {
        const player = state.players[Number(index)]
        return player ? [[player.id, value]] : []
      })
    )
    const currentCandidateIndex =
      pending.state.candidatePlayerIndices[pending.state.currentCandidateOffset]
    return {
      kind: pending.kind,
      candidatePlayerIds,
      currentPlayerId:
        currentCandidateIndex === undefined ? '' : (state.players[currentCandidateIndex]?.id ?? ''),
      roundNumber: pending.state.roundNumber,
      rolls,
    }
  }
  if (pending.kind === 'chain_roll') {
    return { kind: pending.kind, chainCount: pending.chainCount }
  }
  if (pending.kind === 'content') {
    return {
      kind: pending.kind,
      contentType: pending.contentType,
      description: pending.description,
      canRefuse: pending.canRefuse,
    }
  }
  return pending.playerIndex === viewerIndex
    ? { kind: pending.kind, description: pending.resolution.action.description }
    : { kind: pending.kind }
}
