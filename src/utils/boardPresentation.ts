import type { BoardCell } from '@flying-chess/game-core/types'

export type CellVisualKind =
  | 'start'
  | 'normal'
  | 'punishment'
  | 'chain'
  | 'bonus'
  | 'reverse'
  | 'rest'
  | 'restart'
  | 'trap'
  | 'qa'
  | 'dare'
  | 'finish'

export type CellIconName =
  | 'Circle'
  | 'Gift'
  | 'Link'
  | 'Moon'
  | 'Rocket'
  | 'RotateCcw'
  | 'Skull'
  | 'Trophy'
  | 'Undo2'
  | 'Zap'
  | 'MessageCircleQuestion'
  | 'Flame'

export interface CellPresentationDetail {
  label: string
  value: string
}

export interface CellPresentation {
  kind: CellVisualKind
  label: string
  shortLabel: string
  iconName: CellIconName
  description: string
  details: readonly CellPresentationDetail[]
}

export interface SnakeGridPosition {
  row: number
  column: number
  direction: 'forward' | 'reverse'
  isTurn: boolean
}

const CELL_META: Record<
  CellVisualKind,
  Pick<CellPresentation, 'label' | 'shortLabel' | 'iconName'>
> = {
  start: { label: '起点', shortLabel: '起点', iconName: 'Rocket' },
  normal: { label: '普通格', shortLabel: '普通', iconName: 'Circle' },
  punishment: { label: '惩罚格', shortLabel: '惩罚', iconName: 'Zap' },
  chain: { label: '连锁惩罚', shortLabel: '连锁', iconName: 'Link' },
  bonus: { label: '奖励格', shortLabel: '奖励', iconName: 'Gift' },
  reverse: { label: '后退格', shortLabel: '后退', iconName: 'Undo2' },
  rest: { label: '休息格', shortLabel: '休息', iconName: 'Moon' },
  restart: { label: '回起点', shortLabel: '重置', iconName: 'RotateCcw' },
  trap: { label: '机关格', shortLabel: '机关', iconName: 'Skull' },
  qa: { label: '问答格', shortLabel: '问答', iconName: 'MessageCircleQuestion' },
  dare: { label: '指令格', shortLabel: '指令', iconName: 'Flame' },
  finish: { label: '终点', shortLabel: '终点', iconName: 'Trophy' },
}

const getVisualKind = (cell: BoardCell, totalCells: number): CellVisualKind => {
  if (cell.position === 1) return 'start'
  if (cell.position === totalCells) return 'finish'
  if (cell.type === 'punishment' || cell.effect?.type === 'punishment') return 'punishment'
  if (cell.type === 'chain_punishment' || cell.effect?.type === 'chain_punishment') return 'chain'
  if (cell.type === 'trap' || cell.effect?.type === 'trap') return 'trap'
  if (cell.type === 'qa' || cell.effect?.type === 'qa') return 'qa'
  if (cell.type === 'dare' || cell.effect?.type === 'dare') return 'dare'
  if (cell.type === 'restart' || cell.effect?.type === 'restart') return 'restart'
  if (cell.effect?.type === 'reverse') return 'reverse'
  if (cell.effect?.type === 'rest') return 'rest'
  if (cell.effect?.type === 'move' && cell.effect.value > 0) return 'bonus'
  return 'normal'
}

const getDetails = (
  cell: BoardCell,
  kind: CellVisualKind,
  t?: (key: string, values?: Record<string, unknown>) => string
): CellPresentationDetail[] => {
  const punishment = cell.effect?.punishment
  if ((kind === 'punishment' || kind === 'chain') && punishment) {
    return [
      { label: t ? t('board_cell_detail_tool') : '工具', value: punishment.tool.name },
      { label: t ? t('board_cell_detail_body_part') : '部位', value: punishment.bodyPart.name },
      { label: t ? t('board_cell_detail_position') : '姿势', value: punishment.position.name },
      {
        label: t ? t('board_cell_detail_strikes') : '次数',
        value:
          punishment.strikes === undefined
            ? cell.effect?.dynamicType === 'dice_multiplier'
              ? t
                ? t('board_cell_detail_dice_multiplier', {
                    mult: cell.effect.multiplier ?? punishment.multiplier ?? 1,
                  })
                : `骰点 × ${cell.effect.multiplier ?? punishment.multiplier ?? 1}`
              : t
                ? t('board_cell_detail_decide_landing')
                : '落地后决定'
            : t
              ? t('board_cell_detail_strikes_value', { count: punishment.strikes })
              : `${punishment.strikes} 下`,
      },
    ]
  }

  const value = cell.effect?.value ?? 0
  const effectLabel = t ? t('board_cell_detail_effect') : '效果'
  const locationLabel = t ? t('board_cell_detail_location') : '位置'

  switch (kind) {
    case 'bonus':
      return [
        {
          label: effectLabel,
          value: t ? t('board_cell_detail_forward', { n: value }) : `前进 ${value} 步`,
        },
      ]
    case 'reverse':
      return [
        {
          label: effectLabel,
          value: t ? t('board_cell_detail_backward', { n: value }) : `后退 ${value} 步`,
        },
      ]
    case 'rest':
      return [
        {
          label: effectLabel,
          value: t ? t('board_cell_detail_rest', { n: value }) : `休息 ${value} 回合`,
        },
      ]
    case 'restart':
      return [{ label: effectLabel, value: t ? t('board_cell_detail_restart') : '回到起点' }]
    case 'trap':
      return [{ label: effectLabel, value: t ? t('board_cell_detail_trap') : '触发随机机关' }]
    case 'qa':
      return [
        {
          label: effectLabel,
          value: cell.effect?.description || (t ? t('board_cell_detail_qa') : '回答问题'),
        },
      ]
    case 'dare':
      return [
        {
          label: effectLabel,
          value: cell.effect?.description || (t ? t('board_cell_detail_dare') : '执行指令'),
        },
      ]
    case 'start':
      return [{ label: locationLabel, value: t ? t('board_cell_detail_start_loc') : '赛道起点' }]
    case 'finish':
      return [{ label: locationLabel, value: t ? t('board_cell_detail_finish_loc') : '抵达即获胜' }]
    default:
      return []
  }
}

export const getBoardCellPresentation = (
  cell: BoardCell,
  totalCells: number,
  t?: (key: string, values?: Record<string, unknown>) => string
): CellPresentation => {
  const kind = getVisualKind(cell, totalCells)
  const meta = CELL_META[kind]
  const label = t ? t(`board_cell_${kind}_label`) : meta.label
  const shortLabel = t ? t(`board_cell_${kind}_short`) : meta.shortLabel

  const description =
    kind === 'start'
      ? t
        ? t('board_cell_start_desc')
        : '所有玩家从这里等待起飞。'
      : kind === 'finish'
        ? t
          ? t('board_cell_finish_desc')
          : '率先抵达这里即可赢得本局。'
        : cell.effect?.description || label

  return {
    kind,
    label,
    shortLabel,
    iconName: meta.iconName,
    description,
    details: getDetails(cell, kind, t),
  }
}

export const getSnakeGridPosition = (position: number, columns: number): SnakeGridPosition => {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError('position 必须是大于等于 1 的整数')
  }
  if (!Number.isInteger(columns) || columns < 1) {
    throw new RangeError('columns 必须是大于等于 1 的整数')
  }

  const index = position - 1
  const row = Math.floor(index / columns) + 1
  const offset = index % columns
  const direction = row % 2 === 1 ? 'forward' : 'reverse'
  const column = direction === 'forward' ? offset + 1 : columns - offset

  return {
    row,
    column,
    direction,
    isTurn: offset === columns - 1,
  }
}
