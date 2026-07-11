import type {
  Player,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
  ResolvedPunishmentAction,
  ResolvedPunishmentResult,
} from '../types/game'
import { SecureRandom } from '../utils/secureRandom'

export type PunishmentRuleInput =
  | {
      source: 'board_punishment'
      actorIndex: number
      players: readonly Player[]
      punishmentConfig: PunishmentConfig
      diceValue?: number
      randomSource?: RuleRandomSource
      boardAction: PunishmentAction
    }
  | {
      source: 'takeoff_failure'
      actorIndex: number
      players: readonly Player[]
      punishmentConfig: PunishmentConfig
      diceValue?: number
      randomSource?: RuleRandomSource
      punishmentAction: PunishmentAction
    }

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

type NamedRatioEntry = { name: string; ratio: number }

const entriesWithNames = <T extends { ratio: number }>(
  config: Record<string, T>
): Array<T & { name: string }> =>
  Object.entries(config).map(([name, entry]) => ({ ...entry, name }))

const chooseWeighted = <T extends NamedRatioEntry>(
  entries: readonly T[],
  randomSource: RuleRandomSource
): T => {
  const enabledEntries = entries.filter(entry => entry.ratio > 0)
  if (enabledEntries.length === 0) {
    throw new Error('没有启用的惩罚配置')
  }

  return randomSource.weightedChoice(
    enabledEntries,
    enabledEntries.map(entry => entry.ratio)
  )
}

const isPositionCompatible = (
  position: PunishmentPosition,
  bodyPart: PunishmentBodyPart
): boolean =>
  position.compatibleBodyParts.length === 0 || position.compatibleBodyParts.includes(bodyPart.name)

const hasCompatiblePosition = (
  positions: readonly (PunishmentPosition & { name: string })[],
  bodyPart: PunishmentBodyPart
): boolean => positions.some(position => isPositionCompatible(position, bodyPart))

export const createCompatiblePunishmentAction = (
  config: PunishmentConfig,
  randomSource: RuleRandomSource = secureRandomSource
): PunishmentAction => {
  const tools = entriesWithNames<PunishmentTool>(config.tools)
  const bodyParts = entriesWithNames<PunishmentBodyPart>(config.bodyParts)
  const positions = entriesWithNames<PunishmentPosition>(config.positions)
  const enabledBodyParts = bodyParts.filter(bodyPart => bodyPart.ratio > 0)
  const enabledPositions = positions.filter(position => position.ratio > 0)

  const viableTools = tools.filter(
    tool =>
      tool.ratio > 0 &&
      enabledBodyParts.some(
      bodyPart =>
          bodyPart.sensitivity >= tool.intensity && hasCompatiblePosition(enabledPositions, bodyPart)
      )
  )
  const tool = chooseWeighted(viableTools, randomSource)

  const compatibleBodyParts = enabledBodyParts.filter(
    bodyPart =>
      bodyPart.sensitivity >= tool.intensity && hasCompatiblePosition(enabledPositions, bodyPart)
  )
  const bodyPart = chooseWeighted(compatibleBodyParts, randomSource)

  const compatiblePositions = enabledPositions.filter(position =>
    isPositionCompatible(position, bodyPart)
  )
  const position = chooseWeighted(compatiblePositions, randomSource)

  const step = Math.max(1, config.step || 1)
  const minimum = Math.max(1, config.minStrikes || step)
  const maximum = Math.max(minimum, config.maxStrikes || minimum)
  const minimumMultiple = Math.ceil(minimum / step)
  const maximumMultiple = Math.floor(maximum / step)
  if (minimumMultiple > maximumMultiple) {
    throw new Error('惩罚次数范围内没有合法步长')
  }

  const strikes = randomSource.randomInt(minimumMultiple, maximumMultiple) * step
  return {
    tool,
    bodyPart,
    position,
    strikes,
    description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
  }
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

export const resolveRule = (input: PunishmentRuleInput): ResolvedPunishmentResult => {
  if (input.actorIndex < 0 || input.actorIndex >= input.players.length) {
    throw new Error('规则解析需要有效的触发玩家索引')
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

  const executorCandidates = input.players.flatMap((_, index) =>
    index === targetPlayerIndex ? [] : [index]
  )
  const executorIndex =
    executorCandidates.length > 0 ? randomSource.choice(executorCandidates) : undefined

  return Object.freeze({
    kind: 'punishment',
    source: input.source,
    actorIndex: input.actorIndex,
    targetPlayerIndex,
    executorIndex,
    action: copyAction(action, actionStrikes),
    count,
    turnConsequence: Object.freeze({ kind: 'none' }),
  })
}
