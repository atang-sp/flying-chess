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

const createAllDefinitions = (config: PunishmentConfig): PunishmentCombination[] => {
  const tools = configToArray(config.tools).filter(tool => tool.ratio > 0)
  const bodyParts = configToArray(config.bodyParts).filter(bodyPart => bodyPart.ratio > 0)
  const positions = configToArray(config.positions).filter(position => position.ratio > 0)
  const definitions: PunishmentCombination[] = []

  for (const tool of tools) {
    for (const bodyPart of bodyParts) {
      if (tool.intensity > bodyPart.sensitivity) continue
      for (const position of positions) {
        if (isPositionCompatibleWithBodyPart(position, bodyPart)) {
          definitions.push(createDefinition(tool, bodyPart, position))
        }
      }
    }
  }
  return definitions
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
  const all = createAllDefinitions(config)
  if (all.length <= count) return all
  return shuffle(all, random).slice(0, count)
}

export function generatePunishmentCombinations(
  config: PunishmentConfig,
  count = 10,
  random: PunishmentCombinationRandomSource = secureRandomSource
): PunishmentAction[] {
  if (count <= 0) return []
  const all = shuffle(createAllDefinitions(config), random)
  if (all.length === 0) return []
  const selected = all.slice(0, count)
  while (selected.length < count) selected.push(choice(all, random))
  return selected.map(definition => createActionFromDefinition(definition, config, random))
}

const punishmentKey = (combination: PunishmentCombination): string =>
  `${combination.tool.name}-${combination.bodyPart.name}-${combination.position.name}`

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
  // 使用 tool.ratio × bodyPart.ratio 联合权重打破平局，确保部位和工具都符合比例
  const weights = top.map(combination =>
    Math.max(0, combination.tool.ratio * combination.bodyPart.ratio)
  )
  return weights.some(weight => weight > 0)
    ? weightedChoice(top, weights, random)
    : choice(top, random)
}

const assignWithDiversity = (
  positions: readonly number[],
  combinations: readonly PunishmentCombination[],
  board: readonly BoardCell[],
  random: PunishmentCombinationRandomSource
): Map<number, PunishmentCombination> => {
  const assignments = new Map<number, PunishmentCombination>()
  for (const position of [...positions].sort((left, right) => left - right)) {
    const window = getWindowCombinations(board, position, 6)
    for (const [assignedPosition, combination] of assignments) {
      if (assignedPosition !== position && Math.abs(assignedPosition - position) <= 3) {
        window.push(combination)
      }
    }
    assignments.set(position, selectOptimalCombination(combinations, window, random))
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
  const all = createAllDefinitions(config)
  if (all.length <= count) return all
  const tools = configToArray(config.tools).filter(tool => tool.ratio > 0)
  const bodyParts = configToArray(config.bodyParts).filter(bodyPart => bodyPart.ratio > 0)
  const positions = configToArray(config.positions).filter(position => position.ratio > 0)

  // 构建 (工具, 部位) 联合对，过滤掉强度不兼容的组合
  // 按联合权重 (tool.ratio × bodyPart.ratio) 预分配格子数
  // 这样才能同时保证工具和部位的实际出现比例都符合设定
  type ToolBodyPair = {
    tool: PunishmentTool & { name: string }
    bodyPart: PunishmentBodyPart & { name: string }
    ratio: number
  }
  const toolBodyPairs: ToolBodyPair[] = []
  for (const tool of tools) {
    const compatible = bodyParts.filter(part => part.sensitivity >= tool.intensity)
    const candidates =
      compatible.length > 0
        ? compatible
        : bodyParts.length > 0
          ? [
              bodyParts.reduce((best, current) =>
                current.sensitivity > best.sensitivity ? current : best
              ),
            ]
          : []
    for (const bodyPart of candidates) {
      toolBodyPairs.push({ tool, bodyPart, ratio: tool.ratio * bodyPart.ratio })
    }
  }

  const toolBodyPool = shuffle(
    expandByDistribution(toolBodyPairs, calculateDistribution(toolBodyPairs, count, random)),
    random
  )
  const remainingPositions = shuffle(
    expandByDistribution(positions, calculateDistribution(positions, count, random)),
    random
  )
  const result: PunishmentCombination[] = []
  const used = new Set<string>()

  for (const { tool, bodyPart } of toolBodyPool) {
    if (result.length >= count || remainingPositions.length === 0) break
    // 优先选未使用过的组合（三元组去重），若全部用过则允许重复（保证槽位被填满）
    const unusedCandidates: Array<{
      position: PunishmentPosition
      positionIndex: number
    }> = []
    const allCandidates: Array<{
      position: PunishmentPosition
      positionIndex: number
    }> = []
    remainingPositions.forEach((position, positionIndex) => {
      if (!isPositionCompatibleWithBodyPart(position, bodyPart)) return
      const definition = createDefinition(tool, bodyPart, position)
      allCandidates.push({ position, positionIndex })
      if (!used.has(punishmentKey(definition))) {
        unusedCandidates.push({ position, positionIndex })
      }
    })
    // 优先选未使用过的；若全部已使用，则从所有兼容中选（避免槽位白白浪费）
    const candidates = unusedCandidates.length > 0 ? unusedCandidates : allCandidates
    if (candidates.length === 0) continue
    const selected = choice(candidates, random)
    const definition = createDefinition(tool, bodyPart, selected.position)
    result.push(definition)
    used.add(punishmentKey(definition))
    remainingPositions.splice(selected.positionIndex, 1)
  }

  while (result.length < count && remainingPositions.length > 0) {
    let selectedPositionIndex = -1
    let selected: PunishmentCombination | undefined
    for (const positionIndex of shuffle(
      remainingPositions.map((_position, index) => index),
      random
    )) {
      const position = remainingPositions[positionIndex]
      if (!position) continue
      const available = all.filter(
        definition =>
          definition.position.name === position.name && !used.has(punishmentKey(definition))
      )
      if (available.length > 0) {
        selectedPositionIndex = positionIndex
        // 按 tool.ratio × bodyPart.ratio 联合权重加权，确保部位和工具都符合比例
        selected = weightedChoice(
          available,
          available.map(definition =>
            Math.max(1, definition.tool.ratio * definition.bodyPart.ratio)
          ),
          random
        )
        break
      }
    }
    if (!selected || selectedPositionIndex < 0) break
    result.push(selected)
    used.add(punishmentKey(selected))
    remainingPositions.splice(selectedPositionIndex, 1)
  }

  const remaining = all.filter(definition => !used.has(punishmentKey(definition)))
  while (result.length < count && remaining.length > 0) {
    // 按 tool.ratio × bodyPart.ratio 联合权重加权，确保部位和工具都符合比例
    const selected = weightedChoice(
      remaining,
      remaining.map(definition => Math.max(1, definition.tool.ratio * definition.bodyPart.ratio)),
      random
    )
    result.push(selected)
    used.add(punishmentKey(selected))
    const index = remaining.findIndex(
      definition => punishmentKey(definition) === punishmentKey(selected)
    )
    if (index >= 0) remaining.splice(index, 1)
  }
  return result
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
