import { describe, expect, it } from 'vitest'
import {
  createAutoBoardConfig,
  findBoardCell,
  getBoardCellType,
  getPlayerDisplayPosition,
  isSpecialBoardCell,
} from './boardRules'
import type { BoardCell } from './domainTypes'
import { validateBoardConfig } from './sharedConfig'

const board: BoardCell[] = [
  {
    id: 1,
    position: 1,
    type: 'bonus',
    effect: { type: 'move', value: 0, description: '起点' },
  },
  {
    id: 2,
    position: 2,
    type: 'special',
    effect: { type: 'reverse', value: 2, description: '后退 2 格' },
  },
]

describe('board rules', () => {
  it('allocates a legal board with deterministic largest remainders', () => {
    expect(createAutoBoardConfig(40)).toEqual({
      punishmentCells: 26,
      chainPunishmentCells: 2,
      bonusCells: 1,
      reverseCells: 2,
      restCells: 1,
      restartCells: 4,
      trapCells: 2,
      totalCells: 40,
    })

    expect(validateBoardConfig(createAutoBoardConfig(30, { qaCells: 5, dareCells: 3 }))).toBe(true)
  })

  it('finds and classifies cells without inventing a type for missing cells', () => {
    expect(findBoardCell(board, 2)).toBe(board[1])
    expect(isSpecialBoardCell(board, 1)).toBe(false)
    expect(isSpecialBoardCell(board, 2)).toBe(true)
    expect(getBoardCellType(board, 2)).toBe('special')
    expect(getBoardCellType(board, 99)).toBeUndefined()
  })

  it('maps player positions using the board size supplied by the adapter', () => {
    expect(getPlayerDisplayPosition(0, 40)).toEqual({ row: -1, col: -1 })
    expect(getPlayerDisplayPosition(1, 40)).toEqual({ row: 0, col: 0 })
    expect(getPlayerDisplayPosition(21, 40)).toEqual({ row: 1, col: 1 })
    expect(getPlayerDisplayPosition(41, 40)).toEqual({ row: 0, col: 0 })
  })
})
