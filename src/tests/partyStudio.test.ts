import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARTY_STUDIO_CONFIG,
  applyPartyBoardLayout,
  createLayoutFromBoardConfig,
  validatePartyStudioConfig,
} from '../services/partyStudio'
import type { BoardCell } from '../types/game'

describe('Party Studio 场景编辑器', () => {
  it('默认配置覆盖导演、格子比例、内容池、布局和主题且通过校验', () => {
    expect(validatePartyStudioConfig(DEFAULT_PARTY_STUDIO_CONFIG)).toEqual({ ok: true })
    expect(DEFAULT_PARTY_STUDIO_CONFIG.cellLayout).toHaveLength(
      DEFAULT_PARTY_STUDIO_CONFIG.boardConfig.totalCells - 2
    )
  })

  it('按棋盘比例生成稳定布局并可把拖拽后的类型顺序投影到实际格子', () => {
    const config = {
      ...DEFAULT_PARTY_STUDIO_CONFIG.boardConfig,
      totalCells: 20,
      punishmentCells: 2,
      chainPunishmentCells: 1,
      bonusCells: 13,
      reverseCells: 0,
      restCells: 0,
      restartCells: 0,
      trapCells: 1,
      qaCells: 1,
      dareCells: 0,
    }
    const layout = createLayoutFromBoardConfig(config)
    expect(layout.slice(0, 3)).toEqual(['punishment', 'punishment', 'chain_punishment'])
    expect(layout).toHaveLength(18)

    const board: BoardCell[] = [
      { id: 1, position: 1, type: 'bonus' },
      ...layout.map((type, index) => ({ id: index + 2, position: index + 2, type }) as BoardCell),
      { id: 20, position: 20, type: 'bonus' },
    ]
    const swapped = [layout[1], layout[0], ...layout.slice(2)]
    expect(
      applyPartyBoardLayout(board, swapped)
        .slice(1, -1)
        .map(cell => cell.type)
    ).toEqual(swapped)
  })

  it('拒绝时间倒序、格子超额、空内容池和布局计数漂移', () => {
    expect(
      validatePartyStudioConfig({
        ...DEFAULT_PARTY_STUDIO_CONFIG,
        director: { ...DEFAULT_PARTY_STUDIO_CONFIG.director, endAfterMinutes: 1 },
      })
    ).toMatchObject({ ok: false })
    expect(
      validatePartyStudioConfig({
        ...DEFAULT_PARTY_STUDIO_CONFIG,
        qaQuestions: { ...DEFAULT_PARTY_STUDIO_CONFIG.qaQuestions, warmup: [] },
      })
    ).toMatchObject({ ok: false })
    expect(
      validatePartyStudioConfig({
        ...DEFAULT_PARTY_STUDIO_CONFIG,
        cellLayout: DEFAULT_PARTY_STUDIO_CONFIG.cellLayout.slice(1),
      })
    ).toMatchObject({ ok: false })
  })
})
