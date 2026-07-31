import type { PunishmentAction, PunishmentConfig, PunishmentConstraints } from '../types/game'
import { GAME_CONFIG } from '../config/gameConfig'
import { createCompatiblePunishmentAction, type RuleRandomSource } from './ruleResolution'

export type PartyAct = 'warmup' | 'heating' | 'finale'
export type PartyTokenAction = 'reroll' | 'punishment_choice' | 'transfer' | 'amplify' | 'immunity'

/** Returns act-specific punishment constraints from config */
export function getActConstraints(act: PartyAct): PunishmentConstraints {
  return GAME_CONFIG.PARTY_ACT_CONSTRAINTS[act]
}

/** Returns act-specific double punishment chance */
export function getActDoublePunishmentChance(act: PartyAct): number {
  return GAME_CONFIG.PARTY_ACT_CONSTRAINTS[act].doublePunishmentChance ?? 20
}
export type PartyPrediction = 'low' | 'high'
export type PartyReactionDecision = 'keep' | 'mirror'
export type PartyDiceDecision = 'continue'
export type PartyPunishmentDecision = 'skip'

export const PARTY_MIN_PLAYERS = 2
export const PARTY_DECISION_TIMEOUT_SECONDS = 5
export const PARTY_DEFAULT_REACTION_DECISION: PartyReactionDecision = 'keep'
export const PARTY_DEFAULT_DICE_DECISION: PartyDiceDecision = 'continue'
export const PARTY_DEFAULT_PUNISHMENT_DECISION: PartyPunishmentDecision = 'skip'

export interface PartyReaction {
  readonly status: 'awaiting_prediction' | 'awaiting_roll' | 'awaiting_decision' | 'resolved'
  readonly targetPlayerIndex: number
  readonly reactorPlayerIndex: number
  readonly prediction?: PartyPrediction
  readonly rolledValue?: number
  readonly predictionCorrect?: boolean
  readonly decision?: PartyReactionDecision
  readonly finalDiceValue?: number
}

export interface PartySession {
  readonly playerCount: number
  readonly startedAt: number
  readonly completedTurns: number
  readonly completedRounds: number
  readonly roundNumber: number
  readonly act: PartyAct
  readonly activeElapsedMs: number
  readonly timeLimitPending: boolean
  readonly shouldEnd: boolean
  readonly pausedAt?: number
  readonly pausedDurationMs: number
  readonly tokensRemaining: readonly number[]
  readonly activeTurnPlayerIndex?: number
  readonly interventionUsedThisTurn?: PartyTokenAction
  readonly reactionTargetPlayerIndex: number
  readonly reactionUsedThisRound: boolean
  readonly reaction?: PartyReaction
  readonly diceChangedThisTurn: boolean
  readonly successfulReactionCount: number
  readonly interventionCounts: Readonly<Record<PartyTokenAction, number>>
  readonly longestChain: number
  readonly directorConfig: PartyDirectorConfig
}

export interface PartyDirectorConfig {
  readonly actCount: 1 | 2 | 3
  readonly heatingRound: number
  readonly finaleRound: number
  readonly heatingAfterMinutes: number
  readonly finaleAfterMinutes: number
  readonly endAfterMinutes: number
}

export const DEFAULT_PARTY_DIRECTOR_CONFIG: Readonly<PartyDirectorConfig> = Object.freeze({
  actCount: 3,
  heatingRound: 2,
  finaleRound: 5,
  heatingAfterMinutes: 6,
  finaleAfterMinutes: 14,
  endAfterMinutes: 20,
})

export interface PartyHighlight {
  readonly act: PartyAct
  readonly keyDecision: string
  readonly reactionSummary: string
  readonly chainSummary: string
}

export interface PartyTieBreakState {
  readonly candidatePlayerIndices: readonly number[]
  readonly rolls: Readonly<Record<number, number>>
  readonly currentCandidateOffset: number
  readonly roundNumber: number
}

export interface PartyTieBreakRollResult {
  readonly state: PartyTieBreakState
  readonly winnerPlayerIndex?: number
}

interface CreatePartySessionInput {
  readonly playerCount: number
  readonly startedAt: number
  readonly directorConfig?: PartyDirectorConfig
}

interface CompletePartyTurnInput {
  readonly playerIndex: number
  readonly now: number
  readonly nextRoundEligibleReactionTargets?: readonly number[]
}

interface SpendPartyTokenInput {
  readonly playerIndex: number
  readonly action: PartyTokenAction
}

interface SubmitPartyPredictionInput {
  readonly playerIndex: number
  readonly prediction: PartyPrediction
}

interface DecidePartyReactionInput {
  readonly playerIndex: number
  readonly decision: PartyReactionDecision
}

interface PartyPunishmentChoiceEligibilityInput {
  readonly source: 'board_punishment' | 'takeoff_failure'
  readonly cellType: 'punishment' | 'chain_punishment'
  readonly action: PunishmentAction
}

function nextEligibleReactionTarget(
  preferredPlayerIndex: number,
  playerCount: number,
  eligiblePlayerIndices?: readonly number[]
): number {
  if (eligiblePlayerIndices === undefined) return preferredPlayerIndex

  const eligiblePlayers = new Set(
    eligiblePlayerIndices.filter(
      playerIndex => Number.isInteger(playerIndex) && playerIndex >= 0 && playerIndex < playerCount
    )
  )
  if (eligiblePlayers.size === 0) return preferredPlayerIndex

  for (let offset = 0; offset < playerCount; offset += 1) {
    const candidate = (preferredPlayerIndex + offset) % playerCount
    if (eligiblePlayers.has(candidate)) return candidate
  }

  return preferredPlayerIndex
}

export function validatePartyDirectorConfig(config: PartyDirectorConfig): boolean {
  return (
    Number.isInteger(config.actCount) &&
    config.actCount >= 1 &&
    config.actCount <= 3 &&
    Number.isInteger(config.heatingRound) &&
    config.heatingRound >= 1 &&
    Number.isInteger(config.finaleRound) &&
    config.finaleRound > config.heatingRound &&
    Number.isFinite(config.heatingAfterMinutes) &&
    config.heatingAfterMinutes > 0 &&
    Number.isFinite(config.finaleAfterMinutes) &&
    config.finaleAfterMinutes > config.heatingAfterMinutes &&
    Number.isFinite(config.endAfterMinutes) &&
    config.endAfterMinutes > config.finaleAfterMinutes
  )
}

function actForRoundBoundary(
  completedRounds: number,
  activeElapsedMs: number,
  config: PartyDirectorConfig
): PartyAct {
  if (config.actCount === 1) return 'warmup'
  if (config.actCount === 2) {
    return completedRounds >= config.heatingRound ||
      activeElapsedMs >= config.heatingAfterMinutes * 60_000
      ? 'finale'
      : 'warmup'
  }
  if (
    completedRounds >= config.finaleRound ||
    activeElapsedMs >= config.finaleAfterMinutes * 60_000
  ) {
    return 'finale'
  }
  if (
    completedRounds >= config.heatingRound ||
    activeElapsedMs >= config.heatingAfterMinutes * 60_000
  ) {
    return 'heating'
  }
  return 'warmup'
}

export function isPartyPunishmentChoiceEligible({
  source,
  cellType,
  action,
}: PartyPunishmentChoiceEligibilityInput): boolean {
  return (
    source === 'board_punishment' && cellType === 'punishment' && action.dynamicType === undefined
  )
}

function punishmentFingerprint(action: PunishmentAction): string {
  return [action.tool.name, action.bodyPart.name, action.position.name, action.strikes].join('|')
}

export function createPartyPunishmentChoices(
  config: PunishmentConfig,
  randomSource?: RuleRandomSource,
  constraints?: PunishmentConstraints
): readonly [PunishmentAction, PunishmentAction] {
  const choices: PunishmentAction[] = []
  const fingerprints = new Set<string>()

  for (let attempt = 0; attempt < 8 && choices.length < 2; attempt += 1) {
    const candidate = createCompatiblePunishmentAction(config, randomSource, constraints)
    const fingerprint = punishmentFingerprint(candidate)
    if (fingerprints.has(fingerprint)) continue
    fingerprints.add(fingerprint)
    choices.push(candidate)
  }

  if (choices.length < 2) {
    throw new Error('当前配置无法生成两个不同的兼容惩罚结果')
  }

  return Object.freeze([choices[0], choices[1]])
}

export function createPartySession({
  playerCount,
  startedAt,
  directorConfig = DEFAULT_PARTY_DIRECTOR_CONFIG,
}: CreatePartySessionInput): PartySession {
  if (!Number.isInteger(playerCount) || playerCount < PARTY_MIN_PLAYERS) {
    throw new Error('升温局至少需要两名玩家')
  }
  if (!validatePartyDirectorConfig(directorConfig)) {
    throw new Error('升温局导演时间门控配置无效')
  }

  return Object.freeze({
    playerCount,
    startedAt,
    completedTurns: 0,
    completedRounds: 0,
    roundNumber: 1,
    act: 'warmup',
    activeElapsedMs: 0,
    timeLimitPending: false,
    shouldEnd: false,
    pausedDurationMs: 0,
    tokensRemaining: Object.freeze(Array.from({ length: playerCount }, () => 2)),
    reactionTargetPlayerIndex: 0,
    reactionUsedThisRound: false,
    diceChangedThisTurn: false,
    successfulReactionCount: 0,
    interventionCounts: Object.freeze({
      reroll: 0,
      punishment_choice: 0,
      transfer: 0,
      amplify: 0,
      immunity: 0,
    }),
    longestChain: 0,
    directorConfig: Object.freeze({ ...directorConfig }),
  })
}

export function beginPartyTurn(session: PartySession, playerIndex: number): PartySession {
  const expectedPlayerIndex = session.completedTurns % session.playerCount
  if (playerIndex !== expectedPlayerIndex) {
    throw new Error('升温局回合必须按玩家顺序开始')
  }
  if (session.activeTurnPlayerIndex !== undefined) {
    throw new Error('上一回合尚未完成')
  }
  const shouldOpenReaction =
    !session.reactionUsedThisRound && playerIndex === session.reactionTargetPlayerIndex
  const reactorPlayerIndex = (playerIndex + 1) % session.playerCount
  const reaction = shouldOpenReaction
    ? Object.freeze({
        status: 'awaiting_prediction' as const,
        targetPlayerIndex: playerIndex,
        reactorPlayerIndex,
      })
    : undefined

  return Object.freeze({
    ...session,
    activeTurnPlayerIndex: playerIndex,
    reaction,
    reactionUsedThisRound: session.reactionUsedThisRound || shouldOpenReaction,
  })
}

export function submitPartyPrediction(
  session: PartySession,
  { playerIndex, prediction }: SubmitPartyPredictionInput
): PartySession {
  const reaction = session.reaction
  if (reaction?.status !== 'awaiting_prediction') {
    throw new Error('当前没有等待预测的反应机会')
  }
  if (reaction.reactorPlayerIndex !== playerIndex) {
    throw new Error('只有本轮反应者可以预测')
  }
  return Object.freeze({
    ...session,
    reaction: Object.freeze({ ...reaction, status: 'awaiting_roll', prediction }),
  })
}

export function resolvePartyReactionRoll(session: PartySession, rolledValue: number): PartySession {
  const reaction = session.reaction
  if (reaction?.status !== 'awaiting_roll' || reaction.prediction === undefined) {
    throw new Error('必须先完成骰子范围预测')
  }
  if (!Number.isInteger(rolledValue) || rolledValue < 1 || rolledValue > 6) {
    throw new Error('骰子点数必须在一到六之间')
  }

  const predictionCorrect = reaction.prediction === 'low' ? rolledValue <= 3 : rolledValue >= 4
  return Object.freeze({
    ...session,
    reaction: Object.freeze(
      predictionCorrect
        ? {
            ...reaction,
            status: 'awaiting_decision' as const,
            rolledValue,
            predictionCorrect,
          }
        : {
            ...reaction,
            status: 'resolved' as const,
            rolledValue,
            predictionCorrect,
            decision: 'keep' as const,
            finalDiceValue: rolledValue,
          }
    ),
  })
}

export function decidePartyReaction(
  session: PartySession,
  { playerIndex, decision }: DecidePartyReactionInput
): PartySession {
  const reaction = session.reaction
  if (
    reaction?.status !== 'awaiting_decision' ||
    reaction.rolledValue === undefined ||
    !reaction.predictionCorrect
  ) {
    throw new Error('当前没有等待决定的成功预测')
  }
  if (reaction.reactorPlayerIndex !== playerIndex) {
    throw new Error('只有本轮反应者可以决定点数')
  }

  const finalDiceValue = decision === 'mirror' ? 7 - reaction.rolledValue : reaction.rolledValue
  return Object.freeze({
    ...session,
    reaction: Object.freeze({
      ...reaction,
      status: 'resolved',
      decision,
      finalDiceValue,
    }),
    diceChangedThisTurn: decision === 'mirror',
    successfulReactionCount: session.successfulReactionCount + 1,
  })
}

export function spendPartyToken(
  session: PartySession,
  { playerIndex, action }: SpendPartyTokenInput
): PartySession {
  if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= session.playerCount) {
    throw new Error('干预筹码需要有效的玩家索引')
  }
  if (session.activeTurnPlayerIndex === undefined) {
    throw new Error('当前没有进行中的升温局回合')
  }
  const activePlayerOnly = action === 'reroll' || action === 'punishment_choice'
  if (activePlayerOnly && session.activeTurnPlayerIndex !== playerIndex) {
    throw new Error('只有当前玩家可以使用该干预筹码')
  }
  if (session.interventionUsedThisTurn !== undefined) {
    throw new Error('每回合最多使用一枚干预筹码')
  }
  if (action === 'reroll' && session.diceChangedThisTurn) {
    throw new Error('同一次骰子最多改变一次')
  }
  if ((session.tokensRemaining[playerIndex] ?? 0) <= 0) {
    throw new Error('干预筹码已经用完')
  }

  const tokensRemaining = session.tokensRemaining.map((remaining, index) =>
    index === playerIndex ? remaining - 1 : remaining
  )
  return Object.freeze({
    ...session,
    tokensRemaining: Object.freeze(tokensRemaining),
    interventionUsedThisTurn: action,
    diceChangedThisTurn: session.diceChangedThisTurn || action === 'reroll',
    interventionCounts: Object.freeze({
      ...session.interventionCounts,
      [action]: session.interventionCounts[action] + 1,
    }),
  })
}

export function recordPartyChain(session: PartySession, chainLength: number): PartySession {
  const normalizedLength = Math.max(0, Math.trunc(chainLength))
  if (normalizedLength <= session.longestChain) return session
  return Object.freeze({ ...session, longestChain: normalizedLength })
}

export function createPartyHighlight(session: PartySession): PartyHighlight {
  const {
    reroll,
    punishment_choice: punishmentChoice,
    transfer,
    amplify,
    immunity,
  } = session.interventionCounts
  const totalUsed = reroll + punishmentChoice + transfer + amplify + immunity

  let keyDecision: string
  if (totalUsed === 0) {
    keyDecision = '本局未使用干预筹码'
  } else {
    const parts: string[] = []
    if (reroll > 0) parts.push(`重掷 ${reroll}`)
    if (punishmentChoice > 0) parts.push(`二选一 ${punishmentChoice}`)
    if (transfer > 0) parts.push(`转嫁 ${transfer}`)
    if (amplify > 0) parts.push(`加码 ${amplify}`)
    if (immunity > 0) parts.push(`免疫 ${immunity}`)
    keyDecision = `筹码使用: ${parts.join('、')} 次`
  }

  return Object.freeze({
    act: session.act,
    keyDecision,
    reactionSummary: `成功反应 ${session.successfulReactionCount} 次`,
    chainSummary: `最长连锁 ${session.longestChain} 次`,
  })
}

export function getPartyTimeLimitLeaders(positions: readonly number[]): readonly number[] {
  if (positions.length === 0) return Object.freeze([])
  const leadingPosition = Math.max(...positions)
  return Object.freeze(
    positions.flatMap((position, index) => (position === leadingPosition ? [index] : []))
  )
}

export function createPartyTieBreakState(
  candidatePlayerIndices: readonly number[]
): PartyTieBreakState {
  const candidates = [...new Set(candidatePlayerIndices)]
  if (
    candidates.length < 2 ||
    candidates.some(playerIndex => !Number.isInteger(playerIndex) || playerIndex < 0)
  ) {
    throw new Error('并列决胜至少需要两名有效玩家')
  }

  return Object.freeze({
    candidatePlayerIndices: Object.freeze(candidates),
    rolls: Object.freeze({}),
    currentCandidateOffset: 0,
    roundNumber: 1,
  })
}

export function rollPartyTieBreak(
  state: PartyTieBreakState,
  playerIndex: number,
  rolledValue: number
): PartyTieBreakRollResult {
  const expectedPlayerIndex = state.candidatePlayerIndices[state.currentCandidateOffset]
  if (playerIndex !== expectedPlayerIndex) {
    throw new Error('并列玩家必须按当前顺序掷骰')
  }
  if (!Number.isInteger(rolledValue) || rolledValue < 1 || rolledValue > 6) {
    throw new Error('骰子点数必须在一到六之间')
  }

  const rolls = Object.freeze({ ...state.rolls, [playerIndex]: rolledValue })
  if (state.currentCandidateOffset < state.candidatePlayerIndices.length - 1) {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        rolls,
        currentCandidateOffset: state.currentCandidateOffset + 1,
      }),
    })
  }

  const highestRoll = Math.max(
    ...state.candidatePlayerIndices.map(candidatePlayerIndex => rolls[candidatePlayerIndex] ?? 0)
  )
  const leaders = state.candidatePlayerIndices.filter(
    candidatePlayerIndex => rolls[candidatePlayerIndex] === highestRoll
  )
  if (leaders.length === 1) {
    return Object.freeze({
      state: Object.freeze({ ...state, rolls }),
      winnerPlayerIndex: leaders[0],
    })
  }

  return Object.freeze({
    state: Object.freeze({
      candidatePlayerIndices: Object.freeze(leaders),
      rolls: Object.freeze({}),
      currentCandidateOffset: 0,
      roundNumber: state.roundNumber + 1,
    }),
  })
}

export function pausePartySession(session: PartySession, now: number): PartySession {
  if (session.pausedAt !== undefined) return session
  return Object.freeze({ ...session, pausedAt: now })
}

export function resumePartySession(session: PartySession, now: number): PartySession {
  if (session.pausedAt === undefined) return session
  const pausedDurationMs = session.pausedDurationMs + Math.max(0, now - session.pausedAt)
  return Object.freeze({ ...session, pausedAt: undefined, pausedDurationMs })
}

export function completePartyTurn(
  session: PartySession,
  { playerIndex, now, nextRoundEligibleReactionTargets }: CompletePartyTurnInput
): PartySession {
  const expectedPlayerIndex = session.completedTurns % session.playerCount
  if (playerIndex !== expectedPlayerIndex) {
    throw new Error('升温局回合必须按玩家顺序完成')
  }

  const completedTurns = session.completedTurns + 1
  const completedRounds = Math.floor(completedTurns / session.playerCount)
  const currentPauseDuration =
    session.pausedAt === undefined ? 0 : Math.max(0, now - session.pausedAt)
  const activeElapsedMs = Math.max(
    0,
    now - session.startedAt - session.pausedDurationMs - currentPauseDuration
  )
  const reachedRoundBoundary = completedTurns % session.playerCount === 0
  const preferredReactionTarget = completedRounds % session.playerCount
  const timeLimitPending =
    session.timeLimitPending || activeElapsedMs >= session.directorConfig.endAfterMinutes * 60_000

  return Object.freeze({
    ...session,
    activeTurnPlayerIndex: undefined,
    interventionUsedThisTurn: undefined,
    reaction: undefined,
    diceChangedThisTurn: false,
    completedTurns,
    completedRounds,
    roundNumber: completedRounds + 1,
    act: reachedRoundBoundary
      ? actForRoundBoundary(completedRounds, activeElapsedMs, session.directorConfig)
      : session.act,
    activeElapsedMs,
    timeLimitPending,
    shouldEnd: session.shouldEnd || (reachedRoundBoundary && timeLimitPending),
    reactionTargetPlayerIndex: reachedRoundBoundary
      ? nextEligibleReactionTarget(
          preferredReactionTarget,
          session.playerCount,
          nextRoundEligibleReactionTargets
        )
      : session.reactionTargetPlayerIndex,
    reactionUsedThisRound: reachedRoundBoundary ? false : session.reactionUsedThisRound,
  })
}
