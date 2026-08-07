import type { PartyPrediction, PartyReactionDecision } from './partyMode'
import type { PartyPunishmentIntervention } from './partyPunishmentInterventions'
import type { PartyRockPaperScissorsChoice } from './partyEvents'
import type { OnlineGameView, OnlineRoomSettings, OnlineRoomSettingsView } from './index'

export type OnlineClientMessage =
  | Readonly<{
      type: 'create_room'
      requestId: string
      nickname: string
      color: string
    }>
  | Readonly<{
      type: 'join_room'
      requestId: string
      roomCode: string
      nickname: string
      color: string
    }>
  | Readonly<{
      type: 'resume_room'
      requestId: string
      roomCode: string
      playerId: string
      resumeToken: string
    }>
  | Readonly<{ type: 'start_game'; requestId: string }>
  | Readonly<{
      type: 'update_settings'
      requestId: string
      settings: OnlineRoomSettings
    }>
  | Readonly<{ type: 'confirm_settings'; requestId: string }>
  | Readonly<{ type: 'transfer_host'; requestId: string; playerId: string }>
  | Readonly<{ type: 'remove_player'; requestId: string; playerId: string }>
  | Readonly<{ type: 'pause_game'; requestId: string }>
  | Readonly<{ type: 'resume_game'; requestId: string }>
  | Readonly<{ type: 'skip_action'; requestId: string }>
  | Readonly<{
      type: 'submit_prediction'
      requestId: string
      prediction: PartyPrediction
    }>
  | Readonly<{ type: 'roll_dice'; requestId: string }>
  | Readonly<{
      type: 'decide_reaction'
      requestId: string
      decision: PartyReactionDecision
    }>
  | Readonly<{ type: 'reroll'; requestId: string }>
  | Readonly<{
      type: 'choose_punishment'
      requestId: string
      selectedIndex: 0 | 1 | null
    }>
  | Readonly<{
      type: 'intervene'
      requestId: string
      action: PartyPunishmentIntervention['action']
      targetPlayerId?: string
    }>
  | Readonly<{ type: 'decline_intervention'; requestId: string }>
  | Readonly<{ type: 'choose_punishment_count'; requestId: string; count: number }>
  | Readonly<{ type: 'resolve_condition'; requestId: string; conditionMet: boolean }>
  | Readonly<{ type: 'defer_punishment'; requestId: string; defer: boolean }>
  | Readonly<{ type: 'acknowledge'; requestId: string }>
  | Readonly<{ type: 'request_mercy'; requestId: string }>
  | Readonly<{ type: 'decide_mercy'; requestId: string; accepted: boolean }>
  | Readonly<{ type: 'chain_roll'; requestId: string }>
  | Readonly<{ type: 'resolve_content'; requestId: string; accepted: boolean }>
  | Readonly<{ type: 'vote'; requestId: string; optionIndex: number }>
  | Readonly<{
      type: 'resolve_event'
      requestId: string
      selectedPlayerIds?: readonly string[]
    }>
  | Readonly<{ type: 'acknowledge_event_result'; requestId: string }>
  | Readonly<{
      type: 'rps'
      requestId: string
      choice: PartyRockPaperScissorsChoice
    }>
  | Readonly<{ type: 'mini_game_press'; requestId: string }>
  | Readonly<{
      type: 'mini_game_memory_answer'
      requestId: string
      sequence: readonly string[]
    }>
  | Readonly<{
      type: 'mini_game_quiz_result'
      requestId: string
      completed: boolean
    }>
  | Readonly<{ type: 'tiebreak_roll'; requestId: string }>
  | Readonly<{ type: 'move'; requestId: string }>

export interface OnlineRoomPlayerView {
  readonly id: string
  readonly nickname: string
  readonly color: string
  readonly connected: boolean
  readonly disconnectedAt?: number
  readonly removable: boolean
  readonly removalBlockReason?: 'reconnect_grace' | 'minimum_players' | 'unsafe_game_state'
}

export interface OnlineRoomView {
  readonly status: 'lobby' | 'playing' | 'finished'
  readonly hostPlayerId: string
  readonly players: readonly OnlineRoomPlayerView[]
  readonly settings: OnlineRoomSettingsView
  readonly confirmedPlayerIds: readonly string[]
  readonly skipRequestedPlayerIds: readonly string[]
  readonly pauseRequestedPlayerIds: readonly string[]
  readonly game: OnlineGameView | null
  /** Private, per-seat forum handoff issued only after a server-confirmed finish. */
  readonly achievementClaimUrl?: string
}

export type OnlineServerMessage =
  | Readonly<{
      type: 'session'
      requestId: string
      roomCode: string
      playerId: string
      resumeToken: string
      isHost: boolean
    }>
  | Readonly<{ type: 'room_state'; room: OnlineRoomView }>
  | Readonly<{
      type: 'error'
      requestId?: string
      code: string
      message: string
    }>
