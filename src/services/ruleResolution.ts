import type {
  BoardCell,
  Player,
  PunishmentAction,
  PunishmentConfig,
  PunishmentConstraints,
  PunishmentVariant,
  ResolvedCellEffectResult,
  ResolvedDareResult,
  ResolvedPunishmentAction,
  ResolvedPunishmentResult,
  ResolvedQAResult,
  ResolvedRuleResult,
  ResolvedTrapResult,
  TurnConsequence,
} from '../types/game'
import { SecureRandom } from '../utils/secureRandom'
import { createCompatiblePunishmentAction as createSharedCompatiblePunishmentAction } from '@flying-chess/game-core/config'

export type PunishmentRuleInput =
  | {
      source: 'board_punishment'
      actorIndex: number
      players: readonly Player[]
      punishmentConfig: PunishmentConfig
      diceValue?: number
      randomSource?: RuleRandomSource
      boardAction: PunishmentAction
      punishmentVariant?: PunishmentVariant
    }
  | {
      source: 'takeoff_failure'
      actorIndex: number
      players: readonly Player[]
      punishmentConfig: PunishmentConfig
      diceValue?: number
      randomSource?: RuleRandomSource
      punishmentAction: PunishmentAction
      punishmentVariant?: PunishmentVariant
    }

export interface CellEffectRuleInput {
  source: 'cell_effect'
  actorIndex: number
  players: readonly Player[]
  effect: NonNullable<BoardCell['effect']>
}

export interface TrapRuleInput {
  source: 'trap'
  actorIndex: number
  players: readonly Player[]
  effect: NonNullable<BoardCell['effect']>
}

export interface QARuleInput {
  source: 'qa'
  actorIndex: number
  players: readonly Player[]
  effect: NonNullable<BoardCell['effect']>
}

export interface DareRuleInput {
  source: 'dare'
  actorIndex: number
  players: readonly Player[]
  effect: NonNullable<BoardCell['effect']>
}

export type RuleInput =
  | PunishmentRuleInput
  | CellEffectRuleInput
  | TrapRuleInput
  | QARuleInput
  | DareRuleInput

export interface RuleRandomSource {
  weightedChoice<T>(entries: readonly T[], weights: readonly number[]): T
  randomInt(minimum: number, maximum: number): number
  choice<T>(entries: readonly T[]): T
}

const secureRandomSource: RuleRandomSource = {
  weightedChoice: (entries, weights) => SecureRandom.weightedChoice([...entries], [...weights]),
  randomInt: (minimum, maximum) => SecureRandom.randomInt(minimum, maximum),
  choice: entries => SecureRandom.choice([...entries]),
}

export const createCompatiblePunishmentAction = (
  config: PunishmentConfig,
  randomSource: RuleRandomSource = secureRandomSource,
  constraints?: PunishmentConstraints
): PunishmentAction =>
  createSharedCompatiblePunishmentAction(
    config,
    {
      randomInt: randomSource.randomInt,
      choice: randomSource.choice,
      weightedChoice: randomSource.weightedChoice,
    },
    constraints
  )

/** Pick a random punishment variant for party mode based on act and probability */
export const pickPunishmentVariant = (
  act: 'warmup' | 'heating' | 'finale',
  randomSource: RuleRandomSource = secureRandomSource,
  allowedVariants?: readonly PunishmentVariant[]
): PunishmentVariant | undefined => {
  const variantChances: Record<string, Partial<Record<PunishmentVariant, number>>> = {
    warmup: {},
    heating: { blindbox: 15, conditional: 10 },
    finale: { blindbox: 15, conditional: 10, deferred: 10, mutual: 10, encore: 5 },
  }
  const chances = variantChances[act]
  const roll = randomSource.randomInt(1, 100)
  let cumulative = 0
  for (const [variant, chance] of Object.entries(chances)) {
    if (allowedVariants && !allowedVariants.includes(variant as PunishmentVariant)) continue
    cumulative += chance ?? 0
    if (roll <= cumulative) return variant as PunishmentVariant
  }
  return undefined
}

const copyAction = (
  action: PunishmentAction,
  strikes: number | undefined
): ResolvedPunishmentAction =>
  Object.freeze({
    ...action,
    strikes,
    tool: Object.freeze({ ...action.tool }),
    bodyPart: Object.freeze({ ...action.bodyPart }),
    position: Object.freeze({
      ...action.position,
      compatibleBodyParts: Object.freeze([...action.position.compatibleBodyParts]),
    }),
  })

export const finalizePunishmentCount = (
  result: ResolvedPunishmentResult,
  selectedCount: number
): ResolvedPunishmentResult => {
  if (result.count.kind !== 'awaiting_external_count') {
    throw new Error('惩罚次数已经固定')
  }

  const { minimum, maximum } = result.count
  const step = Math.max(1, result.count.step)
  if (
    !Number.isInteger(selectedCount) ||
    selectedCount < minimum ||
    selectedCount > maximum ||
    selectedCount % step !== 0
  ) {
    throw new Error('选择的惩罚次数不符合规则')
  }

  const finalizedCount = Math.ceil(selectedCount * (result.countMultiplier ?? 1))
  return Object.freeze({
    ...result,
    action: Object.freeze({
      ...result.action,
      strikes: finalizedCount,
      description: `用${result.action.tool.name}打${result.action.bodyPart.name}${finalizedCount}下，姿势：${result.action.position.name}`,
    }),
    count: Object.freeze({ kind: 'fixed', value: finalizedCount }),
  })
}

export const scaleResolvedPunishmentCount = (
  result: ResolvedPunishmentResult,
  multiplier: number
): ResolvedPunishmentResult => {
  if (result.count.kind !== 'fixed' || !Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error('只有固定次数惩罚可以按倍率结算')
  }

  const scaledCount = Math.ceil(result.count.value * multiplier)
  return Object.freeze({
    ...result,
    action: Object.freeze({
      ...result.action,
      strikes: scaledCount,
      description: `用${result.action.tool.name}打${result.action.bodyPart.name}${scaledCount}下，姿势：${result.action.position.name}`,
    }),
    count: Object.freeze({ kind: 'fixed', value: scaledCount }),
  })
}

export const applyTurnConsequence = (player: Player, consequence: TurnConsequence): Player => ({
  ...player,
  pendingSkippedTurns:
    consequence.kind === 'skip_next_turns'
      ? Math.max(0, player.pendingSkippedTurns ?? 0) + Math.max(0, consequence.count)
      : Math.max(0, player.pendingSkippedTurns ?? 0),
})

export const consumePendingSkippedTurn = (
  player: Player
): { shouldSkip: boolean; player: Player } => {
  const pendingSkippedTurns = Math.max(0, player.pendingSkippedTurns ?? 0)
  if (pendingSkippedTurns === 0) {
    return {
      shouldSkip: false,
      player: { ...player, pendingSkippedTurns: 0 },
    }
  }

  return {
    shouldSkip: true,
    player: { ...player, pendingSkippedTurns: pendingSkippedTurns - 1 },
  }
}

export function resolveRule(input: PunishmentRuleInput): ResolvedPunishmentResult
export function resolveRule(input: CellEffectRuleInput): ResolvedCellEffectResult
export function resolveRule(input: TrapRuleInput): ResolvedTrapResult
export function resolveRule(input: QARuleInput): ResolvedQAResult
export function resolveRule(input: DareRuleInput): ResolvedDareResult
export function resolveRule(input: RuleInput): ResolvedRuleResult {
  if (input.actorIndex < 0 || input.actorIndex >= input.players.length) {
    throw new Error('规则解析需要有效的触发玩家索引')
  }

  if (input.source === 'qa') {
    return Object.freeze({
      kind: 'qa',
      source: 'qa',
      actorIndex: input.actorIndex,
      question: input.effect.description,
      turnConsequence: Object.freeze({ kind: 'none' }),
    })
  }

  if (input.source === 'dare') {
    return Object.freeze({
      kind: 'dare',
      source: 'dare',
      actorIndex: input.actorIndex,
      instruction: input.effect.description,
      turnConsequence: Object.freeze({ kind: 'none' }),
    })
  }

  if (input.source === 'trap') {
    if (input.effect.type !== 'trap') {
      throw new Error('机关规则需要 trap 类型效果')
    }

    const trapVariant = input.effect.trapVariant
    let rouletteTargetIndex: number | undefined
    if (trapVariant === 'roulette' && input.players.length > 1) {
      const randomSource = secureRandomSource
      const candidates = input.players.flatMap((_, index) =>
        index === input.actorIndex ? [] : [index]
      )
      rouletteTargetIndex = candidates.length > 0 ? randomSource.choice(candidates) : undefined
    }

    return Object.freeze({
      kind: 'trap',
      source: 'trap',
      actorIndex: input.actorIndex,
      acknowledgementRequired: true,
      description: input.effect.description,
      turnConsequence: Object.freeze({ kind: 'none' }),
      trapVariant,
      choiceA: input.effect.choiceA,
      choiceB: input.effect.choiceB,
      rouletteTargetIndex,
    })
  }

  if (input.source === 'cell_effect') {
    const skipCount =
      input.effect.type === 'rest' ? Math.max(1, Math.trunc(input.effect.value) || 1) : 0

    return Object.freeze({
      kind: 'cell_effect',
      source: 'cell_effect',
      actorIndex: input.actorIndex,
      effect: Object.freeze({ ...input.effect }),
      turnConsequence:
        skipCount > 0
          ? Object.freeze({ kind: 'skip_next_turns', count: skipCount })
          : Object.freeze({ kind: 'none' }),
    })
  }

  const action = input.source === 'board_punishment' ? input.boardAction : input.punishmentAction
  const randomSource = input.randomSource ?? secureRandomSource
  const playerCount = input.players.length
  let targetPlayerIndex = input.actorIndex
  let actionStrikes = action.strikes
  let count: ResolvedPunishmentResult['count'] | undefined

  switch (action.dynamicType) {
    case 'dice_multiplier': {
      if (input.diceValue === undefined || action.multiplier === undefined) {
        throw new Error('骰子倍数惩罚需要骰子点数和倍数')
      }
      actionStrikes = input.diceValue * action.multiplier
      count = Object.freeze({ kind: 'fixed', value: actionStrikes })
      break
    }
    case 'previous_player':
      targetPlayerIndex = (input.actorIndex + playerCount - 1) % playerCount
      break
    case 'next_player':
      targetPlayerIndex = (input.actorIndex + 1) % playerCount
      break
    case 'other_player_choice':
      actionStrikes = undefined
      count = Object.freeze({
        kind: 'awaiting_external_count',
        minimum: input.punishmentConfig.minStrikes,
        maximum: input.punishmentConfig.maxStrikes,
        step: input.punishmentConfig.step,
        eligibleChooserIndices: Object.freeze(
          input.players.flatMap((_, index) => (index === input.actorIndex ? [] : [index]))
        ),
      })
      break
  }

  if (!count) {
    if (actionStrikes === undefined) {
      throw new Error('静态惩罚动作需要固定次数')
    }
    count = Object.freeze({ kind: 'fixed', value: actionStrikes })
  }

  const countMultiplier = input.players[targetPlayerIndex].pendingMercyMultiplier
  const executorCandidates = input.players.flatMap((_, index) =>
    index === targetPlayerIndex ? [] : [index]
  )
  const executorIndex =
    executorCandidates.length > 0 ? randomSource.choice(executorCandidates) : undefined

  const result: ResolvedPunishmentResult = Object.freeze({
    kind: 'punishment',
    source: input.source,
    actorIndex: input.actorIndex,
    targetPlayerIndex,
    executorIndex,
    action: copyAction(action, actionStrikes),
    count,
    countMultiplier:
      countMultiplier !== undefined && countMultiplier > 1 ? countMultiplier : undefined,
    turnConsequence: Object.freeze({ kind: 'none' }),
    variant: input.punishmentVariant,
  })

  return result.count.kind === 'fixed' && result.countMultiplier
    ? scaleResolvedPunishmentCount(result, result.countMultiplier)
    : result
}
