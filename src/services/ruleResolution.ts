import type {
  Player,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
  ResolvedPunishmentResult,
} from '../types/game'
import { SecureRandom } from '../utils/secureRandom'

export type PunishmentRuleInput =
  | {
      source: 'board_punishment'
      actorIndex: number
      players: readonly Player[]
      boardAction: PunishmentAction
    }
  | {
      source: 'takeoff_failure'
      actorIndex: number
      players: readonly Player[]
      punishmentAction: PunishmentAction
    }

export interface RuleRandomSource {
  weightedChoice<T>(entries: readonly T[], weights: readonly number[]): T
  randomInt(minimum: number, maximum: number): number
}

const secureRandomSource: RuleRandomSource = {
  weightedChoice: (entries, weights) => SecureRandom.weightedChoice([...entries], [...weights]),
  randomInt: (minimum, maximum) => SecureRandom.randomInt(minimum, maximum),
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

  const viableTools = tools.filter(tool =>
    bodyParts.some(
      bodyPart =>
        bodyPart.sensitivity >= tool.intensity && hasCompatiblePosition(positions, bodyPart)
    )
  )
  const tool = chooseWeighted(viableTools, randomSource)

  const compatibleBodyParts = bodyParts.filter(
    bodyPart =>
      bodyPart.sensitivity >= tool.intensity && hasCompatiblePosition(positions, bodyPart)
  )
  const bodyPart = chooseWeighted(compatibleBodyParts, randomSource)

  const compatiblePositions = positions.filter(position => isPositionCompatible(position, bodyPart))
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

const copyAction = (action: PunishmentAction): Readonly<PunishmentAction> =>
  Object.freeze({
    ...action,
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
  const strikes = action.strikes
  if (strikes === undefined) {
    throw new Error('静态惩罚动作需要固定次数')
  }

  return Object.freeze({
    kind: 'punishment',
    source: input.source,
    actorIndex: input.actorIndex,
    targetPlayerIndex: input.actorIndex,
    action: copyAction(action),
    count: Object.freeze({ kind: 'fixed', value: strikes }),
    turnConsequence: Object.freeze({ kind: 'none' }),
  })
}
