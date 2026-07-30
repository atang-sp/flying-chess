import { describe, expect, it } from 'vitest'
import type { BoardCell } from '../types/game'
import { getBoardCellPresentation, getSnakeGridPosition } from '../utils/boardPresentation'

const cell = (overrides: Partial<BoardCell> = {}): BoardCell => ({
  id: 2,
  position: 2,
  type: 'bonus',
  effect: {
    type: 'move',
    value: 0,
    description: '普通格子',
  },
  ...overrides,
})

describe('棋盘呈现', () => {
  it('把没有移动效果的 bonus 数据呈现为普通格，而不是奖励格', () => {
    expect(getBoardCellPresentation(cell(), 40)).toMatchObject({
      kind: 'normal',
      label: '普通格',
      shortLabel: '普通',
      iconName: 'Circle',
    })
  })

  it('起点和终点使用明确说明，不继承普通填充格描述', () => {
    expect(getBoardCellPresentation(cell({ position: 1 }), 40).description).toBe(
      '所有玩家从这里等待起飞。'
    )
    expect(getBoardCellPresentation(cell({ position: 40 }), 40).description).toBe(
      '率先抵达这里即可赢得本局。'
    )
  })

  it('根据位置和实际效果区分所有玩家可见的格子类别', () => {
    const cases: Array<[BoardCell, string]> = [
      [cell({ position: 1 }), 'start'],
      [cell({ position: 40 }), 'finish'],
      [
        cell({
          type: 'punishment',
          effect: {
            type: 'punishment',
            value: 0,
            description: '手掌打手心 5 下',
            punishment: {
              tool: { name: '手掌', intensity: 1, ratio: 100 },
              bodyPart: { name: '手心', sensitivity: 1, ratio: 100 },
              position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
              strikes: 5,
              description: '手掌打手心 5 下',
            },
          },
        }),
        'punishment',
      ],
      [cell({ type: 'chain_punishment' }), 'chain'],
      [
        cell({
          effect: { type: 'move', value: 3, description: '前进 3 步' },
        }),
        'bonus',
      ],
      [
        cell({
          type: 'special',
          effect: { type: 'reverse', value: 2, description: '后退 2 步' },
        }),
        'reverse',
      ],
      [
        cell({
          type: 'special',
          effect: { type: 'rest', value: 1, description: '休息 1 回合' },
        }),
        'rest',
      ],
      [
        cell({
          type: 'restart',
          effect: { type: 'restart', value: 0, description: '回到起点' },
        }),
        'restart',
      ],
      [
        cell({
          type: 'trap',
          effect: { type: 'trap', value: 0, description: '触发机关' },
        }),
        'trap',
      ],
    ]

    expect(cases.map(([boardCell]) => getBoardCellPresentation(boardCell, 40).kind)).toEqual(
      cases.map(([, kind]) => kind)
    )
  })

  it('为惩罚格生成可直接展示的完整详情', () => {
    const presentation = getBoardCellPresentation(
      cell({
        type: 'punishment',
        effect: {
          type: 'punishment',
          value: 0,
          description: '手掌打手心 5 下',
          punishment: {
            tool: { name: '手掌', intensity: 1, ratio: 100 },
            bodyPart: { name: '手心', sensitivity: 1, ratio: 100 },
            position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
            strikes: 5,
            description: '手掌打手心 5 下',
          },
        },
      }),
      40
    )

    expect(presentation.details).toEqual([
      { label: '工具', value: '手掌' },
      { label: '部位', value: '手心' },
      { label: '姿势', value: '站立' },
      { label: '次数', value: '5 下' },
    ])
  })

  it('按阅读顺序把格子排成连续蛇形轨道', () => {
    expect(getSnakeGridPosition(1, 5)).toEqual({
      row: 1,
      column: 1,
      direction: 'forward',
      isTurn: false,
    })
    expect(getSnakeGridPosition(5, 5)).toEqual({
      row: 1,
      column: 5,
      direction: 'forward',
      isTurn: true,
    })
    expect(getSnakeGridPosition(6, 5)).toEqual({
      row: 2,
      column: 5,
      direction: 'reverse',
      isTurn: false,
    })
    expect(getSnakeGridPosition(10, 5)).toEqual({
      row: 2,
      column: 1,
      direction: 'reverse',
      isTurn: true,
    })
    expect(getSnakeGridPosition(11, 5)).toEqual({
      row: 3,
      column: 1,
      direction: 'forward',
      isTurn: false,
    })
  })
})
