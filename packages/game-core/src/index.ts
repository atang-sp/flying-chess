import {
  beginPartyTurn,
  completePartyTurn,
  createPartyPunishmentChoices,
  createPartySession,
  createPartyTieBreakState,
  decidePartyReaction,
  getPartyTimeLimitLeaders,
  isPartyPunishmentChoiceEligible,
  pausePartySession,
  resumePartySession,
  resolvePartyReactionRoll,
  rollPartyTieBreak,
  spendPartyToken,
  submitPartyPrediction,
  type PartyAct,
  type PartyPrediction,
  type PartyReactionDecision,
  type PartySession,
  type PartyTieBreakState,
} from './partyMode'
import {
  isPartyPunishmentCompleted,
  recordPartyMomentum,
  removePartyMomentumPlayer,
} from './partyMomentum'
import { resolveCellEffect, resolvePlayerMovement } from './movement'
import {
  createAutoBoardConfig,
  findBoardCell,
  getBoardCellType,
  getPlayerDisplayPosition,
  isSpecialBoardCell,
} from './boardRules'
import {
  createPlayerRoster,
  DEFAULT_PLAYER_COLORS,
  hasPlayerWon,
  nextPlayerIndex,
} from './playerRules'
import { canPlayerSkipOwnOnlineAction } from './onlineCommandPolicy'
import { scheduleOnlineDeadline, timeoutDecisionPlayerId } from './onlineDeadline'
export {
  CURRENT_ONLINE_PROTOCOL_VERSION,
  MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION,
  resolveOnlineProtocolVersion,
} from './onlineProtocolVersion'
import {
  createBoardConfig as createSharedBoardConfig,
  createModeConfig,
  cryptoRandomInt,
  createPunishmentConfig as createSharedPunishmentConfig,
  createSharedBoard,
  createStandardConfigSnapshot,
  GAME_CONFIG,
  MODE_POLICIES,
  normalizeBoardConfig,
  normalizePunishmentConfig,
  normalizeTrapConfig,
  validatePunishmentConfig,
  validateTrapConfig,
  validateBoardConfig,
} from './sharedConfig'

export {
  createModeConfig,
  createSharedBoard,
  createStandardConfigSnapshot,
  chooseWeighted,
  normalizePunishmentConfig,
  normalizeTrapConfig,
  normalizeConfigSnapshot,
  projectPublicConfig,
  serializeConfigSnapshot,
  inspectPunishmentConfig,
  validateConfigSnapshot,
  validatePunishmentConfig,
  validateTrapConfig,
} from './sharedConfig'
export type {
  BoardRandomSource,
  ConfigOverrides,
  ConfigSnapshot,
  ModeId,
  ModePolicy,
  PublicConfigProjection,
  PunishmentConfigIssue,
  PunishmentConfigIssueCode,
  PunishmentConfigValidationResult,
} from './sharedConfig'
import {
  applyPartyPunishmentIntervention,
  getPartyPunishmentInterventionOptions,
  type PartyPunishmentIntervention,
  type PartyPunishmentInterventionOption,
} from './partyPunishmentInterventions'
import {
  createCompatiblePunishmentAction,
  finalizePunishmentCount,
  pickPunishmentVariant,
  resolveRule,
  scaleResolvedPunishmentCount,
  type RuleRandomSource,
} from './ruleResolution'
import {
  applyPartyEventPunishmentRules,
  activatePartyEvent,
  createPartyEventState,
  getBoundPartnerPlayerIndex,
  processPartyEventSignal,
  resolvePartyRockPaperScissors,
  tallyPartyVotes,
  type PartyEventCard,
  type PartyEventSignal,
  type PartyEventState,
  type PartyRockPaperScissorsChoice,
} from './partyEvents'
import { consumePartyMiniGameModifier, createMemoryChallenge } from './partyMiniGames'
import {
  createDeferredPunishment,
  createEncorePunishmentReturn,
  createMutualPunishmentReturn,
  resolveConditionalPunishment,
} from './punishmentVariants'
import { DEFAULT_VICTORY_CONFIG, resolveVictorySettlement } from './victorySettlement'
import type {
  BoardCell,
  BoardConfig,
  Player,
  PunishmentAction,
  PunishmentConfig,
  PunishmentConstraints,
  PunishmentVariant,
  ResolvedPunishmentResult,
  TrapAction,
  VictoryConfig,
} from './domainTypes'

export type {
  BoardCell,
  BoardConfig,
  Player,
  PunishmentAction,
  PunishmentConfig,
  ResolvedPunishmentResult,
  TrapAction,
  VictoryConfig,
} from './domainTypes'
export type { PartyEventCard, PartyEventState } from './partyEvents'
export {
  PARTY_FINALE_THRESHOLD,
  PARTY_HEATING_THRESHOLD,
  PARTY_HEAT_MAX,
  PARTY_MAX_TOKENS,
  PARTY_STARTING_TOKENS,
  isPartyPunishmentCompleted,
  recordPartyMomentum,
  removePartyMomentumPlayer,
} from './partyMomentum'
export type { PartyMomentumEvent, PartyMomentumState } from './partyMomentum'
export {
  createAutoBoardConfig,
  createPlayerRoster,
  DEFAULT_PLAYER_COLORS,
  findBoardCell,
  getBoardCellType,
  getPlayerDisplayPosition,
  hasPlayerWon,
  isSpecialBoardCell,
  nextPlayerIndex,
}

export const ONLINE_RULESET_VERSION = 'party_v3' as const

export const ONLINE_PLAYER_COLORS = DEFAULT_PLAYER_COLORS

export const ONLINE_SCENE_PRESETS = ['default', 'icebreaker', 'hardcore', 'couple'] as const
export const ONLINE_BOARD_PRESETS = [
  'standard',
  'party_default',
  'icebreaker',
  'hardcore',
  'couple_finale',
] as const
export const ONLINE_TURN_DURATION_OPTIONS = [30, 60, 90, 120] as const

export type OnlineScenePreset = (typeof ONLINE_SCENE_PRESETS)[number]
export type OnlineBoardPreset = (typeof ONLINE_BOARD_PRESETS)[number]
export type OnlineTurnDurationSeconds = (typeof ONLINE_TURN_DURATION_OPTIONS)[number]

export interface OnlineRoomSettings {
  readonly scenePreset: OnlineScenePreset
  readonly boardPreset: OnlineBoardPreset
  readonly boardConfig: BoardConfig
  readonly turnDurationSeconds: OnlineTurnDurationSeconds
  readonly punishmentConfig: PunishmentConfig
  readonly traps: readonly TrapAction[]
}

export interface OnlineRoomSettingsView {
  readonly scenePreset: OnlineScenePreset
  readonly boardPreset: OnlineBoardPreset
  readonly boardConfig: BoardConfig
  readonly turnDurationSeconds: OnlineTurnDurationSeconds
  /** Present only in the host's lobby projection. */
  readonly punishmentConfig?: PunishmentConfig
  /** Present only in the host's lobby projection. */
  readonly traps?: readonly TrapAction[]
}

export const DEFAULT_ONLINE_ROOM_SETTINGS: OnlineRoomSettings = Object.freeze({
  scenePreset: 'default',
  boardPreset: 'standard',
  boardConfig: Object.freeze(createSharedBoardConfig()) as BoardConfig,
  turnDurationSeconds: 60,
  punishmentConfig: createSharedPunishmentConfig(),
  traps: createModeConfig('online_party').traps,
})

function onlinePunishmentConstraintsFor(
  scenePreset: OnlineScenePreset,
  act: PartyAct
): PunishmentConstraints {
  const scene =
    scenePreset === 'icebreaker'
      ? GAME_CONFIG.PARTY_SCENE_PRESETS.icebreaker
      : scenePreset === 'hardcore'
        ? GAME_CONFIG.PARTY_SCENE_PRESETS.hardcore
        : scenePreset === 'couple'
          ? GAME_CONFIG.PARTY_SCENE_PRESETS.intimate
          : undefined
  return {
    ...(MODE_POLICIES.online_party.stageConstraints[act] ?? {}),
    ...(scene?.actConstraintsOverride?.[act] ?? {}),
  }
}

export function createOnlineBoardConfig(boardPreset: OnlineBoardPreset): BoardConfig {
  if (boardPreset === 'standard') return createSharedBoardConfig()
  if (boardPreset === 'icebreaker')
    return { ...GAME_CONFIG.PARTY_SCENE_PRESETS.icebreaker.boardConfig }
  if (boardPreset === 'hardcore') return { ...GAME_CONFIG.PARTY_SCENE_PRESETS.hardcore.boardConfig }
  if (boardPreset === 'couple_finale')
    return { ...GAME_CONFIG.PARTY_SCENE_PRESETS.intimate.boardConfig }
  return { ...createModeConfig('online_party').boardConfig }
}

export function cloneOnlineRoomSettings(
  settings: OnlineRoomSettings | OnlineRoomSettingsView = DEFAULT_ONLINE_ROOM_SETTINGS
): OnlineRoomSettings {
  const boardConfig = normalizeBoardConfig(settings.boardConfig)
  return {
    scenePreset: settings.scenePreset,
    boardPreset: settings.boardPreset,
    boardConfig,
    turnDurationSeconds: settings.turnDurationSeconds,
    punishmentConfig: normalizePunishmentConfig(
      settings.punishmentConfig,
      DEFAULT_ONLINE_ROOM_SETTINGS.punishmentConfig
    ),
    traps: normalizeTrapConfig(settings.traps, DEFAULT_ONLINE_ROOM_SETTINGS.traps),
  }
}

export function normalizeOnlineRoomSettings(value: unknown): OnlineRoomSettings | null {
  if (!value || typeof value !== 'object') return null
  const settings = value as Record<string, unknown>
  const boardPreset = settings.boardPreset as OnlineBoardPreset
  const scenePreset = settings.scenePreset as OnlineScenePreset
  const boardConfig =
    settings.boardConfig === undefined
      ? ONLINE_BOARD_PRESETS.includes(boardPreset)
        ? createOnlineBoardConfig(boardPreset)
        : undefined
      : settings.boardConfig
  const turnDurationSeconds =
    settings.turnDurationSeconds === undefined ? 60 : settings.turnDurationSeconds
  const punishmentConfig = normalizePunishmentConfig(
    settings.punishmentConfig,
    DEFAULT_ONLINE_ROOM_SETTINGS.punishmentConfig
  )
  const punishmentIsGeneratable = (['warmup', 'heating', 'finale'] as const).every(act =>
    validatePunishmentConfig(punishmentConfig, onlinePunishmentConstraintsFor(scenePreset, act))
  )
  if (
    !ONLINE_SCENE_PRESETS.includes(scenePreset) ||
    !ONLINE_BOARD_PRESETS.includes(boardPreset) ||
    !ONLINE_TURN_DURATION_OPTIONS.includes(turnDurationSeconds as OnlineTurnDurationSeconds) ||
    !validateBoardConfig(boardConfig) ||
    (settings.punishmentConfig !== undefined && !punishmentIsGeneratable) ||
    (settings.traps !== undefined && !validateTrapConfig(settings.traps))
  ) {
    return null
  }
  const traps = normalizeTrapConfig(settings.traps, DEFAULT_ONLINE_ROOM_SETTINGS.traps)
  return cloneOnlineRoomSettings({
    scenePreset,
    boardPreset,
    boardConfig,
    turnDurationSeconds: turnDurationSeconds as OnlineTurnDurationSeconds,
    punishmentConfig,
    traps,
  })
}

export function projectOnlineRoomSettings(
  settings: OnlineRoomSettings,
  includePrivate = false
): OnlineRoomSettingsView {
  const publicSettings: OnlineRoomSettingsView = {
    scenePreset: settings.scenePreset,
    boardPreset: settings.boardPreset,
    boardConfig: normalizeBoardConfig(settings.boardConfig),
    turnDurationSeconds: settings.turnDurationSeconds,
  }
  return includePrivate
    ? {
        ...publicSettings,
        punishmentConfig: normalizePunishmentConfig(settings.punishmentConfig),
        traps: normalizeTrapConfig(settings.traps),
      }
    : publicSettings
}

export function isValidOnlineRoomSettings(value: unknown): value is OnlineRoomSettings {
  return normalizeOnlineRoomSettings(value) !== null
}

export interface OnlinePlayerInput {
  readonly id: string
  readonly nickname: string
  readonly color: string
}

export interface OnlinePlayer extends OnlinePlayerInput {
  readonly position: number
  readonly hasTakenOff: boolean
  readonly failedTakeoffAttempts: number
  readonly isWinner: boolean
  readonly pendingSkippedTurns?: number
  readonly pendingMiniGameImmunity?: boolean
  readonly pendingMiniGameMultiplier?: number
  readonly pendingMercyMultiplier?: number
}

export type OnlineTurnPhase =
  | 'awaiting_prediction'
  | 'awaiting_roll'
  | 'awaiting_reaction'
  | 'awaiting_move'
  | 'awaiting_punishment_choice'
  | 'awaiting_punishment_intervention'
  | 'awaiting_punishment_count'
  | 'awaiting_punishment_variant'
  | 'awaiting_acknowledgement'
  | 'awaiting_mercy_decision'
  | 'awaiting_content'
  | 'awaiting_chain_roll'
  | 'awaiting_event'
  | 'awaiting_mini_game'
  | 'awaiting_tiebreak'
  | 'finished'

interface PendingPunishmentChoice {
  readonly kind: 'punishment_choice'
  readonly playerIndex: number
  readonly source: 'board_punishment' | 'takeoff_failure'
  readonly cellType: 'punishment' | 'chain_punishment'
  readonly fallback: PunishmentAction
  readonly choices: readonly [PunishmentAction, PunishmentAction]
  readonly diceValue: number
}

interface PendingPunishmentIntervention {
  readonly kind: 'punishment_intervention'
  readonly resolution: ResolvedPunishmentResult
  readonly options: readonly PartyPunishmentInterventionOption[]
  readonly declinedPlayerIndices: readonly number[]
  readonly chainActive: boolean
  readonly amplified: boolean
}

interface PendingPunishmentCount {
  readonly kind: 'punishment_count'
  readonly resolution: ResolvedPunishmentResult
  readonly chooserPlayerIndex: number
  readonly chainActive: boolean
  readonly amplified: boolean
  readonly resumeTurnAfter: boolean
}

interface PendingPunishmentVariant {
  readonly kind: 'punishment_variant'
  readonly resolution: ResolvedPunishmentResult
  readonly decisionPlayerIndex: number
  readonly chainActive: boolean
  readonly amplified: boolean
  readonly resumeTurnAfter: boolean
}

interface PendingAcknowledgement {
  readonly kind: 'acknowledgement'
  readonly playerIndex: number
  readonly resolution: ResolvedPunishmentResult
  readonly chainActive: boolean
  readonly amplified: boolean
  readonly isBoundCopy: boolean
  readonly resumeTurnAfter: boolean
  readonly mercyAvailable: boolean
  readonly doubled: boolean
  readonly participantPlayerIndices: readonly number[]
  readonly bindingSourcePlayerIndex: number
}

interface PendingMercyDecision {
  readonly kind: 'mercy_decision'
  readonly resolution: ResolvedPunishmentResult
  readonly requesterPlayerIndex: number
  readonly decisionPlayerIndex: number
  readonly chainActive: boolean
  readonly amplified: boolean
  readonly isBoundCopy: boolean
  readonly resumeTurnAfter: boolean
  readonly doubled: boolean
  readonly participantPlayerIndices: readonly number[]
  readonly bindingSourcePlayerIndex: number
}

interface PendingChainRoll {
  readonly kind: 'chain_roll'
  readonly playerIndex: number
  readonly chainCount: number
}

interface PendingContent {
  readonly kind: 'content'
  readonly playerIndex: number
  readonly contentType: 'trap' | 'qa' | 'dare' | 'cell_effect'
  readonly description: string
  readonly canRefuse: boolean
  readonly nextPosition?: number
  readonly skippedTurns?: number
  readonly followLanding: boolean
  readonly chainDepth: number
}

interface PendingEventVote {
  readonly kind: 'event_vote'
  readonly card: PartyEventCard & {
    readonly effect: Extract<PartyEventCard['effect'], { kind: 'vote' }>
  }
  readonly votes: Readonly<Record<number, number>>
}

interface PendingEventActivation {
  readonly kind: 'event_activation'
  readonly card: PartyEventCard
}

interface PendingEventRps {
  readonly kind: 'event_rps'
  readonly card: PartyEventCard & {
    readonly effect: Extract<PartyEventCard['effect'], { kind: 'rock_paper_scissors' }>
  }
  readonly choices: Readonly<Record<number, PartyRockPaperScissorsChoice>>
}

interface PendingEventMiniGame {
  readonly kind: 'event_mini_game'
  readonly card: PartyEventCard & {
    readonly effect: Extract<PartyEventCard['effect'], { kind: 'mini_game' }>
  }
  readonly actorIndex: number
  readonly startedAt: number
  readonly goAt?: number
  readonly deadline?: number
  readonly sequence?: readonly string[]
  readonly options?: readonly string[]
}

interface PendingEventResult {
  readonly kind: 'event_result'
  readonly title: string
  readonly summary: string
}

interface PendingTieBreak {
  readonly kind: 'tiebreak'
  readonly state: PartyTieBreakState
}

type OnlinePendingAction =
  | PendingPunishmentChoice
  | PendingPunishmentIntervention
  | PendingPunishmentCount
  | PendingPunishmentVariant
  | PendingAcknowledgement
  | PendingMercyDecision
  | PendingChainRoll
  | PendingContent
  | PendingEventVote
  | PendingEventActivation
  | PendingEventRps
  | PendingEventMiniGame
  | PendingEventResult
  | PendingTieBreak

export interface OnlineVictorySettlementEntry {
  readonly playerId: string
  readonly place: number
  readonly count: number
}

export interface OnlineDeferredPunishment {
  readonly resolution: ResolvedPunishmentResult
  readonly amplified: boolean
  readonly chainActive: boolean
}

export interface OnlineGamePlayerView {
  readonly id: string
  readonly nickname: string
  readonly color: string
  readonly position: number
  readonly hasTakenOff: boolean
  readonly failedTakeoffAttempts: number
  readonly isWinner: boolean
  readonly pendingSkippedTurns?: number
}

export interface OnlineGameState {
  readonly schemaVersion: 1
  readonly rulesetVersion: typeof ONLINE_RULESET_VERSION
  readonly status: 'playing' | 'finished'
  readonly revision: number
  readonly boardSize: number
  readonly settings: OnlineRoomSettings
  readonly partySession: PartySession
  readonly board: readonly BoardCell[]
  readonly punishmentConfig: PunishmentConfig
  readonly pendingAction: OnlinePendingAction | null
  readonly eventState: PartyEventState
  readonly eventQueue: readonly PartyEventCard[]
  readonly deferredPunishments: readonly OnlineDeferredPunishment[]
  readonly turnHadPunishment: boolean
  readonly victoryConfig: VictoryConfig
  readonly winnerPlayerId: string | null
  readonly victorySettlement: readonly OnlineVictorySettlementEntry[]
  readonly currentPlayerId: string
  readonly phase: OnlineTurnPhase
  readonly diceValue: number | null
  readonly deadlineAt: number | null
  readonly players: readonly OnlinePlayer[]
  readonly lastEvent:
    | Readonly<{ type: 'game_started' }>
    | Readonly<{ type: 'dice_rolled'; playerId: string; value: number }>
    | Readonly<{
        type: 'player_moved'
        playerId: string
        from: number
        to: number
        tookOff: boolean
      }>
}

export type OnlineGameCommand =
  | Readonly<{ type: 'pause_game' }>
  | Readonly<{ type: 'resume_game' }>
  | Readonly<{ type: 'skip_action' }>
  | Readonly<{ type: 'submit_prediction'; prediction: PartyPrediction }>
  | Readonly<{ type: 'roll_dice' }>
  | Readonly<{ type: 'decide_reaction'; decision: PartyReactionDecision }>
  | Readonly<{ type: 'reroll' }>
  | Readonly<{ type: 'choose_punishment'; selectedIndex: 0 | 1 | null }>
  | Readonly<{
      type: 'intervene'
      action: PartyPunishmentIntervention['action']
      targetPlayerId?: string
    }>
  | Readonly<{ type: 'decline_intervention' }>
  | Readonly<{ type: 'choose_punishment_count'; count: number }>
  | Readonly<{ type: 'resolve_condition'; conditionMet: boolean }>
  | Readonly<{ type: 'defer_punishment'; defer: boolean }>
  | Readonly<{ type: 'acknowledge' }>
  | Readonly<{ type: 'request_mercy' }>
  | Readonly<{ type: 'decide_mercy'; accepted: boolean }>
  | Readonly<{ type: 'chain_roll' }>
  | Readonly<{ type: 'resolve_content'; accepted: boolean }>
  | Readonly<{ type: 'vote'; optionIndex: number }>
  | Readonly<{ type: 'resolve_event'; selectedPlayerIds?: readonly string[] }>
  | Readonly<{ type: 'acknowledge_event_result' }>
  | Readonly<{ type: 'rps'; choice: PartyRockPaperScissorsChoice }>
  | Readonly<{ type: 'mini_game_press' }>
  | Readonly<{ type: 'mini_game_memory_answer'; sequence: readonly string[] }>
  | Readonly<{ type: 'mini_game_quiz_result'; completed: boolean }>
  | Readonly<{ type: 'tiebreak_roll' }>
  | Readonly<{ type: 'move' }>

export type OnlineGameCommandName = OnlineGameCommand['type']
type OnlineActiveGameCommand = Exclude<
  OnlineGameCommand,
  Readonly<{ type: 'pause_game' | 'resume_game' | 'skip_action' }>
>

export interface OnlineGameView {
  readonly schemaVersion: 1
  readonly rulesetVersion: typeof ONLINE_RULESET_VERSION
  readonly status: OnlineGameState['status']
  readonly revision: number
  readonly boardSize: number
  readonly settings: OnlineRoomSettingsView
  readonly currentAct: PartyAct
  readonly roundNumber: number
  readonly heat: number
  readonly heatContributionByPlayer: readonly number[]
  readonly heatLimitPending: boolean
  readonly myTokensRemaining: number
  readonly reaction: Readonly<{
    status: NonNullable<PartySession['reaction']>['status']
    targetPlayerId: string
    reactorPlayerId: string
    prediction?: PartyPrediction
    predictionCorrect?: boolean
  }> | null
  readonly board: readonly Readonly<{
    position: number
    type: BoardCell['type']
    effect?: Readonly<{
      type: NonNullable<BoardCell['effect']>['type']
      value: number
    }>
  }>[]
  readonly pendingAction:
    | Readonly<{
        kind: 'punishment_choice'
        choices?: readonly Readonly<{ description: string }>[]
      }>
    | Readonly<{
        kind: 'punishment_intervention'
        actions?: readonly PartyPunishmentIntervention['action'][]
        transferTargetPlayerIds?: readonly string[]
      }>
    | Readonly<{
        kind: 'punishment_count'
        minimum?: number
        maximum?: number
        step?: number
      }>
    | Readonly<{
        kind: 'punishment_variant'
        variant?: ResolvedPunishmentResult['variant']
        description?: string
      }>
    | Readonly<{
        kind: 'acknowledgement'
        description?: string
      }>
    | Readonly<{
        kind: 'mercy_decision'
        description?: string
        requesterPlayerId?: string
      }>
    | Readonly<{
        kind: 'event_vote'
        title: string
        prompt: string
        options: readonly string[]
        submittedCount: number
        hasSubmitted: boolean
      }>
    | Readonly<{
        kind: 'event_activation'
        title: string
        description: string
        selectionPlayerCount: 0 | 2
      }>
    | Readonly<{
        kind: 'event_rps'
        title: string
        submittedCount: number
        hasSubmitted: boolean
      }>
    | Readonly<{
        kind: 'event_mini_game'
        title: string
        game: Extract<PartyEventCard['effect'], { kind: 'mini_game' }>['game']
        actorPlayerId: string
        goAt?: number
        deadline?: number
        sequence?: readonly string[]
        options?: readonly string[]
      }>
    | Readonly<{ kind: 'event_result'; title: string; summary: string }>
    | Readonly<{
        kind: 'tiebreak'
        candidatePlayerIds: readonly string[]
        currentPlayerId: string
        roundNumber: number
        rolls: Readonly<Record<string, number>>
      }>
    | Readonly<{ kind: 'chain_roll'; chainCount: number }>
    | Readonly<{
        kind: 'content'
        contentType: PendingContent['contentType']
        description: string
        canRefuse: boolean
      }>
    | null
  readonly winnerPlayerId: string | null
  readonly victorySettlement: readonly OnlineVictorySettlementEntry[]
  readonly currentPlayerId: string
  readonly phase: OnlineTurnPhase
  readonly diceValue: number | null
  readonly paused: boolean
  readonly deadlineAt: number | null
  readonly players: readonly OnlineGamePlayerView[]
  readonly allowedCommands: readonly OnlineGameCommandName[]
  readonly lastEvent: OnlineGameState['lastEvent']
}

export type {
  OnlineClientMessage,
  OnlineRoomPlayerView,
  OnlineRoomView,
  OnlineServerMessage,
} from './onlineProtocol'
export class GameCommandError extends Error {
  constructor(
    readonly code:
      | 'INVALID_ROSTER'
      | 'INVALID_SETTINGS'
      | 'GAME_FINISHED'
      | 'PLAYER_NOT_FOUND'
      | 'NOT_AUTHORIZED'
      | 'NOT_YOUR_TURN'
      | 'INVALID_PHASE'
      | 'INVALID_DICE',
    message: string
  ) {
    super(message)
    this.name = 'GameCommandError'
  }
}

export type OnlineCommandAuthority = 'player' | 'host' | 'system'

export interface OnlineCommandContext {
  readonly actorPlayerId: string
  readonly authority: OnlineCommandAuthority
}

export interface OnlineGameProjectionContext {
  readonly authority: Exclude<OnlineCommandAuthority, 'system'>
}

export interface GameCommandDependencies {
  readonly rollDice: () => number
  readonly now?: () => number
  readonly randomInt?: (minimum: number, maximum: number) => number
  readonly choice?: <T>(entries: readonly T[]) => T
}

export interface OnlineGameCreationOptions {
  readonly board?: readonly BoardCell[]
  readonly punishmentConfig?: PunishmentConfig
  readonly startedAt?: number
  readonly eventDeck?: readonly PartyEventCard[]
  readonly victoryConfig?: VictoryConfig
}

const ONLINE_BASELINE_PUNISHMENT_VARIANTS: readonly PunishmentVariant[] = [
  'blindbox',
  'conditional',
  'deferred',
  'mutual',
]

const DEFAULT_DEPENDENCIES: GameCommandDependencies = {
  rollDice: () => cryptoRandomInt(1, 6),
}

function ruleRandomSourceFor(dependencies: GameCommandDependencies): RuleRandomSource | undefined {
  if (!dependencies.randomInt && !dependencies.choice) return undefined
  const randomInt = dependencies.randomInt ?? cryptoRandomInt
  return {
    randomInt,
    choice:
      dependencies.choice ??
      (entries => {
        const selected = entries[randomInt(0, entries.length - 1)]
        if (selected === undefined) throw new Error('不能从空集合中选择')
        return selected
      }),
  }
}

export function createOnlineGame(
  roster: readonly OnlinePlayerInput[],
  settings: OnlineRoomSettings = DEFAULT_ONLINE_ROOM_SETTINGS,
  options: OnlineGameCreationOptions = {}
): OnlineGameState {
  if (
    roster.length < 2 ||
    roster.length > 8 ||
    new Set(roster.map(player => player.id)).size !== roster.length
  ) {
    throw new GameCommandError('INVALID_ROSTER', '联网升温局需要 2–8 名身份唯一的玩家')
  }
  if (!isValidOnlineRoomSettings(settings)) {
    throw new GameCommandError('INVALID_SETTINGS', '联机房间设置无效')
  }
  const firstPlayer = roster[0]
  if (!firstPlayer) throw new GameCommandError('INVALID_ROSTER', '玩家名单不能为空')
  const resolvedSettings = cloneOnlineRoomSettings(settings)
  const punishmentConfig = options.punishmentConfig ?? resolvedSettings.punishmentConfig
  const baselineTraps = resolvedSettings.traps
    .filter(
      trap =>
        !trap.trapVariant?.startsWith('mini_game_') || trap.trapVariant === 'mini_game_reaction'
    )
    .filter(trap => resolvedSettings.scenePreset !== 'couple' || trap.trapVariant !== 'all_players')
  const standardConfig = createStandardConfigSnapshot()
  standardConfig.punishmentConfig = punishmentConfig
  const onlineConfig = createModeConfig('online_party', standardConfig)
  onlineConfig.boardConfig = normalizeBoardConfig(resolvedSettings.boardConfig)
  onlineConfig.traps = baselineTraps.map(trap => ({ ...trap }))
  const board = options.board ? [...options.board] : createSharedBoard(onlineConfig)
  const partySession = beginPartyTurn(
    createPartySession({ playerCount: roster.length, startedAt: options.startedAt ?? 0 }),
    0
  )
  return {
    schemaVersion: 1,
    rulesetVersion: ONLINE_RULESET_VERSION,
    status: 'playing',
    revision: 1,
    boardSize: board.length,
    settings: resolvedSettings,
    partySession,
    board,
    punishmentConfig: onlineConfig.punishmentConfig,
    pendingAction: null,
    eventState: createPartyEventState(options.eventDeck),
    eventQueue: [],
    deferredPunishments: [],
    turnHadPunishment: false,
    victoryConfig: options.victoryConfig ?? { ...DEFAULT_VICTORY_CONFIG },
    winnerPlayerId: null,
    victorySettlement: [],
    currentPlayerId: firstPlayer.id,
    phase: 'awaiting_prediction',
    diceValue: null,
    deadlineAt: (options.startedAt ?? 0) + resolvedSettings.turnDurationSeconds * 1_000,
    players: roster.map(player => ({
      ...player,
      position: 0,
      hasTakenOff: false,
      failedTakeoffAttempts: 0,
      isWinner: false,
    })),
    lastEvent: { type: 'game_started' },
  }
}

export function applyOnlineGameCommand(
  state: OnlineGameState,
  actor: string | OnlineCommandContext,
  command: OnlineGameCommand,
  dependencies: GameCommandDependencies = DEFAULT_DEPENDENCIES
): OnlineGameState {
  const commandContext: OnlineCommandContext =
    typeof actor === 'string' ? { actorPlayerId: actor, authority: 'player' } : actor
  const actorId = commandContext.actorPlayerId
  const now = dependencies.now?.() ?? Date.now()
  if (command.type === 'pause_game') {
    if (state.status === 'finished') throw new GameCommandError('GAME_FINISHED', '本局已经结束')
    if (!state.players.some(player => player.id === actorId)) {
      throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')
    }
    if (state.partySession.pausedAt !== undefined) return state
    return {
      ...state,
      revision: state.revision + 1,
      partySession: pausePartySession(state.partySession, now),
    }
  }
  if (command.type === 'resume_game') {
    if (!state.players.some(player => player.id === actorId)) {
      throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')
    }
    const pausedAt = state.partySession.pausedAt
    if (pausedAt === undefined) return state
    return {
      ...state,
      revision: state.revision + 1,
      partySession: resumePartySession(state.partySession, now),
      deadlineAt: state.deadlineAt === null ? null : state.deadlineAt + Math.max(0, now - pausedAt),
    }
  }
  if (state.partySession.pausedAt !== undefined) {
    throw new GameCommandError('INVALID_PHASE', '游戏已暂停，请先恢复')
  }
  if (command.type === 'skip_action') {
    const skipped = skipOnlineGameAction(state, commandContext, dependencies)
    return scheduleOnlineDeadline(state, skipped, now)
  }
  const next = applyOnlineGameCommandInternal(
    state,
    actorId,
    command as OnlineActiveGameCommand,
    dependencies
  )
  return scheduleOnlineDeadline(state, next, now)
}

function applyOnlineGameCommandInternal(
  state: OnlineGameState,
  actorId: string,
  command: OnlineActiveGameCommand,
  dependencies: GameCommandDependencies = DEFAULT_DEPENDENCIES
): OnlineGameState {
  if (state.status === 'finished') {
    throw new GameCommandError('GAME_FINISHED', '本局已经结束')
  }
  const actorIndex = state.players.findIndex(player => player.id === actorId)
  if (actorIndex < 0) throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')

  if (command.type === 'tiebreak_roll') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_tiebreak' || pending?.kind !== 'tiebreak') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待完成的并列决胜')
    }
    const value = dependencies.rollDice()
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new GameCommandError('INVALID_DICE', '骰子随机源必须返回 1–6 的整数')
    }
    const result = rollPartyTieBreak(pending.state, actorIndex, value)
    if (result.winnerPlayerIndex !== undefined) {
      return finishOnlineGame(state, result.winnerPlayerIndex)
    }
    const nextIndex = result.state.candidatePlayerIndices[result.state.currentCandidateOffset]
    const nextPlayer = nextIndex === undefined ? undefined : state.players[nextIndex]
    if (!nextPlayer) throw new GameCommandError('INVALID_ROSTER', '无法确定下一名决胜玩家')
    return {
      ...state,
      revision: state.revision + 1,
      currentPlayerId: nextPlayer.id,
      pendingAction: { kind: 'tiebreak', state: result.state },
    }
  }

  if (command.type === 'submit_prediction') {
    if (state.phase !== 'awaiting_prediction') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待预测的反应机会')
    }
    const reaction = state.partySession.reaction
    if (reaction?.reactorPlayerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有本轮反应者可以预测')
    }
    return {
      ...state,
      revision: state.revision + 1,
      partySession: submitPartyPrediction(state.partySession, {
        playerIndex: actorIndex,
        prediction: command.prediction,
      }),
      phase: 'awaiting_roll',
    }
  }

  if (command.type === 'roll_dice') {
    requireCurrentPlayer(state, actorId)
    if (state.phase !== 'awaiting_roll') {
      throw new GameCommandError('INVALID_PHASE', '当前不能掷骰')
    }
    const value = dependencies.rollDice()
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new GameCommandError('INVALID_DICE', '骰子随机源必须返回 1–6 的整数')
    }
    const partySession =
      state.partySession.reaction?.status === 'awaiting_roll'
        ? resolvePartyReactionRoll(state.partySession, value)
        : state.partySession
    const awaitsReaction = partySession.reaction?.status === 'awaiting_decision'
    const eventSignaled = signalPartyEvent(state, { kind: 'dice_value', value })
    return {
      ...eventSignaled,
      revision: state.revision + 1,
      partySession,
      phase: awaitsReaction ? 'awaiting_reaction' : 'awaiting_move',
      diceValue: value,
      lastEvent: { type: 'dice_rolled', playerId: actorId, value },
    }
  }

  if (command.type === 'decide_reaction') {
    if (state.phase !== 'awaiting_reaction') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待决定的反应机会')
    }
    const reaction = state.partySession.reaction
    if (reaction?.reactorPlayerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有本轮反应者可以决定点数')
    }
    const partySession = decidePartyReaction(state.partySession, {
      playerIndex: actorIndex,
      decision: command.decision,
    })
    return {
      ...state,
      revision: state.revision + 1,
      partySession,
      phase: 'awaiting_move',
      diceValue: partySession.reaction?.finalDiceValue ?? state.diceValue,
    }
  }

  if (command.type === 'choose_punishment') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_punishment_choice' || pending?.kind !== 'punishment_choice') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待选择的惩罚')
    }
    if (pending.playerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有当前玩家可以选择惩罚')
    }
    const selectedAction =
      command.selectedIndex === null ? pending.fallback : pending.choices[command.selectedIndex]
    const partySession =
      command.selectedIndex === null
        ? state.partySession
        : spendPartyToken(state.partySession, {
            playerIndex: actorIndex,
            action: 'punishment_choice',
          })
    return beginPunishmentResolution(
      { ...state, partySession, pendingAction: null },
      pending,
      selectedAction,
      dependencies
    )
  }

  if (command.type === 'intervene' || command.type === 'decline_intervention') {
    const pending = state.pendingAction
    if (
      state.phase !== 'awaiting_punishment_intervention' ||
      pending?.kind !== 'punishment_intervention'
    ) {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待处理的惩罚干预')
    }
    const option = pending.options.find(candidate => candidate.playerIndex === actorIndex)
    if (!option) throw new GameCommandError('NOT_YOUR_TURN', '当前玩家没有本次干预资格')
    if (command.type === 'decline_intervention') {
      const declined = [...new Set([...pending.declinedPlayerIndices, actorIndex])]
      if (pending.options.every(candidate => declined.includes(candidate.playerIndex))) {
        return preparePunishmentDecision(state, pending.resolution, {
          chainActive: pending.chainActive,
          amplified: pending.amplified,
        })
      }
      return {
        ...state,
        revision: state.revision + 1,
        pendingAction: { ...pending, declinedPlayerIndices: declined },
      }
    }
    if (!option.actions.includes(command.action)) {
      throw new GameCommandError('INVALID_PHASE', '当前玩家不能执行该干预')
    }
    const targetPlayerIndex = command.targetPlayerId
      ? state.players.findIndex(player => player.id === command.targetPlayerId)
      : undefined
    const intervention: PartyPunishmentIntervention =
      command.action === 'transfer'
        ? {
            action: command.action,
            playerIndex: actorIndex,
            targetPlayerIndex: targetPlayerIndex ?? -1,
          }
        : { action: command.action, playerIndex: actorIndex }
    const outcome = applyPartyPunishmentIntervention(
      pending.resolution,
      intervention,
      state.players.length
    )
    const partySession = spendPartyToken(state.partySession, {
      playerIndex: actorIndex,
      action: outcome.action,
    })
    if (!outcome.resolution) {
      if (pending.chainActive) {
        return awaitChainRoll({ ...state, partySession, pendingAction: null }, actorIndex, 1)
      }
      return completeOnlineTurn(
        { ...state, partySession, pendingAction: null },
        state.players,
        state.players.findIndex(player => player.id === state.currentPlayerId),
        false,
        dependencies.now?.()
      )
    }
    return preparePunishmentDecision(
      { ...state, partySession, pendingAction: null },
      outcome.resolution,
      {
        chainActive: pending.chainActive,
        amplified: pending.amplified || outcome.action === 'amplify',
      }
    )
  }

  if (command.type === 'choose_punishment_count') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_punishment_count' || pending?.kind !== 'punishment_count') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待选择的惩罚次数')
    }
    if (pending.chooserPlayerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有指定玩家可以选择次数')
    }
    const resolution = finalizePunishmentCount(pending.resolution, command.count)
    return preparePunishmentDecision({ ...state, pendingAction: null }, resolution, {
      chainActive: pending.chainActive,
      amplified: pending.amplified,
      resumeTurnAfter: pending.resumeTurnAfter,
    })
  }

  if (command.type === 'request_mercy') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_acknowledgement' || pending?.kind !== 'acknowledgement') {
      throw new GameCommandError('INVALID_PHASE', '当前没有可以求饶的惩罚')
    }
    if (pending.playerIndex !== actorIndex || !pending.mercyAvailable) {
      throw new GameCommandError('NOT_YOUR_TURN', '当前玩家不能发起求饶')
    }
    const decisionPlayerIndex = pending.resolution.executorIndex
    if (
      decisionPlayerIndex === undefined ||
      pending.resolution.count.kind !== 'fixed' ||
      pending.resolution.count.value <= 1
    ) {
      throw new GameCommandError('INVALID_PHASE', '本次惩罚不支持求饶')
    }
    return {
      ...state,
      revision: state.revision + 1,
      phase: 'awaiting_mercy_decision',
      pendingAction: {
        kind: 'mercy_decision',
        resolution: pending.resolution,
        requesterPlayerIndex: actorIndex,
        decisionPlayerIndex,
        chainActive: pending.chainActive,
        amplified: pending.amplified,
        isBoundCopy: pending.isBoundCopy,
        resumeTurnAfter: pending.resumeTurnAfter,
        doubled: pending.doubled,
        participantPlayerIndices: pending.participantPlayerIndices,
        bindingSourcePlayerIndex: pending.bindingSourcePlayerIndex,
      },
    }
  }

  if (command.type === 'decide_mercy') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_mercy_decision' || pending?.kind !== 'mercy_decision') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待决定的求饶')
    }
    if (pending.decisionPlayerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有执行者可以决定是否接受求饶')
    }
    const resolution = command.accepted
      ? scaleResolvedPunishmentCount(pending.resolution, 0.5)
      : pending.resolution
    const players = command.accepted
      ? state.players.map((player, index) =>
          index === pending.requesterPlayerIndex
            ? { ...player, pendingMercyMultiplier: 1.5 }
            : player
        )
      : state.players
    return awaitPunishmentAcknowledgement({ ...state, players, pendingAction: null }, resolution, {
      chainActive: pending.chainActive,
      amplified: pending.amplified,
      isBoundCopy: pending.isBoundCopy,
      resumeTurnAfter: pending.resumeTurnAfter,
      mercyAvailable: false,
      doubled: pending.doubled,
      participantPlayerIndices: pending.participantPlayerIndices,
      bindingSourcePlayerIndex: pending.bindingSourcePlayerIndex,
    })
  }

  if (command.type === 'resolve_condition' || command.type === 'defer_punishment') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_punishment_variant' || pending?.kind !== 'punishment_variant') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待处理的惩罚变体')
    }
    if (pending.decisionPlayerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有相关玩家可以处理惩罚变体')
    }
    if (command.type === 'resolve_condition') {
      if (pending.resolution.variant !== 'conditional') {
        throw new GameCommandError('INVALID_PHASE', '当前不是条件惩罚')
      }
      return awaitPunishmentAcknowledgement(
        { ...state, pendingAction: null },
        resolveConditionalPunishment(pending.resolution, command.conditionMet),
        {
          chainActive: pending.chainActive,
          amplified: pending.amplified,
          resumeTurnAfter: pending.resumeTurnAfter,
        }
      )
    }
    if (pending.resolution.variant !== 'deferred') {
      throw new GameCommandError('INVALID_PHASE', '当前不是延迟惩罚')
    }
    if (!command.defer) {
      return awaitPunishmentAcknowledgement({ ...state, pendingAction: null }, pending.resolution, {
        chainActive: pending.chainActive,
        amplified: pending.amplified,
        resumeTurnAfter: pending.resumeTurnAfter,
      })
    }
    const deferred = createDeferredPunishment(pending.resolution)
    const queued = {
      ...state,
      revision: state.revision + 1,
      pendingAction: null,
      deferredPunishments: [
        ...state.deferredPunishments,
        {
          resolution: deferred,
          amplified: pending.amplified,
          chainActive: pending.chainActive,
        },
      ],
    }
    return pending.chainActive
      ? awaitChainRoll(queued, pending.resolution.actorIndex, 1)
      : completeOnlineTurn(
          queued,
          queued.players,
          queued.players.findIndex(player => player.id === queued.currentPlayerId),
          false,
          dependencies.now?.()
        )
  }

  if (command.type === 'acknowledge') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_acknowledgement' || pending?.kind !== 'acknowledgement') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待确认的结果')
    }
    if (pending.playerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有相关玩家可以确认结果')
    }
    return continueAfterPunishmentAcknowledgement(state, pending, dependencies)
  }

  if (command.type === 'chain_roll') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_chain_roll' || pending?.kind !== 'chain_roll') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待结算的连锁骰子')
    }
    if (pending.playerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有当前玩家可以投掷连锁骰子')
    }
    const value = dependencies.rollDice()
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new GameCommandError('INVALID_DICE', '骰子随机源必须返回 1–6 的整数')
    }
    if (value % 2 === 0 || pending.chainCount >= 5) {
      return completeOnlineTurn(
        { ...state, pendingAction: null },
        state.players,
        actorIndex,
        false,
        dependencies.now?.()
      )
    }
    const action = createCompatiblePunishmentAction(
      state.punishmentConfig,
      undefined,
      onlineActConstraints(state)
    )
    return beginPunishmentResolution(
      { ...state, pendingAction: null },
      {
        kind: 'punishment_choice',
        playerIndex: actorIndex,
        source: 'board_punishment',
        cellType: 'chain_punishment',
        fallback: action,
        choices: [action, action],
        diceValue: value,
      },
      action,
      dependencies,
      pending.chainCount + 1
    )
  }

  if (command.type === 'resolve_content') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_content' || pending?.kind !== 'content') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待确认的格子内容')
    }
    if (pending.playerIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有相关玩家可以确认格子内容')
    }
    if (!command.accepted && !pending.canRefuse) {
      throw new GameCommandError('INVALID_PHASE', '当前内容不能拒绝')
    }
    if (!command.accepted && pending.contentType === 'qa') {
      const action = createCompatiblePunishmentAction(
        state.punishmentConfig,
        undefined,
        onlineActConstraints(state)
      )
      return beginPunishmentResolution(
        { ...state, pendingAction: null },
        {
          kind: 'punishment_choice',
          playerIndex: actorIndex,
          source: 'board_punishment',
          cellType: 'punishment',
          fallback: action,
          choices: [action, action],
          diceValue: state.diceValue ?? 1,
        },
        action,
        dependencies
      )
    }
    const players = state.players.map((player, index) =>
      index === actorIndex
        ? {
            ...player,
            position: pending.nextPosition ?? player.position,
            pendingSkippedTurns: (player.pendingSkippedTurns ?? 0) + (pending.skippedTurns ?? 0),
          }
        : player
    )
    const resolvedState = {
      ...state,
      revision: state.revision + 1,
      players,
      pendingAction: null,
    }
    if (pending.followLanding) {
      const cellEffect = state.board.find(
        cell => cell.position === players[actorIndex]?.position
      )?.effect
      return beginLandingResolution(
        resolvedState,
        actorIndex,
        cellEffect,
        dependencies,
        pending.chainDepth + 1
      )
    }
    return completeOnlineTurn(resolvedState, players, actorIndex, false, dependencies.now?.())
  }

  if (command.type === 'vote') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_event' || pending?.kind !== 'event_vote') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待提交的事件投票')
    }
    if (pending.votes[actorIndex] !== undefined) {
      throw new GameCommandError('INVALID_PHASE', '当前玩家已经投票')
    }
    if (
      !Number.isInteger(command.optionIndex) ||
      command.optionIndex < 0 ||
      command.optionIndex >= pending.card.effect.options.length
    ) {
      throw new GameCommandError('INVALID_PHASE', '投票选项无效')
    }
    const votes = { ...pending.votes, [actorIndex]: command.optionIndex }
    if (Object.keys(votes).length < state.players.length) {
      return {
        ...state,
        revision: state.revision + 1,
        pendingAction: { ...pending, votes },
      }
    }
    const result = tallyPartyVotes(
      pending.card.effect.options,
      state.players.map((_, index) => votes[index] ?? -1)
    )
    const winners = result.winningOptionIndices.map(
      optionIndex => pending.card.effect.options[optionIndex] ?? ''
    )
    return showEventResult(
      {
        ...state,
        revision: state.revision + 1,
        eventState: activatePartyEvent(state.eventState, pending.card),
        pendingAction: null,
      },
      pending.card.title,
      `投票结果：${winners.join('、')}`
    )
  }

  if (command.type === 'resolve_event') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_event' || pending?.kind !== 'event_activation') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待激活的事件')
    }
    requireCurrentPlayer(state, actorId)
    const selectedPlayerIndices = (command.selectedPlayerIds ?? []).map(playerId =>
      state.players.findIndex(player => player.id === playerId)
    )
    if (selectedPlayerIndices.some(index => index < 0)) {
      throw new GameCommandError('PLAYER_NOT_FOUND', '事件选择了不在房间中的玩家')
    }
    const requiredSelectionCount = pending.card.effect.kind === 'bind_players' ? 2 : 0
    if (
      selectedPlayerIndices.length !== requiredSelectionCount ||
      new Set(selectedPlayerIndices).size !== selectedPlayerIndices.length
    ) {
      throw new GameCommandError(
        'INVALID_PHASE',
        requiredSelectionCount === 2 ? '绑定事件需要两名不同玩家' : '当前事件不需要选择玩家'
      )
    }
    if (pending.card.effect.kind === 'mini_game') {
      return startEventMiniGame(
        state,
        pending.card as PendingEventMiniGame['card'],
        actorIndex,
        dependencies
      )
    }
    return resumeAfterEvent({
      ...state,
      revision: state.revision + 1,
      eventState: activatePartyEvent(state.eventState, pending.card, selectedPlayerIndices),
      pendingAction: null,
    })
  }

  if (command.type === 'rps') {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_event' || pending?.kind !== 'event_rps') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待提交的猜拳事件')
    }
    if (pending.choices[actorIndex] !== undefined) {
      throw new GameCommandError('INVALID_PHASE', '当前玩家已经出拳')
    }
    const choices = { ...pending.choices, [actorIndex]: command.choice }
    if (Object.keys(choices).length < state.players.length) {
      return {
        ...state,
        revision: state.revision + 1,
        pendingAction: { ...pending, choices },
      }
    }
    const revealedChoices = state.players.map((_, index) => choices[index] ?? 'rock')
    const result = resolvePartyRockPaperScissors(revealedChoices)
    const choiceLabels = { rock: '石头', paper: '布', scissors: '剪刀' } as const
    const choicesSummary = state.players
      .map(
        (player, index) => `${player.nickname}：${choiceLabels[revealedChoices[index] ?? 'rock']}`
      )
      .join('；')
    const winnerNames = result.winnerPlayerIndices
      .map(index => state.players[index]?.nickname ?? '')
      .filter(Boolean)
    return showEventResult(
      {
        ...state,
        revision: state.revision + 1,
        eventState: activatePartyEvent(state.eventState, pending.card),
        pendingAction: null,
      },
      pending.card.title,
      `${choicesSummary}。赢家：${winnerNames.join('、')}`
    )
  }

  if (command.type === 'acknowledge_event_result') {
    if (state.phase !== 'awaiting_event' || state.pendingAction?.kind !== 'event_result') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待确认的事件结果')
    }
    requireCurrentPlayer(state, actorId)
    return resumeAfterEvent({ ...state, revision: state.revision + 1, pendingAction: null })
  }

  if (
    command.type === 'mini_game_press' ||
    command.type === 'mini_game_memory_answer' ||
    command.type === 'mini_game_quiz_result'
  ) {
    const pending = state.pendingAction
    if (state.phase !== 'awaiting_mini_game' || pending?.kind !== 'event_mini_game') {
      throw new GameCommandError('INVALID_PHASE', '当前没有等待完成的小游戏')
    }
    const now = dependencies.now?.() ?? Date.now()
    if (command.type === 'mini_game_press') {
      if (pending.card.effect.game !== 'reaction' || now < (pending.goAt ?? Infinity)) {
        throw new GameCommandError('INVALID_PHASE', '反应挑战尚未开始')
      }
      return finishEventMiniGame(state, pending, [actorIndex], [])
    }
    if (pending.actorIndex !== actorIndex) {
      throw new GameCommandError('NOT_YOUR_TURN', '只有小游戏参与者可以提交结果')
    }
    if (command.type === 'mini_game_memory_answer') {
      if (pending.card.effect.game !== 'memory' || !pending.sequence || !pending.options) {
        throw new GameCommandError('INVALID_PHASE', '当前不是记忆挑战')
      }
      if (
        command.sequence.length !== pending.sequence.length ||
        command.sequence.some(symbol => !pending.options?.includes(symbol))
      ) {
        throw new GameCommandError('INVALID_PHASE', '记忆答案格式无效')
      }
      const correct = command.sequence.every(
        (symbol, index) => symbol === pending.sequence?.[index]
      )
      return finishEventMiniGame(
        state,
        pending,
        correct ? [actorIndex] : [],
        correct ? [] : [actorIndex]
      )
    }
    if (pending.card.effect.game !== 'quick_quiz') {
      throw new GameCommandError('INVALID_PHASE', '当前不是快速问答')
    }
    const succeeded = command.completed && now <= (pending.deadline ?? -1)
    return finishEventMiniGame(
      state,
      pending,
      succeeded ? [actorIndex] : [],
      succeeded ? [] : [actorIndex]
    )
  }

  requireCurrentPlayer(state, actorId)

  if (command.type === 'reroll') {
    if (state.phase !== 'awaiting_move') {
      throw new GameCommandError('INVALID_PHASE', '当前不能重掷')
    }
    if (
      state.partySession.diceChangedThisTurn ||
      state.partySession.interventionUsedThisTurn !== undefined ||
      (state.partySession.tokensRemaining[actorIndex] ?? 0) <= 0
    ) {
      throw new GameCommandError('INVALID_PHASE', '本回合不能再次使用重掷筹码')
    }
    const value = dependencies.rollDice()
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new GameCommandError('INVALID_DICE', '骰子随机源必须返回 1–6 的整数')
    }
    const eventSignaled = signalPartyEvent(state, { kind: 'dice_value', value })
    return {
      ...eventSignaled,
      revision: state.revision + 1,
      partySession: spendPartyToken(state.partySession, {
        playerIndex: actorIndex,
        action: 'reroll',
      }),
      diceValue: value,
      lastEvent: { type: 'dice_rolled', playerId: actorId, value },
    }
  }

  if (state.phase !== 'awaiting_move' || state.diceValue === null) {
    throw new GameCommandError('INVALID_PHASE', '必须先由服务器掷骰才能移动')
  }
  const actor = state.players[actorIndex]
  if (!actor) throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')
  const rulePlayers = toRulePlayers(state.players)
  const ruleActor = rulePlayers[actorIndex]
  if (!ruleActor) throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')
  const movement = resolvePlayerMovement({
    player: ruleActor,
    diceValue: state.diceValue,
    board: state.board,
    currentPlayerIndex: actorIndex,
    totalPlayers: state.players.length,
    punishmentConfig: state.punishmentConfig,
    constraints: onlineActConstraints(state),
  })
  const moved: OnlinePlayer = {
    ...actor,
    position: movement.newPosition,
    hasTakenOff: movement.playerState.hasTakenOff,
    failedTakeoffAttempts: movement.playerState.failedTakeoffAttempts,
    isWinner: false,
  }
  const players = state.players.map((player, index) => (index === actorIndex ? moved : player))
  const finished = movement.newPosition === state.boardSize
  const movedState: OnlineGameState = {
    ...state,
    revision: state.revision + 1,
    players,
    lastEvent: {
      type: 'player_moved',
      playerId: actorId,
      from: actor.position,
      to: moved.position,
      tookOff: !actor.hasTakenOff && moved.hasTakenOff,
    },
  }
  if (finished) {
    return completeOnlineTurn(movedState, players, actorIndex, true, dependencies.now?.())
  }

  if (movement.punishment) {
    const source = actor.hasTakenOff ? 'board_punishment' : 'takeoff_failure'
    const cellType =
      movement.cellEffect?.type === 'chain_punishment' ? 'chain_punishment' : 'punishment'
    const constraints = onlineActConstraints(state)
    const fallback = actor.hasTakenOff
      ? createPartyPunishmentChoices(state.punishmentConfig, undefined, constraints)[0]
      : movement.punishment
    const canChoose =
      (state.partySession.tokensRemaining[actorIndex] ?? 0) > 0 &&
      state.partySession.interventionUsedThisTurn === undefined &&
      isPartyPunishmentChoiceEligible({ source, cellType, action: fallback })
    if (canChoose) {
      try {
        const choices = createPartyPunishmentChoices(state.punishmentConfig, undefined, constraints)
        return {
          ...movedState,
          phase: 'awaiting_punishment_choice',
          pendingAction: {
            kind: 'punishment_choice',
            playerIndex: actorIndex,
            source,
            cellType,
            fallback,
            choices,
            diceValue: state.diceValue,
          },
        }
      } catch {
        // A narrow valid configuration can legitimately have fewer than two unique choices.
      }
    }
    const pending: PendingPunishmentChoice = {
      kind: 'punishment_choice',
      playerIndex: actorIndex,
      source,
      cellType,
      fallback,
      choices: [fallback, fallback],
      diceValue: state.diceValue,
    }
    return beginPunishmentResolution(movedState, pending, fallback, dependencies)
  }

  if (movement.cellEffect) {
    return beginLandingResolution(movedState, actorIndex, movement.cellEffect, dependencies, 0)
  }

  return completeOnlineTurn(movedState, players, actorIndex, false, dependencies.now?.())
}

export { projectOnlineGameView } from './onlineProjection'

export function applyOnlineGameTimeout(
  state: OnlineGameState,
  now: number,
  dependencies: GameCommandDependencies = DEFAULT_DEPENDENCIES
): OnlineGameState {
  if (
    state.status === 'finished' ||
    state.partySession.pausedAt !== undefined ||
    state.deadlineAt === null ||
    now < state.deadlineAt
  ) {
    return state
  }
  const timedDependencies = { ...dependencies, now: () => now }
  const relevantPlayerId = timeoutDecisionPlayerId(state)
  if (relevantPlayerId) {
    return applyOnlineGameCommand(
      state,
      { actorPlayerId: relevantPlayerId, authority: 'system' },
      { type: 'skip_action' },
      timedDependencies
    )
  }
  if (
    state.pendingAction?.kind === 'punishment_intervention' ||
    state.pendingAction?.kind === 'event_vote' ||
    state.pendingAction?.kind === 'event_rps'
  ) {
    let next = state
    for (const player of state.players) {
      if (next.deadlineAt === null || next.deadlineAt > now) break
      try {
        next = applyOnlineGameCommand(
          next,
          { actorPlayerId: player.id, authority: 'system' },
          { type: 'skip_action' },
          timedDependencies
        )
      } catch (error) {
        if (!(error instanceof GameCommandError) || error.code !== 'NOT_YOUR_TURN') throw error
      }
    }
    return next
  }
  return { ...state, deadlineAt: null }
}

export function isOnlinePlayerRemovalSafe(state: OnlineGameState): boolean {
  return (
    state.status === 'playing' &&
    state.pendingAction === null &&
    (state.phase === 'awaiting_prediction' || state.phase === 'awaiting_roll')
  )
}

export function removeOnlinePlayerAtSafeNode(
  state: OnlineGameState,
  playerId: string
): OnlineGameState {
  if (!isOnlinePlayerRemovalSafe(state)) {
    throw new GameCommandError('INVALID_PHASE', '只能在新回合的安全节点移除离场玩家')
  }
  if (state.players.length <= 2) {
    throw new GameCommandError('INVALID_ROSTER', '联网升温局至少保留两名玩家')
  }
  const removedIndex = state.players.findIndex(player => player.id === playerId)
  if (removedIndex < 0) throw new GameCommandError('PLAYER_NOT_FOUND', '离场玩家不存在')
  const oldCurrentIndex = state.players.findIndex(player => player.id === state.currentPlayerId)
  const players = state.players.filter((_, index) => index !== removedIndex)
  const currentIndex =
    removedIndex < oldCurrentIndex
      ? oldCurrentIndex - 1
      : removedIndex === oldCurrentIndex
        ? oldCurrentIndex % players.length
        : oldCurrentIndex
  const currentPlayer = players[currentIndex]
  if (!currentPlayer) throw new GameCommandError('INVALID_ROSTER', '无法确定移除后的当前玩家')
  const completedRounds = Math.floor(
    state.partySession.completedTurns / state.partySession.playerCount
  )
  const remapIndex = (index: number): number | undefined => {
    if (index === removedIndex) return undefined
    return index > removedIndex ? index - 1 : index
  }
  const reactionTargetPlayerIndex =
    remapIndex(state.partySession.reactionTargetPlayerIndex) ?? currentIndex
  const momentumSession = removePartyMomentumPlayer(state.partySession, removedIndex)
  const binding = state.eventState.activeBinding
  const remappedBinding = binding ? binding.playerIndices.map(remapIndex) : undefined
  const deferredPunishments = state.deferredPunishments.flatMap(deferred => {
    const { resolution } = deferred
    const targetPlayerIndex = remapIndex(resolution.targetPlayerIndex)
    if (targetPlayerIndex === undefined) return []
    const actorPlayerIndex = remapIndex(resolution.actorIndex) ?? currentIndex
    const executorPlayerIndex =
      resolution.executorIndex === undefined ? undefined : remapIndex(resolution.executorIndex)
    const count =
      resolution.count.kind === 'awaiting_external_count'
        ? {
            ...resolution.count,
            eligibleChooserIndices: resolution.count.eligibleChooserIndices.flatMap(index => {
              const remapped = remapIndex(index)
              return remapped === undefined ? [] : [remapped]
            }),
          }
        : resolution.count
    return [
      {
        ...deferred,
        resolution: {
          ...resolution,
          actorIndex: actorPlayerIndex,
          targetPlayerIndex,
          executorIndex: executorPlayerIndex,
          count,
        },
      },
    ]
  })
  return {
    ...state,
    revision: state.revision + 1,
    players,
    currentPlayerId: currentPlayer.id,
    phase: 'awaiting_roll',
    deadlineAt: null,
    deferredPunishments,
    partySession: {
      ...momentumSession,
      playerCount: players.length,
      completedTurns: completedRounds * players.length + currentIndex,
      completedRounds,
      roundNumber: completedRounds + 1,
      activeTurnPlayerIndex: currentIndex,
      reactionTargetPlayerIndex,
      reactionUsedThisRound: true,
      reaction: undefined,
    },
    eventState: {
      ...state.eventState,
      activeBinding:
        binding &&
        remappedBinding?.length === 2 &&
        remappedBinding.every(index => index !== undefined)
          ? {
              ...binding,
              playerIndices: remappedBinding as [number, number],
            }
          : undefined,
    },
  }
}

function skipOnlineGameAction(
  state: OnlineGameState,
  context: OnlineCommandContext,
  dependencies: GameCommandDependencies
): OnlineGameState {
  const actorId = context.actorPlayerId
  const actorIndex = state.players.findIndex(player => player.id === actorId)
  if (actorIndex < 0) throw new GameCommandError('PLAYER_NOT_FOUND', '玩家不在本局中')
  if (context.authority === 'player' && !canPlayerSkipOwnOnlineAction(state, actorId)) {
    throw new GameCommandError('NOT_AUTHORIZED', '当前玩家不能跳过其他人的操作')
  }
  const pending = state.pendingAction
  if (state.phase === 'awaiting_prediction') {
    const reactor = state.players[state.partySession.reaction?.reactorPlayerIndex ?? -1]
    if (!reactor) throw new GameCommandError('INVALID_PHASE', '当前没有可跳过的预测')
    return applyOnlineGameCommandInternal(
      state,
      reactor.id,
      { type: 'submit_prediction', prediction: 'low' },
      dependencies
    )
  }
  if (state.phase === 'awaiting_reaction') {
    const reactor = state.players[state.partySession.reaction?.reactorPlayerIndex ?? -1]
    if (!reactor) throw new GameCommandError('INVALID_PHASE', '当前没有可跳过的反应决定')
    return applyOnlineGameCommandInternal(
      state,
      reactor.id,
      { type: 'decide_reaction', decision: 'keep' },
      dependencies
    )
  }
  if (state.phase === 'awaiting_roll' || state.phase === 'awaiting_move') {
    const currentIndex = state.players.findIndex(player => player.id === state.currentPlayerId)
    return completeOnlineTurn(state, state.players, currentIndex, false, dependencies.now?.())
  }
  if (pending?.kind === 'punishment_choice') {
    const player = state.players[pending.playerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '惩罚玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'choose_punishment', selectedIndex: null },
      dependencies
    )
  }
  if (pending?.kind === 'punishment_intervention') {
    const skippedPlayerIndex =
      context.authority === 'player'
        ? actorIndex
        : pending.options.find(
            candidate => !pending.declinedPlayerIndices.includes(candidate.playerIndex)
          )?.playerIndex
    const option = pending.options.find(candidate => candidate.playerIndex === skippedPlayerIndex)
    if (
      skippedPlayerIndex === undefined ||
      !option ||
      pending.declinedPlayerIndices.includes(skippedPlayerIndex)
    ) {
      throw new GameCommandError('NOT_YOUR_TURN', '当前玩家没有可跳过的干预')
    }
    const skippedPlayer = state.players[skippedPlayerIndex]
    if (!skippedPlayer) throw new GameCommandError('PLAYER_NOT_FOUND', '干预玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      skippedPlayer.id,
      { type: 'decline_intervention' },
      dependencies
    )
  }
  if (pending?.kind === 'punishment_count') {
    if (pending.resolution.count.kind !== 'awaiting_external_count') {
      throw new GameCommandError('INVALID_PHASE', '惩罚次数已经确定')
    }
    const player = state.players[pending.chooserPlayerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '次数选择玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'choose_punishment_count', count: pending.resolution.count.minimum },
      dependencies
    )
  }
  if (pending?.kind === 'punishment_variant') {
    const player = state.players[pending.decisionPlayerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '惩罚变体玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      pending.resolution.variant === 'conditional'
        ? { type: 'resolve_condition', conditionMet: false }
        : { type: 'defer_punishment', defer: false },
      dependencies
    )
  }
  if (pending?.kind === 'content') {
    const player = state.players[pending.playerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '格子内容玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'resolve_content', accepted: true },
      dependencies
    )
  }
  if (pending?.kind === 'mercy_decision') {
    const player = state.players[pending.decisionPlayerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '求饶决定玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'decide_mercy', accepted: false },
      dependencies
    )
  }
  if (pending?.kind === 'acknowledgement') {
    const player = state.players[pending.playerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '确认玩家不存在')
    return applyOnlineGameCommandInternal(state, player.id, { type: 'acknowledge' }, dependencies)
  }
  if (pending?.kind === 'event_vote') {
    const skippedPlayerIndex =
      context.authority === 'player'
        ? actorIndex
        : state.players.findIndex((_player, index) => pending.votes[index] === undefined)
    if (skippedPlayerIndex < 0 || pending.votes[skippedPlayerIndex] !== undefined) {
      throw new GameCommandError('NOT_YOUR_TURN', '当前玩家已经投票')
    }
    const skippedPlayer = state.players[skippedPlayerIndex]
    if (!skippedPlayer) throw new GameCommandError('PLAYER_NOT_FOUND', '投票玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      skippedPlayer.id,
      { type: 'vote', optionIndex: 0 },
      dependencies
    )
  }
  if (pending?.kind === 'event_rps') {
    const skippedPlayerIndex =
      context.authority === 'player'
        ? actorIndex
        : state.players.findIndex((_player, index) => pending.choices[index] === undefined)
    if (skippedPlayerIndex < 0 || pending.choices[skippedPlayerIndex] !== undefined) {
      throw new GameCommandError('NOT_YOUR_TURN', '当前玩家已经出拳')
    }
    const skippedPlayer = state.players[skippedPlayerIndex]
    if (!skippedPlayer) throw new GameCommandError('PLAYER_NOT_FOUND', '猜拳玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      skippedPlayer.id,
      { type: 'rps', choice: 'rock' },
      dependencies
    )
  }
  if (pending?.kind === 'event_activation') {
    return resumeAfterEvent({ ...state, revision: state.revision + 1, pendingAction: null })
  }
  if (pending?.kind === 'event_result') {
    return resumeAfterEvent({ ...state, revision: state.revision + 1, pendingAction: null })
  }
  if (pending?.kind === 'event_mini_game') {
    return finishEventMiniGame(state, pending, [], [pending.actorIndex])
  }
  if (pending?.kind === 'tiebreak') {
    const player =
      state.players[
        pending.state.candidatePlayerIndices[pending.state.currentCandidateOffset] ?? -1
      ]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '决胜玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'tiebreak_roll' },
      { ...dependencies, rollDice: () => 1 }
    )
  }
  if (pending?.kind === 'chain_roll') {
    const player = state.players[pending.playerIndex]
    if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '连锁玩家不存在')
    return applyOnlineGameCommandInternal(
      state,
      player.id,
      { type: 'chain_roll' },
      { ...dependencies, rollDice: () => 2 }
    )
  }
  throw new GameCommandError('INVALID_PHASE', '当前没有可跳过的操作')
}

function requireCurrentPlayer(state: OnlineGameState, actorId: string): void {
  if (state.currentPlayerId !== actorId) {
    throw new GameCommandError('NOT_YOUR_TURN', '当前不是你的回合')
  }
}

function onlineActConstraints(state: OnlineGameState): PunishmentConstraints {
  return onlinePunishmentConstraintsFor(state.settings.scenePreset, state.partySession.act)
}

function toRulePlayers(players: readonly OnlinePlayer[]): Player[] {
  return players.map((player, index) => ({
    id: index + 1,
    name: player.nickname,
    color: player.color,
    position: player.position,
    hasTakenOff: player.hasTakenOff,
    failedTakeoffAttempts: player.failedTakeoffAttempts,
    isWinner: player.isWinner,
    pendingSkippedTurns: player.pendingSkippedTurns,
    pendingMiniGameImmunity: player.pendingMiniGameImmunity,
    pendingMiniGameMultiplier: player.pendingMiniGameMultiplier,
    pendingMercyMultiplier: player.pendingMercyMultiplier,
  }))
}

function beginLandingResolution(
  state: OnlineGameState,
  actorIndex: number,
  effect: BoardCell['effect'],
  dependencies: GameCommandDependencies,
  chainDepth: number
): OnlineGameState {
  if (!effect || chainDepth >= 5 || (effect.type === 'move' && effect.value === 0)) {
    return completeOnlineTurn(state, state.players, actorIndex, false, dependencies.now?.())
  }
  if (effect.type === 'punishment' || effect.type === 'chain_punishment') {
    const action = createCompatiblePunishmentAction(
      state.punishmentConfig,
      undefined,
      onlineActConstraints(state)
    )
    return beginPunishmentResolution(
      state,
      {
        kind: 'punishment_choice',
        playerIndex: actorIndex,
        source: 'board_punishment',
        cellType: effect.type,
        fallback: action,
        choices: [action, action],
        diceValue: state.diceValue ?? 1,
      },
      action,
      dependencies
    )
  }
  if (
    effect.type === 'trap' &&
    (effect.trapVariant === 'mini_game_reaction' ||
      effect.trapVariant === 'mini_game_memory' ||
      effect.trapVariant === 'mini_game_quiz')
  ) {
    const game =
      effect.trapVariant === 'mini_game_reaction'
        ? 'reaction'
        : effect.trapVariant === 'mini_game_memory'
          ? 'memory'
          : 'quick_quiz'
    return startEventMiniGame(
      state,
      {
        id: `trap-${state.revision}-${actorIndex}`,
        title: effect.description,
        description: effect.description,
        tags: ['机关', '小游戏'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'mini_game', game },
      },
      actorIndex,
      dependencies
    )
  }
  const player = state.players[actorIndex]
  if (!player) throw new GameCommandError('PLAYER_NOT_FOUND', '格子触发玩家不存在')
  const processed =
    effect.type === 'move' || effect.type === 'reverse' || effect.type === 'restart'
      ? resolveCellEffect(toRulePlayers([player])[0] as Player, effect, state.boardSize)
      : undefined
  return {
    ...state,
    revision: state.revision + 1,
    phase: 'awaiting_content',
    pendingAction: {
      kind: 'content',
      playerIndex: actorIndex,
      contentType:
        effect.type === 'trap'
          ? 'trap'
          : effect.type === 'qa'
            ? 'qa'
            : effect.type === 'dare'
              ? 'dare'
              : 'cell_effect',
      description: effect.description,
      canRefuse: effect.type === 'qa',
      nextPosition: processed?.newPosition,
      skippedTurns: effect.type === 'rest' ? Math.max(1, Math.trunc(effect.value) || 1) : undefined,
      followLanding:
        effect.type === 'move' ||
        effect.type === 'reverse' ||
        effect.type === 'restart' ||
        effect.type === 'bounce',
      chainDepth,
    },
  }
}

function beginPunishmentResolution(
  state: OnlineGameState,
  pending: PendingPunishmentChoice,
  action: PunishmentAction,
  dependencies: GameCommandDependencies = DEFAULT_DEPENDENCIES,
  chainCount = pending.cellType === 'chain_punishment' ? 1 : 0
): OnlineGameState {
  const rulePlayers = toRulePlayers(state.players)
  const randomSource = ruleRandomSourceFor(dependencies)
  const punishmentVariant =
    pending.source === 'board_punishment'
      ? pickPunishmentVariant(
          state.partySession.act,
          randomSource,
          ONLINE_BASELINE_PUNISHMENT_VARIANTS
        )
      : undefined
  let resolution =
    pending.source === 'board_punishment'
      ? resolveRule({
          source: pending.source,
          actorIndex: pending.playerIndex,
          players: rulePlayers,
          punishmentConfig: state.punishmentConfig,
          boardAction: action,
          diceValue: pending.diceValue,
          randomSource,
          punishmentVariant,
        })
      : resolveRule({
          source: pending.source,
          actorIndex: pending.playerIndex,
          players: rulePlayers,
          punishmentConfig: state.punishmentConfig,
          punishmentAction: action,
          diceValue: pending.diceValue,
          randomSource,
          punishmentVariant,
        })
  const amplifiedByModifier =
    (rulePlayers[resolution.targetPlayerIndex]?.pendingMiniGameMultiplier ?? 0) >= 2 ||
    (state.eventState.activePunishmentMultiplier?.multiplier ?? 0) >= 2
  const miniGameModified = consumePartyMiniGameModifier(
    resolution,
    rulePlayers[resolution.targetPlayerIndex]
  )
  const players = state.players.map((player, index) =>
    index === resolution.targetPlayerIndex
      ? {
          ...player,
          pendingMiniGameImmunity: miniGameModified.player.pendingMiniGameImmunity,
          pendingMiniGameMultiplier: miniGameModified.player.pendingMiniGameMultiplier,
          pendingMercyMultiplier:
            resolution.countMultiplier !== undefined
              ? undefined
              : miniGameModified.player.pendingMercyMultiplier,
        }
      : player
  )
  resolution = applyPartyEventPunishmentRules(state.eventState, miniGameModified.resolution)
  const options = getPartyPunishmentInterventionOptions(
    resolution,
    toRulePlayers(players),
    state.partySession.tokensRemaining,
    state.partySession.interventionUsedThisTurn !== undefined
  )
  const signaled = signalPartyEvent({ ...state, players }, { kind: 'punishment_resolved' })
  const punishmentState = { ...signaled, turnHadPunishment: true }
  if (options.length === 0) {
    return preparePunishmentDecision(punishmentState, resolution, {
      chainActive: chainCount > 0,
      amplified: amplifiedByModifier,
    })
  }
  return {
    ...punishmentState,
    revision: state.revision + 1,
    phase: 'awaiting_punishment_intervention',
    pendingAction: {
      kind: 'punishment_intervention',
      resolution,
      options,
      declinedPlayerIndices: [],
      chainActive: chainCount > 0,
      amplified: amplifiedByModifier,
    },
  }
}

interface PunishmentDecisionOptions {
  readonly chainActive?: boolean
  readonly amplified?: boolean
  readonly isBoundCopy?: boolean
  readonly resumeTurnAfter?: boolean
  readonly mercyAvailable?: boolean
  readonly doubled?: boolean
  readonly participantPlayerIndices?: readonly number[]
  readonly bindingSourcePlayerIndex?: number
}

function mergePunishmentParticipants(
  ...participantGroups: (readonly number[])[]
): readonly number[] {
  return Object.freeze([...new Set(participantGroups.flat())].sort((left, right) => left - right))
}

function preparePunishmentDecision(
  state: OnlineGameState,
  resolution: ResolvedPunishmentResult,
  options: PunishmentDecisionOptions = {}
): OnlineGameState {
  if (resolution.count.kind === 'awaiting_external_count') {
    const chooserPlayerIndex = resolution.count.eligibleChooserIndices[0]
    if (chooserPlayerIndex === undefined) {
      throw new GameCommandError('INVALID_ROSTER', '没有玩家可以选择惩罚次数')
    }
    return {
      ...state,
      revision: state.revision + 1,
      phase: 'awaiting_punishment_count',
      pendingAction: {
        kind: 'punishment_count',
        resolution,
        chooserPlayerIndex,
        chainActive: options.chainActive ?? false,
        amplified: options.amplified ?? false,
        resumeTurnAfter: options.resumeTurnAfter ?? false,
      },
    }
  }
  if (
    resolution.variantPhase === undefined &&
    (resolution.variant === 'conditional' || resolution.variant === 'deferred')
  ) {
    return {
      ...state,
      revision: state.revision + 1,
      phase: 'awaiting_punishment_variant',
      pendingAction: {
        kind: 'punishment_variant',
        resolution,
        decisionPlayerIndex: resolution.executorIndex ?? resolution.targetPlayerIndex,
        chainActive: options.chainActive ?? false,
        amplified: options.amplified ?? false,
        resumeTurnAfter: options.resumeTurnAfter ?? false,
      },
    }
  }
  return awaitPunishmentAcknowledgement(state, resolution, options)
}

function awaitPunishmentAcknowledgement(
  state: OnlineGameState,
  resolution: ResolvedPunishmentResult,
  options: PunishmentDecisionOptions = {}
): OnlineGameState {
  return {
    ...state,
    revision: state.revision + 1,
    phase: 'awaiting_acknowledgement',
    pendingAction: {
      kind: 'acknowledgement',
      playerIndex: resolution.targetPlayerIndex,
      resolution,
      chainActive: options.chainActive ?? false,
      amplified: options.amplified ?? false,
      isBoundCopy: options.isBoundCopy ?? false,
      resumeTurnAfter: options.resumeTurnAfter ?? false,
      mercyAvailable:
        options.mercyAvailable ??
        (resolution.executorIndex !== undefined &&
          resolution.count.kind === 'fixed' &&
          resolution.count.value > 1),
      doubled: options.doubled ?? false,
      participantPlayerIndices: mergePunishmentParticipants(
        options.participantPlayerIndices ?? [resolution.targetPlayerIndex]
      ),
      bindingSourcePlayerIndex: options.bindingSourcePlayerIndex ?? resolution.targetPlayerIndex,
    },
  }
}

function awaitChainRoll(
  state: OnlineGameState,
  playerIndex: number,
  chainCount: number
): OnlineGameState {
  return {
    ...state,
    revision: state.revision + 1,
    phase: 'awaiting_chain_roll',
    pendingAction: { kind: 'chain_roll', playerIndex, chainCount },
  }
}

function continueAfterPunishmentAcknowledgement(
  state: OnlineGameState,
  pending: PendingAcknowledgement,
  dependencies: GameCommandDependencies
): OnlineGameState {
  const resolution = pending.resolution
  const cleared = { ...state, pendingAction: null }
  const punishmentCompleted = isPartyPunishmentCompleted(resolution)
  if (
    punishmentCompleted &&
    resolution.variant === 'mutual' &&
    resolution.variantPhase === undefined
  ) {
    return awaitPunishmentAcknowledgement(cleared, createMutualPunishmentReturn(resolution), {
      chainActive: pending.chainActive,
      amplified: pending.amplified,
      isBoundCopy: pending.isBoundCopy,
      resumeTurnAfter: pending.resumeTurnAfter,
      participantPlayerIndices: mergePunishmentParticipants(
        pending.participantPlayerIndices,
        [resolution.targetPlayerIndex],
        resolution.executorIndex === undefined ? [] : [resolution.executorIndex]
      ),
      bindingSourcePlayerIndex: pending.bindingSourcePlayerIndex,
    })
  }
  if (
    punishmentCompleted &&
    resolution.variant === 'encore' &&
    resolution.variantPhase === undefined
  ) {
    return awaitPunishmentAcknowledgement(cleared, createEncorePunishmentReturn(resolution), {
      chainActive: pending.chainActive,
      amplified: pending.amplified,
      isBoundCopy: pending.isBoundCopy,
      resumeTurnAfter: pending.resumeTurnAfter,
      participantPlayerIndices: pending.participantPlayerIndices,
      bindingSourcePlayerIndex: pending.bindingSourcePlayerIndex,
    })
  }
  if (punishmentCompleted && !pending.isBoundCopy && resolution.variant !== 'deferred') {
    const bindingSourcePlayerIndex = pending.bindingSourcePlayerIndex
    const partnerIndex = getBoundPartnerPlayerIndex(state.eventState, bindingSourcePlayerIndex)
    if (partnerIndex !== undefined) {
      return awaitPunishmentAcknowledgement(
        cleared,
        {
          ...resolution,
          targetPlayerIndex: partnerIndex,
          executorIndex: bindingSourcePlayerIndex,
          variant: undefined,
          variantPhase: undefined,
        },
        {
          chainActive: pending.chainActive,
          amplified: pending.amplified,
          isBoundCopy: true,
          resumeTurnAfter: pending.resumeTurnAfter,
          participantPlayerIndices: mergePunishmentParticipants(pending.participantPlayerIndices, [
            bindingSourcePlayerIndex,
            partnerIndex,
          ]),
          bindingSourcePlayerIndex,
        }
      )
    }
  }
  const doubleChance = onlineActConstraints(state).doublePunishmentChance ?? 20
  const doubleRoll = dependencies.randomInt?.(1, 100) ?? 101
  if (
    !pending.doubled &&
    resolution.variant !== 'mutual' &&
    resolution.variant !== 'encore' &&
    punishmentCompleted &&
    doubleChance > 0 &&
    doubleRoll <= doubleChance
  ) {
    return awaitPunishmentAcknowledgement(cleared, resolution, {
      chainActive: pending.chainActive,
      amplified: true,
      isBoundCopy: pending.isBoundCopy,
      resumeTurnAfter: pending.resumeTurnAfter,
      mercyAvailable: false,
      doubled: true,
      participantPlayerIndices: pending.participantPlayerIndices,
      bindingSourcePlayerIndex: pending.bindingSourcePlayerIndex,
    })
  }
  const participantPlayerIndices = pending.participantPlayerIndices
  const mutual = participantPlayerIndices.length > 1
  const completed = punishmentCompleted
    ? {
        ...cleared,
        partySession: recordPartyMomentum(state.partySession, {
          type: 'punishment_completed',
          participantPlayerIndices,
          amplified: pending.amplified || pending.doubled,
          chain: pending.chainActive,
          mutual,
        }),
      }
    : cleared
  if (pending.resumeTurnAfter) {
    return {
      ...completed,
      revision: state.revision + 1,
      phase:
        state.partySession.reaction?.status === 'awaiting_prediction'
          ? 'awaiting_prediction'
          : 'awaiting_roll',
    }
  }
  if (pending.chainActive) {
    return awaitChainRoll(
      completed,
      state.players.findIndex(player => player.id === state.currentPlayerId),
      1
    )
  }
  return completeOnlineTurn(
    completed,
    state.players,
    state.players.findIndex(player => player.id === state.currentPlayerId),
    false,
    dependencies.now?.()
  )
}

function completeOnlineTurn(
  state: OnlineGameState,
  players: readonly OnlinePlayer[],
  actorIndex: number,
  finished = false,
  now = state.partySession.startedAt + state.partySession.activeElapsedMs
): OnlineGameState {
  const completedPartySession = completePartyTurn(state.partySession, {
    playerIndex: actorIndex,
    now,
  })
  if (
    finished &&
    !completedPartySession.timeLimitPending &&
    !completedPartySession.heatLimitPending
  ) {
    return finishOnlineGame({ ...state, partySession: completedPartySession }, actorIndex)
  }
  if (completedPartySession.shouldEnd) {
    const leaders = getPartyTimeLimitLeaders(players.map(player => player.position))
    if (leaders.length === 1 && leaders[0] !== undefined) {
      return finishOnlineGame({ ...state, partySession: completedPartySession }, leaders[0])
    }
    const tieBreakState = createPartyTieBreakState(leaders)
    const firstCandidateIndex = tieBreakState.candidatePlayerIndices[0]
    const firstCandidate =
      firstCandidateIndex === undefined ? undefined : state.players[firstCandidateIndex]
    if (!firstCandidate) throw new GameCommandError('INVALID_ROSTER', '无法确定并列决胜玩家')
    return {
      ...state,
      revision: state.revision + 1,
      partySession: completedPartySession,
      currentPlayerId: firstCandidate.id,
      phase: 'awaiting_tiebreak',
      diceValue: null,
      pendingAction: { kind: 'tiebreak', state: tieBreakState },
      turnHadPunishment: false,
    }
  }
  let nextIndex = (actorIndex + 1) % players.length
  let advancedPlayers = [...players]
  let advancedSession = completedPartySession
  let eventResult = processPartyEventSignal(state.eventState, {
    kind: 'turn_completed',
    hadPunishment: state.turnHadPunishment,
  })
  let eventQueue = [...state.eventQueue, ...(eventResult.drawnCard ? [eventResult.drawnCard] : [])]
  while ((advancedPlayers[nextIndex]?.pendingSkippedTurns ?? 0) > 0) {
    const skippedPlayer = advancedPlayers[nextIndex]
    if (!skippedPlayer) break
    advancedPlayers = advancedPlayers.map((player, index) =>
      index === nextIndex
        ? { ...player, pendingSkippedTurns: Math.max(0, (player.pendingSkippedTurns ?? 0) - 1) }
        : player
    )
    advancedSession = completePartyTurn(beginPartyTurn(advancedSession, nextIndex), {
      playerIndex: nextIndex,
      now,
    })
    eventResult = processPartyEventSignal(eventResult.state, {
      kind: 'turn_completed',
      hadPunishment: false,
    })
    if (eventResult.drawnCard) eventQueue = [...eventQueue, eventResult.drawnCard]
    if (advancedSession.shouldEnd) break
    nextIndex = (nextIndex + 1) % advancedPlayers.length
  }
  if (advancedSession.shouldEnd) {
    const leaders = getPartyTimeLimitLeaders(advancedPlayers.map(player => player.position))
    if (leaders.length === 1 && leaders[0] !== undefined) {
      return finishOnlineGame(
        { ...state, partySession: advancedSession, players: advancedPlayers },
        leaders[0]
      )
    }
    const tieBreakState = createPartyTieBreakState(leaders)
    const firstCandidateIndex = tieBreakState.candidatePlayerIndices[0]
    const firstCandidate =
      firstCandidateIndex === undefined ? undefined : advancedPlayers[firstCandidateIndex]
    if (!firstCandidate) throw new GameCommandError('INVALID_ROSTER', '无法确定并列决胜玩家')
    return {
      ...state,
      revision: state.revision + 1,
      partySession: advancedSession,
      players: advancedPlayers,
      currentPlayerId: firstCandidate.id,
      phase: 'awaiting_tiebreak',
      diceValue: null,
      pendingAction: { kind: 'tiebreak', state: tieBreakState },
      eventState: eventResult.state,
      eventQueue,
      turnHadPunishment: false,
    }
  }
  const nextPlayer = advancedPlayers[nextIndex]
  if (!nextPlayer) throw new GameCommandError('INVALID_ROSTER', '无法确定下一位玩家')
  const partySession = beginPartyTurn(advancedSession, nextIndex)
  const completedState: OnlineGameState = {
    ...state,
    status: 'playing',
    revision: state.revision + 1,
    currentPlayerId: nextPlayer.id,
    phase:
      partySession.reaction?.status === 'awaiting_prediction'
        ? 'awaiting_prediction'
        : 'awaiting_roll',
    diceValue: null,
    players: advancedPlayers,
    partySession,
    pendingAction: null,
    eventState: eventResult.state,
    eventQueue,
    turnHadPunishment: false,
  }
  const deferredIndex = completedState.deferredPunishments.findIndex(
    deferred => deferred.resolution.targetPlayerIndex === nextIndex
  )
  const deferred = completedState.deferredPunishments[deferredIndex]
  if (deferred) {
    return preparePunishmentDecision(
      {
        ...completedState,
        deferredPunishments: completedState.deferredPunishments.filter(
          (_, index) => index !== deferredIndex
        ),
      },
      deferred.resolution,
      {
        amplified: deferred.amplified,
        chainActive: deferred.chainActive,
        resumeTurnAfter: true,
      }
    )
  }
  if (eventQueue.length > 0) return openNextEvent(completedState)
  return completedState
}

function signalPartyEvent(state: OnlineGameState, signal: PartyEventSignal): OnlineGameState {
  const result = processPartyEventSignal(state.eventState, signal)
  return {
    ...state,
    eventState: result.state,
    eventQueue: [...state.eventQueue, ...(result.drawnCard ? [result.drawnCard] : [])],
  }
}

function openNextEvent(state: OnlineGameState): OnlineGameState {
  const [card, ...remaining] = state.eventQueue
  if (!card) return resumeAfterEvent({ ...state, eventQueue: [] })
  const pendingAction: PendingEventVote | PendingEventActivation | PendingEventRps =
    card.effect.kind === 'vote'
      ? {
          kind: 'event_vote',
          card: card as PendingEventVote['card'],
          votes: {},
        }
      : card.effect.kind === 'rock_paper_scissors'
        ? {
            kind: 'event_rps',
            card: card as PendingEventRps['card'],
            choices: {},
          }
        : { kind: 'event_activation', card }
  return {
    ...state,
    phase: 'awaiting_event',
    eventQueue: remaining,
    pendingAction,
  }
}

function resumeAfterEvent(state: OnlineGameState): OnlineGameState {
  if (state.eventQueue.length > 0) return openNextEvent(state)
  return {
    ...state,
    phase:
      state.partySession.reaction?.status === 'awaiting_prediction'
        ? 'awaiting_prediction'
        : 'awaiting_roll',
    pendingAction: null,
  }
}

function showEventResult(state: OnlineGameState, title: string, summary: string): OnlineGameState {
  return {
    ...state,
    phase: 'awaiting_event',
    pendingAction: { kind: 'event_result', title, summary },
  }
}

function startEventMiniGame(
  state: OnlineGameState,
  card: PartyEventCard & {
    readonly effect: Extract<PartyEventCard['effect'], { kind: 'mini_game' }>
  },
  actorIndex: number,
  dependencies: GameCommandDependencies
): OnlineGameState {
  const now = dependencies.now?.() ?? Date.now()
  let pending: PendingEventMiniGame
  if (card.effect.game === 'reaction') {
    const delay = dependencies.randomInt?.(700, 1_500) ?? 1_000
    pending = {
      kind: 'event_mini_game',
      card,
      actorIndex,
      startedAt: now,
      goAt: now + delay,
    }
  } else if (card.effect.game === 'memory') {
    const challenge = createMemoryChallenge(
      3,
      dependencies.choice ?? (entries => entries[0] as (typeof entries)[number])
    )
    pending = {
      kind: 'event_mini_game',
      card,
      actorIndex,
      startedAt: now,
      deadline: now + state.settings.turnDurationSeconds * 1_000,
      sequence: challenge.sequence,
      options: challenge.options,
    }
  } else {
    pending = {
      kind: 'event_mini_game',
      card,
      actorIndex,
      startedAt: now,
      deadline: now + state.settings.turnDurationSeconds * 1_000,
    }
  }
  return {
    ...state,
    revision: state.revision + 1,
    phase: 'awaiting_mini_game',
    pendingAction: pending,
  }
}

function finishEventMiniGame(
  state: OnlineGameState,
  pending: PendingEventMiniGame,
  winnerPlayerIndices: readonly number[],
  loserPlayerIndices: readonly number[]
): OnlineGameState {
  const players = state.players.map((player, index) => {
    if (pending.card.effect.game === 'reaction' && winnerPlayerIndices.includes(index)) {
      return { ...player, pendingMiniGameImmunity: true }
    }
    if (pending.card.effect.game !== 'reaction' && loserPlayerIndices.includes(index)) {
      return { ...player, pendingMiniGameMultiplier: 2 }
    }
    return player
  })
  const winnerNames = winnerPlayerIndices
    .map(index => state.players[index]?.nickname ?? '')
    .filter(Boolean)
  const loserNames = loserPlayerIndices
    .map(index => state.players[index]?.nickname ?? '')
    .filter(Boolean)
  const summary = winnerNames.length
    ? `完成：${winnerNames.join('、')}`
    : loserNames.length
      ? `未完成：${loserNames.join('、')}`
      : '本次挑战已跳过'
  return showEventResult(
    {
      ...state,
      revision: state.revision + 1,
      players,
      eventState: activatePartyEvent(state.eventState, pending.card),
      pendingAction: null,
    },
    pending.card.title,
    summary
  )
}

function finishOnlineGame(state: OnlineGameState, winnerPlayerIndex: number): OnlineGameState {
  const winner = state.players[winnerPlayerIndex]
  if (!winner) throw new GameCommandError('PLAYER_NOT_FOUND', '终局获胜玩家不存在')
  const settlement = resolveVictorySettlement(
    toRulePlayers(state.players),
    winnerPlayerIndex,
    state.victoryConfig
  ).map(entry => ({
    playerId: state.players[entry.playerIndex]?.id ?? '',
    place: entry.place,
    count: entry.count,
  }))
  return {
    ...state,
    status: 'finished',
    revision: state.revision + 1,
    currentPlayerId: winner.id,
    phase: 'finished',
    diceValue: null,
    players: state.players.map((player, index) => ({
      ...player,
      isWinner: index === winnerPlayerIndex,
    })),
    pendingAction: null,
    winnerPlayerId: winner.id,
    victorySettlement: settlement,
  }
}
