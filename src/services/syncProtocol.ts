import type { Player, GameState } from '@flying-chess/game-core/types'
import type {
  PublicPlayerInfo,
  PlayerView,
  HostMessage,
  ControllerMessage,
  RequiredAction,
} from '../types/network'
import type { PartySession, PartyAct } from '@flying-chess/game-core/party-mode'

export function toPublicPlayerInfo(player: Player): PublicPlayerInfo {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    position: player.position,
    hasTakenOff: player.hasTakenOff ?? false,
    isWinner: player.isWinner,
  }
}

export function projectPlayerView(
  playerIndex: number,
  gameState: GameState,
  session: PartySession | null,
  pendingAction: RequiredAction | null,
  lastEffect: string | null
): PlayerView {
  const act: PartyAct = session?.act ?? 'warmup'
  const tokensRemaining = session?.tokensRemaining[playerIndex] ?? 0
  const diceChangedThisTurn = session?.diceChangedThisTurn ?? false

  return {
    myIndex: playerIndex,
    isMyTurn: gameState.currentPlayerIndex === playerIndex,
    tokensRemaining,
    diceValue: gameState.diceValue,
    gameStatus: gameState.gameStatus,
    currentAct: act,
    allPlayers: gameState.players.map(toPublicPlayerInfo),
    boardSize: gameState.board.length,
    roundNumber: session?.roundNumber ?? 1,
    pendingAction,
    lastEffect,
    diceChangedThisTurn,
  }
}

export function serializeHostMessage(msg: HostMessage): string {
  return JSON.stringify(msg)
}

export function deserializeHostMessage(data: string): HostMessage {
  const parsed = parseMessageObject(data, '主机消息格式无效')
  const valid = (() => {
    switch (parsed.type) {
      case 'player_assigned':
        return isNonNegativeInteger(parsed.playerIndex) && isPublicPlayerInfo(parsed.player)
      case 'state_update':
        return isPlayerView(parsed.view)
      case 'game_ended':
        return (
          typeof parsed.winnerName === 'string' &&
          (parsed.settlement === undefined || isVictorySettlement(parsed.settlement))
        )
      case 'room_closed':
        return true
      case 'error':
        return typeof parsed.message === 'string'
      default:
        return false
    }
  })()
  if (!valid) throw new Error('主机消息格式无效')
  return parsed as HostMessage
}

export function serializeControllerMessage(msg: ControllerMessage): string {
  return JSON.stringify(msg)
}

export function deserializeControllerMessage(data: string): ControllerMessage {
  const message = parseMessageObject(data, '控制消息格式无效')
  const valid = (() => {
    switch (message.type) {
      case 'join':
        return message.preferredName === undefined || typeof message.preferredName === 'string'
      case 'roll_dice':
      case 'reroll':
      case 'continue_move':
      case 'skip_punishment_choice':
      case 'decline_punishment_intervention':
      case 'acknowledge':
      case 'tiebreak_roll':
        return true
      case 'predict':
        return message.prediction === 'low' || message.prediction === 'high'
      case 'reaction_decision':
        return message.decision === 'keep' || message.decision === 'mirror'
      case 'select_punishment':
        return message.index === 0 || message.index === 1
      case 'punishment_intervention':
        return (
          (message.action === 'transfer' ||
            message.action === 'amplify' ||
            message.action === 'immunity') &&
          (message.targetPlayerIndex === undefined || Number.isInteger(message.targetPlayerIndex))
        )
      default:
        return false
    }
  })()
  if (!valid) throw new Error('控制消息格式无效')
  return message as ControllerMessage
}

function parseMessageObject(data: string, errorMessage: string): Record<string, unknown> {
  if (!data || data.length > 16 * 1024) throw new Error(errorMessage)
  try {
    const parsed: unknown = JSON.parse(data)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Normalise syntax and shape failures to the protocol-level error below.
  }
  throw new Error(errorMessage)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPublicPlayerInfo(value: unknown): value is PublicPlayerInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const player = value as Record<string, unknown>
  return (
    isNonNegativeInteger(player.id) &&
    typeof player.name === 'string' &&
    typeof player.color === 'string' &&
    isNonNegativeInteger(player.position) &&
    typeof player.hasTakenOff === 'boolean' &&
    typeof player.isWinner === 'boolean'
  )
}

function isRequiredAction(value: unknown): value is RequiredAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const action = value as Record<string, unknown>
  switch (action.type) {
    case 'roll_dice':
    case 'tiebreak_roll':
      return true
    case 'predict':
      return isNonNegativeInteger(action.timeoutSeconds)
    case 'reaction_decision':
      return isFiniteNumber(action.rolledValue) && isNonNegativeInteger(action.timeoutSeconds)
    case 'dice_decision':
      return (
        isFiniteNumber(action.diceValue) &&
        typeof action.canReroll === 'boolean' &&
        isNonNegativeInteger(action.timeoutSeconds)
      )
    case 'punishment_choice':
      return typeof action.choiceA === 'string' && typeof action.choiceB === 'string'
    case 'punishment_intervention':
      return (
        typeof action.targetName === 'string' &&
        typeof action.countLabel === 'string' &&
        Array.isArray(action.actions) &&
        action.actions.every(item => ['transfer', 'amplify', 'immunity'].includes(String(item))) &&
        Array.isArray(action.transferTargets) &&
        action.transferTargets.every(target => {
          if (!target || typeof target !== 'object' || Array.isArray(target)) return false
          const candidate = target as Record<string, unknown>
          return (
            isNonNegativeInteger(candidate.playerIndex) && typeof candidate.playerName === 'string'
          )
        })
      )
    case 'acknowledge':
      return typeof action.message === 'string'
    default:
      return false
  }
}

function isPlayerView(value: unknown): value is PlayerView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const view = value as Record<string, unknown>
  return (
    isNonNegativeInteger(view.myIndex) &&
    typeof view.isMyTurn === 'boolean' &&
    isNonNegativeInteger(view.tokensRemaining) &&
    (view.diceValue === null || isFiniteNumber(view.diceValue)) &&
    typeof view.gameStatus === 'string' &&
    ['warmup', 'heating', 'finale'].includes(String(view.currentAct)) &&
    Array.isArray(view.allPlayers) &&
    view.allPlayers.every(isPublicPlayerInfo) &&
    isNonNegativeInteger(view.boardSize) &&
    isNonNegativeInteger(view.roundNumber) &&
    (view.pendingAction === null || isRequiredAction(view.pendingAction)) &&
    (view.lastEffect === null || typeof view.lastEffect === 'string') &&
    typeof view.diceChangedThisTurn === 'boolean'
  )
}

function isVictorySettlement(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const settlement = value as Record<string, unknown>
  return (
    typeof settlement.actionText === 'string' &&
    isNonNegativeInteger(settlement.count) &&
    typeof settlement.countUnit === 'string' &&
    isNonNegativeInteger(settlement.place)
  )
}
