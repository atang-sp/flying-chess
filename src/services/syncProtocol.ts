import type { Player, GameState } from '../types/game'
import type {
  PublicPlayerInfo,
  PlayerView,
  HostMessage,
  ControllerMessage,
  RequiredAction,
} from '../types/network'
import type { PartySession, PartyAct } from './partyMode'

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
  return JSON.parse(data) as HostMessage
}

export function serializeControllerMessage(msg: ControllerMessage): string {
  return JSON.stringify(msg)
}

export function deserializeControllerMessage(data: string): ControllerMessage {
  return JSON.parse(data) as ControllerMessage
}
