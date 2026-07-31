import type { PartyAct, PartyPrediction, PartyReactionDecision } from '../services/partyMode'

/** Public player info safe to broadcast to all controllers */
export interface PublicPlayerInfo {
  readonly id: number
  readonly name: string
  readonly color: string
  readonly position: number
  readonly hasTakenOff: boolean
  readonly isWinner: boolean
}

/** Per-player private view projected by host */
export interface PlayerView {
  readonly myIndex: number
  readonly isMyTurn: boolean
  readonly tokensRemaining: number
  readonly diceValue: number | null
  readonly gameStatus: string
  readonly currentAct: PartyAct
  readonly allPlayers: readonly PublicPlayerInfo[]
  readonly boardSize: number
  readonly roundNumber: number
  readonly pendingAction: RequiredAction | null
  readonly lastEffect: string | null
  readonly diceChangedThisTurn: boolean
}

export interface ControllerVictorySettlement {
  readonly actionText: string
  readonly count: number
  readonly countUnit: string
  readonly place: number
}

// --- Host -> Controller messages ---

export type RequiredAction =
  | { readonly type: 'roll_dice' }
  | { readonly type: 'predict'; readonly timeoutSeconds: number }
  | {
      readonly type: 'reaction_decision'
      readonly rolledValue: number
      readonly timeoutSeconds: number
    }
  | {
      readonly type: 'dice_decision'
      readonly diceValue: number
      readonly canReroll: boolean
      readonly timeoutSeconds: number
    }
  | {
      readonly type: 'punishment_choice'
      readonly choiceA: string
      readonly choiceB: string
    }
  | {
      readonly type: 'punishment_intervention'
      readonly targetName: string
      readonly countLabel: string
      readonly actions: readonly ('transfer' | 'amplify' | 'immunity')[]
      readonly transferTargets: readonly {
        readonly playerIndex: number
        readonly playerName: string
      }[]
    }
  | { readonly type: 'acknowledge'; readonly message: string }
  | { readonly type: 'tiebreak_roll' }

export type HostMessage =
  | {
      readonly type: 'player_assigned'
      readonly playerIndex: number
      readonly player: PublicPlayerInfo
    }
  | { readonly type: 'state_update'; readonly view: PlayerView }
  | {
      readonly type: 'game_ended'
      readonly winnerName: string
      readonly settlement?: ControllerVictorySettlement
    }
  | { readonly type: 'room_closed' }
  | { readonly type: 'error'; readonly message: string }

// --- Controller -> Host messages ---

export type ControllerMessage =
  | { readonly type: 'join'; readonly preferredName?: string }
  | { readonly type: 'roll_dice' }
  | { readonly type: 'predict'; readonly prediction: PartyPrediction }
  | { readonly type: 'reaction_decision'; readonly decision: PartyReactionDecision }
  | { readonly type: 'reroll' }
  | { readonly type: 'continue_move' }
  | { readonly type: 'select_punishment'; readonly index: number }
  | { readonly type: 'skip_punishment_choice' }
  | {
      readonly type: 'punishment_intervention'
      readonly action: 'transfer' | 'amplify' | 'immunity'
      readonly targetPlayerIndex?: number
    }
  | { readonly type: 'decline_punishment_intervention' }
  | { readonly type: 'acknowledge' }
  | { readonly type: 'tiebreak_roll' }

// --- Connection management ---

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface ConnectedPlayer {
  readonly playerIndex: number
  readonly peerId: string
  readonly status: ConnectionStatus
}

export interface RoomInfo {
  readonly roomId: string
  readonly hostPeerId: string
  readonly gameUrl: string
}
