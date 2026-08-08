import type { BoardCell, BoardConfig } from '@flying-chess/game-core/types'
import { GAME_CONFIG } from '../config/gameConfig'
import { GameService } from './gameService'
import {
  DEFAULT_PARTY_DIRECTOR_CONFIG,
  validatePartyDirectorConfig,
  type PartyAct,
  type PartyDirectorConfig,
} from '@flying-chess/game-core/party-mode'

export type PartyStudioCellKind =
  | 'punishment'
  | 'chain_punishment'
  | 'bonus'
  | 'reverse'
  | 'rest'
  | 'restart'
  | 'trap'
  | 'qa'
  | 'dare'

export type PartyStudioTheme = 'aurora' | 'ember' | 'midnight'

export interface PartyStudioConfig {
  readonly version: 1
  readonly enabled: boolean
  readonly name: string
  readonly director: PartyDirectorConfig
  readonly boardConfig: BoardConfig
  readonly qaQuestions: Readonly<Record<PartyAct, readonly string[]>>
  readonly dareInstructions: Readonly<Record<PartyAct, readonly string[]>>
  readonly cellLayout: readonly PartyStudioCellKind[]
  readonly theme: Readonly<{
    preset: PartyStudioTheme
    accentColor: string
  }>
}

export interface PartyStudioValidation {
  readonly ok: boolean
  readonly error?: string
}

const CELL_FIELDS: readonly [keyof BoardConfig, PartyStudioCellKind][] = Object.freeze([
  ['punishmentCells', 'punishment'],
  ['chainPunishmentCells', 'chain_punishment'],
  ['bonusCells', 'bonus'],
  ['reverseCells', 'reverse'],
  ['restCells', 'rest'],
  ['restartCells', 'restart'],
  ['trapCells', 'trap'],
  ['qaCells', 'qa'],
  ['dareCells', 'dare'],
])

export function createLayoutFromBoardConfig(config: BoardConfig): readonly PartyStudioCellKind[] {
  if (!GameService.validateBoardConfig(config)) throw new Error('Party Studio 棋盘比例无效')
  const layout = CELL_FIELDS.flatMap(([field, kind]) =>
    Array.from({ length: Number(config[field] ?? 0) }, () => kind)
  )
  while (layout.length < config.totalCells - 2) layout.push('bonus')
  return Object.freeze(layout)
}

const defaultBoardConfig = Object.freeze({ ...GAME_CONFIG.PARTY_BOARD_CONFIG }) as BoardConfig

export const DEFAULT_PARTY_STUDIO_CONFIG: Readonly<PartyStudioConfig> = Object.freeze({
  version: 1,
  enabled: false,
  name: '我的升温场景',
  director: DEFAULT_PARTY_DIRECTOR_CONFIG,
  boardConfig: defaultBoardConfig,
  qaQuestions: Object.freeze({
    warmup: Object.freeze([...GAME_CONFIG.PARTY_QA_QUESTIONS.warmup]),
    heating: Object.freeze([...GAME_CONFIG.PARTY_QA_QUESTIONS.heating]),
    finale: Object.freeze([...GAME_CONFIG.PARTY_QA_QUESTIONS.finale]),
  }),
  dareInstructions: Object.freeze({
    warmup: Object.freeze([...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.warmup]),
    heating: Object.freeze([...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.heating]),
    finale: Object.freeze([...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.finale]),
  }),
  cellLayout: createLayoutFromBoardConfig(defaultBoardConfig),
  theme: Object.freeze({ preset: 'aurora', accentColor: '#a855f7' }),
})

const countKinds = (layout: readonly PartyStudioCellKind[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  layout.forEach(kind => {
    counts[kind] = (counts[kind] ?? 0) + 1
  })
  return counts
}

export function applyPartyBoardLayout(
  board: readonly BoardCell[],
  layout: readonly PartyStudioCellKind[]
): BoardCell[] {
  if (board.length < 3 || layout.length !== board.length - 2) {
    throw new Error('拖拽布局长度必须匹配棋盘内部格子')
  }
  const interior = board.slice(1, -1)
  const pools = new Map<string, BoardCell[]>()
  interior.forEach(cell => {
    const kind =
      cell.type === 'special' && cell.effect?.type === 'reverse'
        ? 'reverse'
        : cell.type === 'special' && cell.effect?.type === 'rest'
          ? 'rest'
          : cell.type
    const pool = pools.get(kind) ?? []
    pool.push(cell)
    pools.set(kind, pool)
  })

  const projected = layout.map((kind, index) => {
    const source = pools.get(kind)?.shift()
    if (!source) throw new Error(`拖拽布局中的 ${kind} 数量与棋盘比例不一致`)
    const position = index + 2
    return { ...source, id: position, position }
  })
  if ([...pools.values()].some(pool => pool.length > 0)) {
    throw new Error('拖拽布局没有使用全部棋盘格类型')
  }
  return [
    { ...board[0], id: 1, position: 1 },
    ...projected,
    { ...board[board.length - 1], id: board.length, position: board.length },
  ]
}

const validContentPool = (
  value: unknown
): value is Readonly<Record<PartyAct, readonly string[]>> => {
  if (!value || typeof value !== 'object') return false
  const pools = value as Partial<Record<PartyAct, unknown>>
  return (['warmup', 'heating', 'finale'] as const).every(act => {
    const entries = pools[act]
    return (
      Array.isArray(entries) &&
      entries.length > 0 &&
      entries.length <= 100 &&
      entries.every(entry => typeof entry === 'string' && entry.trim() && entry.length <= 240)
    )
  })
}

export function validatePartyStudioConfig(value: unknown): PartyStudioValidation {
  if (!value || typeof value !== 'object') return { ok: false, error: '场景配置必须是对象' }
  const config = value as Partial<PartyStudioConfig>
  if (
    config.version !== 1 ||
    typeof config.enabled !== 'boolean' ||
    typeof config.name !== 'string' ||
    !config.name.trim() ||
    config.name.length > 60
  ) {
    return { ok: false, error: '场景版本、开关或名称无效' }
  }
  if (!config.director || !validatePartyDirectorConfig(config.director)) {
    return { ok: false, error: '幕数或时间门控必须按升序且早于结束时间' }
  }
  if (!config.boardConfig || !GameService.validateBoardConfig(config.boardConfig)) {
    return { ok: false, error: '棋盘格子比例无效或超过总格数' }
  }
  if (!validContentPool(config.qaQuestions) || !validContentPool(config.dareInstructions)) {
    return { ok: false, error: '每一幕的问答和指令内容池都至少需要一项' }
  }
  if (!Array.isArray(config.cellLayout)) {
    return { ok: false, error: '可视化棋盘布局必须是数组' }
  }
  const expectedLayout = createLayoutFromBoardConfig(config.boardConfig)
  const expectedCounts = countKinds(expectedLayout)
  const actualCounts = countKinds(config.cellLayout)
  if (
    config.cellLayout.length !== expectedLayout.length ||
    Object.keys(expectedCounts).some(kind => expectedCounts[kind] !== actualCounts[kind])
  ) {
    return { ok: false, error: '拖拽棋盘布局与格子比例不一致' }
  }
  if (
    !config.theme ||
    !['aurora', 'ember', 'midnight'].includes(String(config.theme.preset)) ||
    typeof config.theme.accentColor !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(config.theme.accentColor)
  ) {
    return { ok: false, error: '主题预设或强调色无效' }
  }
  return { ok: true }
}
