import type { BoardCell, BoardConfig } from './domainTypes'

type BoardEffectCountField = Exclude<keyof BoardConfig, 'totalCells'>

const AUTO_BOARD_TARGETS: ReadonlyArray<{
  readonly field: BoardEffectCountField
  readonly ratio: number
}> = [
  { field: 'punishmentCells', ratio: 0.68 },
  { field: 'chainPunishmentCells', ratio: 0.07 },
  { field: 'restartCells', ratio: 0.1 },
  { field: 'bonusCells', ratio: 0.025 },
  { field: 'reverseCells', ratio: 0.05 },
  { field: 'restCells', ratio: 0.025 },
  { field: 'trapCells', ratio: 0.05 },
]

/**
 * Allocates every non-terminal cell using the canonical board ratios and the
 * largest-remainder method. Optional content cells reserve capacity first.
 */
export function createAutoBoardConfig(
  totalCells: number,
  contentCounts: Pick<BoardConfig, 'qaCells' | 'dareCells'> = {}
): BoardConfig {
  if (!Number.isInteger(totalCells) || totalCells < 20 || totalCells > 100) {
    throw new Error('自动分配要求总格子数为 20-100 范围内的整数')
  }

  const capacity = totalCells - 2
  const qaCells = clampContentCount(contentCounts.qaCells, capacity)
  const dareCells = clampContentCount(contentCounts.dareCells, capacity - (qaCells ?? 0))
  const assignableCells = capacity - (qaCells ?? 0) - (dareCells ?? 0)
  const allocations = AUTO_BOARD_TARGETS.map((target, index) => {
    const exact = assignableCells * target.ratio
    return {
      ...target,
      index,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    }
  })
  let remaining = assignableCells - allocations.reduce((sum, item) => sum + item.count, 0)

  for (const allocation of [...allocations].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index
  )) {
    if (remaining <= 0) break
    allocation.count += 1
    remaining -= 1
  }

  const config: BoardConfig = {
    punishmentCells: 0,
    chainPunishmentCells: 0,
    bonusCells: 0,
    reverseCells: 0,
    restCells: 0,
    restartCells: 0,
    trapCells: 0,
    totalCells,
    ...(qaCells === undefined ? {} : { qaCells }),
    ...(dareCells === undefined ? {} : { dareCells }),
  }
  for (const allocation of allocations) {
    config[allocation.field] = allocation.count
  }
  return config
}

function clampContentCount(value: number | undefined, capacity: number): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) {
    throw new Error('内容格子数量必须是有限数字')
  }
  return Math.min(Math.max(0, Math.trunc(value)), capacity)
}

export function getPlayerDisplayPosition(
  position: number,
  totalCells: number
): { row: number; col: number } {
  if (position === 0) return { row: -1, col: -1 }

  const boardSize = Math.max(2, totalCells)
  const outerRing = Math.ceil(boardSize / 2)
  const innerRing = boardSize - outerRing
  if (position <= outerRing) {
    const index = position - 1
    return { row: Math.floor(index / 5), col: index % 5 }
  }
  if (position <= outerRing + innerRing) {
    const index = position - outerRing - 1
    return { row: Math.floor(index / 5) + 1, col: (index % 5) + 1 }
  }
  return { row: 0, col: 0 }
}

export function findBoardCell(
  board: readonly BoardCell[],
  position: number
): BoardCell | undefined {
  return board.find(cell => cell.position === position)
}

export function isSpecialBoardCell(board: readonly BoardCell[], position: number): boolean {
  const effect = findBoardCell(board, position)?.effect
  if (!effect) return false
  return !(effect.type === 'move' && effect.value === 0)
}

export function getBoardCellType(
  board: readonly BoardCell[],
  position: number
): BoardCell['type'] | undefined {
  return findBoardCell(board, position)?.type
}
