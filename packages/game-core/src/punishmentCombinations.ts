import type {
  BoardCell,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentCombination,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
} from './domainTypes'
import { chooseWeighted, cryptoRandomInt, type PunishmentDynamicType } from './sharedConfig'

export interface PunishmentCombinationRandomSource {
  random(): number
  randomInt(minimum: number, maximum: number): number
}

export type DynamicPunishmentCellConfig = Readonly<{
  type: PunishmentDynamicType
  multiplier?: number
}>

export type DynamicPunishmentCells = Readonly<Record<number, DynamicPunishmentCellConfig>>

const secureRandomSource: PunishmentCombinationRandomSource = {
  random: () => cryptoRandomInt(0, 0xffff_ffff) / 0x1_0000_0000,
  randomInt: cryptoRandomInt,
}

const configToArray = <T extends { ratio: number }>(
  config: Readonly<Record<string, T>>
): Array<T & { name: string }> => Object.entries(config).map(([name, item]) => ({ ...item, name }))

const choice = <T>(entries: readonly T[], random: PunishmentCombinationRandomSource): T => {
  if (entries.length === 0) throw new Error('无法从空集合中选择惩罚组合')
  const selected = entries[random.randomInt(0, entries.length - 1)]
  if (selected === undefined) throw new Error('惩罚组合随机源返回了越界位置')
  return selected
}

const shuffle = <T>(entries: readonly T[], random: PunishmentCombinationRandomSource): T[] => {
  const result = [...entries]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.randomInt(0, index)
    const current = result[index]
    const swap = result[swapIndex]
    if (current === undefined || swap === undefined) {
      throw new Error('惩罚组合随机源返回了越界位置')
    }
    result[index] = swap
    result[swapIndex] = current
  }
  return result
}

const weightedChoice = <T>(
  entries: readonly T[],
  weights: readonly number[],
  random: PunishmentCombinationRandomSource
): T => chooseWeighted(entries, weights, random.random)

export function isPositionCompatibleWithBodyPart(
  position: Readonly<PunishmentPosition>,
  bodyPart: Readonly<PunishmentBodyPart>
): boolean {
  return (
    position.compatibleBodyParts.length === 0 ||
    position.compatibleBodyParts.includes(bodyPart.name)
  )
}

const createDefinition = (
  tool: PunishmentTool,
  bodyPart: PunishmentBodyPart,
  position: PunishmentPosition
): PunishmentCombination => ({
  tool,
  bodyPart,
  position,
  description: `用${tool.name}打${bodyPart.name}，姿势：${position.name}`,
})

type WeightedToolBodyPair = Readonly<{
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  positions: readonly PunishmentPosition[]
  ratio: number
}>

/**
 * Build the same tool/body-part distribution as createCompatiblePunishmentAction:
 * choose a tool first, then a compatible body part.
 *
 * Normalising the body-part ratio per tool is important. A plain product of
 * both ratios would make a tool less likely merely because it has fewer
 * compatible body parts.
 */
const createWeightedToolBodyPairs = (config: PunishmentConfig): WeightedToolBodyPair[] => {
  const tools = configToArray(config.tools).filter(tool => tool.ratio > 0)
  const bodyParts = configToArray(config.bodyParts).filter(bodyPart => bodyPart.ratio > 0)
  const positions = configToArray(config.positions).filter(position => position.ratio > 0)
  const pairs: WeightedToolBodyPair[] = []

  for (const tool of tools) {
    const compatible = bodyParts
      .filter(bodyPart => bodyPart.sensitivity >= tool.intensity)
      .map(bodyPart => ({
        bodyPart,
        positions: positions.filter(position =>
          isPositionCompatibleWithBodyPart(position, bodyPart)
        ),
      }))
      .filter(candidate => candidate.positions.length > 0)
    const bodyPartRatioTotal = compatible.reduce(
      (total, candidate) => total + candidate.bodyPart.ratio,
      0
    )
    if (!(bodyPartRatioTotal > 0)) continue

    for (const candidate of compatible) {
      pairs.push({
        tool,
        bodyPart: candidate.bodyPart,
        positions: candidate.positions,
        ratio: tool.ratio * (candidate.bodyPart.ratio / bodyPartRatioTotal),
      })
    }
  }
  return pairs
}

const createActionFromDefinition = (
  definition: PunishmentCombination,
  config: PunishmentConfig,
  random: PunishmentCombinationRandomSource
): PunishmentAction => {
  const minimum = Math.max(1, config.minStrikes || 10)
  const maximum = Math.max(minimum, config.maxStrikes || 30)
  const step = config.step || 5
  const minimumMultiple = Math.ceil(minimum / step)
  const maximumMultiple = Math.floor(maximum / step)
  if (minimumMultiple > maximumMultiple) {
    throw new Error('惩罚次数范围内没有符合当前步长的可用值')
  }
  const strikes = random.randomInt(minimumMultiple, maximumMultiple) * step
  return {
    tool: { ...definition.tool },
    bodyPart: { ...definition.bodyPart },
    position: {
      ...definition.position,
      compatibleBodyParts: [...definition.position.compatibleBodyParts],
    },
    strikes,
    description: `用${definition.tool.name}打${definition.bodyPart.name}${strikes}下，姿势：${definition.position.name}`,
  }
}

export function selectByRatio<T extends { ratio: number }>(
  items: readonly T[],
  random: PunishmentCombinationRandomSource = secureRandomSource
): T {
  const enabled = items.filter(item => item.ratio > 0)
  const candidates = enabled.length > 0 ? enabled : [...items]
  if (candidates.length === 0) throw new Error('无法从空列表中选择项目')
  const weights = enabled.length > 0 ? candidates.map(item => item.ratio) : candidates.map(() => 1)
  return weightedChoice(candidates, weights, random)
}

export function applyEqualPunishmentRatios(config: PunishmentConfig): void {
  const setEqualRatio = (entries: Record<string, { ratio: number }>): void => {
    const values = Object.values(entries)
    if (values.length === 0) return
    const ratio = 100 / values.length
    values.forEach(value => {
      value.ratio = ratio
    })
  }
  setEqualRatio(config.tools)
  setEqualRatio(config.bodyParts)
  setEqualRatio(config.positions)
}

export function generatePunishmentCombinationDefinitions(
  config: PunishmentConfig,
  count = 10,
  random: PunishmentCombinationRandomSource = secureRandomSource
): PunishmentCombination[] {
  if (count <= 0) return []
  const pairs = createWeightedToolBodyPairs(config)
  if (pairs.length === 0) return []
  return Array.from({ length: count }, () => {
    const pair = weightedChoice(
      pairs,
      pairs.map(candidate => candidate.ratio),
      random
    )
    const position = weightedChoice(
      pair.positions,
      pair.positions.map(candidate => candidate.ratio),
      random
    )
    return createDefinition(pair.tool, pair.bodyPart, position)
  })
}

export function generatePunishmentCombinations(
  config: PunishmentConfig,
  count = 10,
  random: PunishmentCombinationRandomSource = secureRandomSource
): PunishmentAction[] {
  return generatePunishmentCombinationDefinitions(config, count, random).map(definition =>
    createActionFromDefinition(definition, config, random)
  )
}

const getWindowCombinations = (
  board: readonly BoardCell[],
  currentPosition: number,
  windowSize = 6
): PunishmentCombination[] => {
  const cells = board
    .filter(cell => cell.type === 'punishment' && cell.effect?.punishment)
    .sort((left, right) => left.position - right.position)
  const currentIndex = cells.findIndex(cell => cell.position === currentPosition)
  if (currentIndex < 0) return []
  const halfWindow = Math.floor(windowSize / 2)
  const result: PunishmentCombination[] = []
  for (
    let index = Math.max(0, currentIndex - halfWindow);
    index <= Math.min(cells.length - 1, currentIndex + halfWindow);
    index += 1
  ) {
    if (index === currentIndex) continue
    const punishment = cells[index]?.effect?.punishment
    if (punishment) {
      result.push({
        tool: punishment.tool,
        bodyPart: punishment.bodyPart,
        position: punishment.position,
        description: punishment.description,
      })
    }
  }
  return result
}

const diversityScore = (
  candidate: PunishmentCombination,
  window: readonly PunishmentCombination[]
): number => {
  const repeats = (field: 'tool' | 'bodyPart' | 'position'): number =>
    window.filter(entry => entry[field].name === candidate[field].name).length
  return Math.max(
    0,
    100 - repeats('tool') * 30 - repeats('bodyPart') * 20 - repeats('position') * 10
  )
}

const meetsDiversityRequirement = (
  candidate: PunishmentCombination,
  window: readonly PunishmentCombination[]
): boolean => {
  if (window.length < 3) return true
  const differentDimensions = (['tool', 'bodyPart', 'position'] as const).filter(
    field => !window.some(entry => entry[field].name === candidate[field].name)
  ).length
  return differentDimensions >= 2
}

const selectOptimalCombination = (
  available: readonly PunishmentCombination[],
  window: readonly PunishmentCombination[],
  random: PunishmentCombinationRandomSource
): PunishmentCombination => {
  if (available.length === 0) throw new Error('没有可用的惩罚组合')
  if (available.length === 1) return available[0] as PunishmentCombination
  const scored = available.map(combination => ({
    combination,
    score: diversityScore(combination, window),
    diverse: meetsDiversityRequirement(combination, window),
  }))
  const diverse = scored.filter(entry => entry.diverse)
  const pool = diverse.length > 0 ? diverse : scored
  const maximum = Math.max(...pool.map(entry => entry.score))
  const top = pool.filter(entry => entry.score === maximum).map(entry => entry.combination)
  if (top.length === 1) return top[0] as PunishmentCombination
  // The confirmed list already contains the configured distribution. Choosing
  // uniformly among its entries preserves that distribution; applying the
  // ratios again here would square their influence.
  return choice(top, random)
}

const assignWithDiversity = (
  positions: readonly number[],
  combinations: readonly PunishmentCombination[],
  board: readonly BoardCell[],
  random: PunishmentCombinationRandomSource
): Map<number, PunishmentCombination> => {
  const assignments = new Map<number, PunishmentCombination>()
  let remaining: PunishmentCombination[] = []
  for (const position of [...positions].sort((left, right) => left - right)) {
    // Consume every confirmed entry once before starting another round. This
    // lets diversity change only the order, never the confirmed item counts.
    if (remaining.length === 0) remaining = [...combinations]
    const window = getWindowCombinations(board, position, 6)
    for (const [assignedPosition, combination] of assignments) {
      if (assignedPosition !== position && Math.abs(assignedPosition - position) <= 3) {
        window.push(combination)
      }
    }
    const selected = selectOptimalCombination(remaining, window, random)
    assignments.set(position, selected)
    const selectedIndex = remaining.indexOf(selected)
    if (selectedIndex >= 0) remaining.splice(selectedIndex, 1)
  }
  return assignments
}

const withDynamicRule = (
  action: PunishmentAction,
  dynamic: DynamicPunishmentCellConfig | undefined
): PunishmentAction => {
  const result: PunishmentAction = {
    ...action,
    tool: { ...action.tool },
    bodyPart: { ...action.bodyPart },
    position: { ...action.position, compatibleBodyParts: [...action.position.compatibleBodyParts] },
  }
  if (!dynamic) return result
  result.dynamicType = dynamic.type
  result.multiplier = dynamic.multiplier
  switch (dynamic.type) {
    case 'dice_multiplier':
      if (dynamic.multiplier !== undefined) {
        result.description = `用${result.tool.name}打${result.bodyPart.name}，姿势：${result.position.name}（骰子点数×${dynamic.multiplier}）`
      }
      break
    case 'previous_player':
      result.description = `上一个玩家：用${result.tool.name}打${result.bodyPart.name}，姿势：${result.position.name}`
      break
    case 'next_player':
      result.description = `下一个玩家：用${result.tool.name}打${result.bodyPart.name}，姿势：${result.position.name}`
      break
    case 'other_player_choice':
      result.description = `用${result.tool.name}打${result.bodyPart.name}，姿势：${result.position.name}（数量由其他玩家决定）`
      break
  }
  return result
}

const cloneBoard = (board: readonly BoardCell[]): BoardCell[] =>
  board.map(cell => ({
    ...cell,
    effect: cell.effect
      ? {
          ...cell.effect,
          punishment: cell.effect.punishment
            ? withDynamicRule(cell.effect.punishment, undefined)
            : undefined,
        }
      : undefined,
  }))

const writePunishment = (cell: BoardCell, action: PunishmentAction): void => {
  cell.effect = {
    type: 'punishment',
    value: 0,
    description: action.description,
    punishment: action,
    dynamicType: action.dynamicType,
    multiplier: action.multiplier,
  }
}

export function updateBoardWithConfirmedCombinationDefinitions(
  board: readonly BoardCell[],
  combinations: readonly PunishmentCombination[],
  config: PunishmentConfig,
  dynamicCells: DynamicPunishmentCells,
  random: PunishmentCombinationRandomSource = secureRandomSource
): BoardCell[] {
  const updated = cloneBoard(board)
  if (combinations.length === 0) return updated
  const positions = updated.filter(cell => cell.type === 'punishment').map(cell => cell.position)
  const assignments = assignWithDiversity(positions, combinations, updated, random)
  for (const position of positions) {
    const cell = updated.find(candidate => candidate.position === position)
    const definition = assignments.get(position)
    if (cell && definition) {
      const action = withDynamicRule(
        createActionFromDefinition(definition, config, random),
        dynamicCells[position]
      )
      writePunishment(cell, action)
    }
  }
  return updated
}

export function updateBoardWithConfirmedCombinations(
  board: readonly BoardCell[],
  combinations: readonly PunishmentAction[],
  dynamicCells: DynamicPunishmentCells
): BoardCell[] {
  const updated = cloneBoard(board)
  if (combinations.length === 0) return updated
  const cells = updated.filter(cell => cell.type === 'punishment')
  cells.forEach((cell, index) => {
    const action = combinations[index % combinations.length]
    if (action) writePunishment(cell, withDynamicRule(action, dynamicCells[cell.position]))
  })
  return updated
}

const calculateDistribution = <T extends { ratio: number }>(
  items: readonly T[],
  totalCount: number,
  random: PunishmentCombinationRandomSource
): number[] => {
  if (items.length === 0 || totalCount <= 0) return []
  if (items.length === 1) return [totalCount]
  const ratios = items.map(item => Math.max(0, item.ratio))
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0)
  if (totalRatio <= 0) {
    const base = Math.floor(totalCount / items.length)
    let remainder = totalCount % items.length
    return items.map(() => {
      const count = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
      return count
    })
  }
  const exact = ratios.map(ratio => (ratio / totalRatio) * totalCount)
  const distribution = exact.map(Math.floor)
  const remainder = totalCount - distribution.reduce((sum, count) => sum + count, 0)
  const ranked = exact
    .map((value, index) => ({
      index,
      remainder: value - (distribution[index] ?? 0),
      tieBreaker: random.random(),
    }))
    .sort((left, right) => right.remainder - left.remainder || right.tieBreaker - left.tieBreaker)
  for (let index = 0; index < remainder; index += 1) {
    const target = ranked[index % ranked.length]
    if (target) distribution[target.index] = (distribution[target.index] ?? 0) + 1
  }
  return distribution
}

const expandByDistribution = <T>(items: readonly T[], distribution: readonly number[]): T[] => {
  const expanded: T[] = []
  items.forEach((item, index) => {
    for (let count = 0; count < (distribution[index] ?? 0); count += 1) expanded.push(item)
  })
  return expanded
}

export function generateBalancedPunishmentCombinationDefinitions(
  config: PunishmentConfig,
  count = 10,
  random: PunishmentCombinationRandomSource = secureRandomSource
): PunishmentCombination[] {
  if (count <= 0) return []
  const pairs = createWeightedToolBodyPairs(config)
  if (pairs.length === 0) return []

  // Allocate tool/body slots globally so small per-tool buckets cannot round
  // every low-probability body part down to zero.
  const pairSlots = shuffle(
    expandByDistribution(pairs, calculateDistribution(pairs, count, random)),
    random
  )
  // Restrictive body parts are placed first. Among their compatible positions,
  // prefer the one furthest below the expected conditional distribution.
  pairSlots.sort((left, right) => left.positions.length - right.positions.length)
  const positionsByName = new Map<string, { position: PunishmentPosition; ratio: number }>()
  for (const pair of pairSlots) {
    const compatibleRatioTotal = pair.positions.reduce(
      (total, position) => total + position.ratio,
      0
    )
    for (const position of pair.positions) {
      const current = positionsByName.get(position.name)
      const ratio = position.ratio / compatibleRatioTotal
      positionsByName.set(position.name, {
        position,
        ratio: (current?.ratio ?? 0) + ratio,
      })
    }
  }
  const positionCandidates = [...positionsByName.values()]
  const positionDistribution = calculateDistribution(positionCandidates, count, random)
  const targetCounts = new Map(
    positionCandidates.map((candidate, index) => [
      candidate.position.name,
      positionDistribution[index] ?? 0,
    ])
  )
  const actualCounts = new Map<string, number>()

  const definitions = pairSlots.map(pair => {
    const scored = pair.positions.map(position => ({
      position,
      deficit: (targetCounts.get(position.name) ?? 0) - (actualCounts.get(position.name) ?? 0),
    }))
    const maximumDeficit = Math.max(...scored.map(candidate => candidate.deficit))
    const top = scored.filter(candidate => candidate.deficit === maximumDeficit)
    const selected = choice(top, random).position
    actualCounts.set(selected.name, (actualCounts.get(selected.name) ?? 0) + 1)
    return createDefinition(pair.tool, pair.bodyPart, selected)
  })
  return shuffle(definitions, random)
}

export function generateBalancedPunishmentCombinations(
  config: PunishmentConfig,
  count = 10,
  random: PunishmentCombinationRandomSource = secureRandomSource
): PunishmentAction[] {
  return generateBalancedPunishmentCombinationDefinitions(config, count, random).map(definition =>
    createActionFromDefinition(definition, config, random)
  )
}
