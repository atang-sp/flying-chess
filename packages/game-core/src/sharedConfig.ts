/**
 * The shared configuration boundary for classic, local Party, and online Party.
 *
 * This module deliberately has no dependency on Vue, localStorage, or the
 * browser application. The room server and the local game both consume the
 * same snapshot/normalization/board-generation functions.
 */

export type ModeId = 'classic' | 'party' | 'online_party'
export type RulesetVersion = 'classic_v1' | 'party_v2' | 'party_v3'

export interface PunishmentTool {
  name: string
  intensity: number
  ratio: number
}

export interface PunishmentBodyPart {
  name: string
  sensitivity: number
  ratio: number
}

export interface PunishmentPosition {
  name: string
  ratio: number
  compatibleBodyParts: string[]
}

export interface PunishmentConfig {
  tools: Record<string, PunishmentTool>
  bodyParts: Record<string, PunishmentBodyPart>
  positions: Record<string, PunishmentPosition>
  minStrikes: number
  maxStrikes: number
  step: number
  maxTakeoffFailures: number
  doublePunishmentChance: number
}

export type PunishmentDynamicType =
  | 'dice_multiplier'
  | 'previous_player'
  | 'next_player'
  | 'other_player_choice'

export interface PunishmentAction {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  strikes?: number
  description: string
  dynamicType?: PunishmentDynamicType
  multiplier?: number
  targetPlayer?: 'current' | 'previous' | 'next' | 'other'
}

export type PunishmentVariant = 'blindbox' | 'conditional' | 'deferred' | 'mutual' | 'encore'

export type TrapVariant =
  | 'text'
  | 'all_players'
  | 'choice'
  | 'roulette'
  | 'mini_game_reaction'
  | 'mini_game_memory'
  | 'mini_game_quiz'

export interface TrapAction {
  name: string
  description: string
  trapVariant?: TrapVariant
  choiceA?: string
  choiceB?: string
}

export interface BoardConfig {
  punishmentCells: number
  chainPunishmentCells: number
  bonusCells: number
  reverseCells: number
  restCells: number
  restartCells: number
  trapCells: number
  totalCells: number
  qaCells?: number
  dareCells?: number
}

export interface BoardCell {
  id: number
  type: 'punishment' | 'bonus' | 'special' | 'restart' | 'trap' | 'chain_punishment' | 'qa' | 'dare'
  position: number
  effect?: {
    type:
      | 'punishment'
      | 'move'
      | 'rest'
      | 'reverse'
      | 'restart'
      | 'trap'
      | 'bounce'
      | 'chain_punishment'
      | 'qa'
      | 'dare'
    value: number
    description: string
    punishment?: PunishmentAction
    dynamicType?: PunishmentDynamicType
    multiplier?: number
    trapVariant?: TrapVariant
    choiceA?: string
    choiceB?: string
  }
}

export interface PunishmentConstraints {
  readonly maxToolIntensity?: number
  readonly minStrikes?: number
  readonly maxStrikes?: number
  readonly doublePunishmentChance?: number
}

export type PartyAct = 'warmup' | 'heating' | 'finale'
const partyActs: readonly PartyAct[] = ['warmup', 'heating', 'finale']

export interface ConfigSnapshot {
  modeId: ModeId
  rulesetVersion: RulesetVersion
  boardConfig: BoardConfig
  punishmentConfig: PunishmentConfig
  traps: TrapAction[]
  qaQuestions: string[]
  dareInstructions: string[]
  punishmentConstraints?: PunishmentConstraints
  stageConstraints: Readonly<Partial<Record<PartyAct, PunishmentConstraints>>>
  authority: 'local' | 'server'
}

export interface ConfigOverrides {
  modeId?: ModeId
  rulesetVersion?: RulesetVersion
  authority?: 'local' | 'server'
  boardConfig?: Partial<BoardConfig>
  punishmentConfig?: Omit<Partial<PunishmentConfig>, 'tools' | 'bodyParts' | 'positions'> & {
    tools?: Record<string, Partial<PunishmentTool>>
    bodyParts?: Record<string, Partial<PunishmentBodyPart>>
    positions?: Record<string, Partial<PunishmentPosition>>
  }
  traps?: readonly TrapAction[]
  qaQuestions?: readonly string[]
  dareInstructions?: readonly string[]
  stageConstraints?: Partial<Record<PartyAct, PunishmentConstraints>>
}

export interface BoardRandomSource {
  randomInt(minimum: number, maximum: number): number
  choice<T>(entries: readonly T[]): T
  /** Uniform value in [0, 1). Used for scale-invariant weighted selection when available. */
  random?(): number
  /** @deprecated Weighted selection is owned by this module; callers only provide entropy. */
  weightedChoice?<T>(entries: readonly T[], weights: readonly number[]): T
}

export interface CryptoRandomSource {
  getRandomValues(values: Uint32Array): Uint32Array
}

export interface PublicConfigProjection {
  modeId: ModeId
  rulesetVersion: RulesetVersion
  boardConfig: BoardConfig
  authority: 'local' | 'server'
}

export interface ModePolicy {
  modeId: ModeId
  rulesetVersion: RulesetVersion
  authority: 'local' | 'server'
  boardOverlay: Partial<BoardConfig>
  contentOverlay: 'standard' | 'party'
  interactionOverlay: 'classic' | 'party' | 'server_authoritative'
  stageConstraints: Readonly<Partial<Record<PartyAct, PunishmentConstraints>>>
  eventOverlay: 'disabled' | 'party'
  interventionOverlay: 'disabled' | 'party'
}

const PARTY_ACT_CONSTRAINTS = {
  warmup: { maxToolIntensity: 3, minStrikes: 5, maxStrikes: 15, doublePunishmentChance: 0 },
  heating: { maxToolIntensity: 7, minStrikes: 10, maxStrikes: 25, doublePunishmentChance: 15 },
  finale: { maxToolIntensity: 10, minStrikes: 15, maxStrikes: 30, doublePunishmentChance: 25 },
} as const

const STANDARD_TOOLS = {
  手掌: { intensity: 2, ratio: 8 },
  尺子: { intensity: 3, ratio: 8 },
  木板: { intensity: 5, ratio: 8 },
  藤条: { intensity: 7, ratio: 8 },
  戒尺: { intensity: 5, ratio: 8 },
  小红: { intensity: 7, ratio: 8 },
  小绿: { intensity: 7, ratio: 8 },
  热熔胶: { intensity: 9, ratio: 6 },
  数据线: { intensity: 9, ratio: 8 },
  发刷: { intensity: 5, ratio: 8 },
  皮拍: { intensity: 7, ratio: 8 },
  亚克力板: { intensity: 7, ratio: 6 },
} as const

const STANDARD_BODY_PARTS = {
  屁股: { sensitivity: 10, ratio: 80 },
  后背: { sensitivity: 7, ratio: 5 },
  大腿: { sensitivity: 5, ratio: 5 },
  臀缝: { sensitivity: 2, ratio: 5 },
  手心: { sensitivity: 2, ratio: 5 },
} as const

const STANDARD_POSITIONS = {
  站立: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝', '手心'] },
  手扶墙: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
  趴在桌子上: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
  手抓膝盖: { ratio: 20, compatibleBodyParts: ['屁股', '大腿', '臀缝'] },
  跪趴: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
} as const

export const STANDARD_BOARD_CONFIG: BoardConfig = {
  punishmentCells: 26,
  chainPunishmentCells: 2,
  bonusCells: 1,
  reverseCells: 2,
  restCells: 1,
  restartCells: 4,
  trapCells: 2,
  totalCells: 40,
}

export const PARTY_BOARD_CONFIG: BoardConfig = {
  punishmentCells: 20,
  chainPunishmentCells: 2,
  bonusCells: 1,
  reverseCells: 1,
  restCells: 1,
  restartCells: 2,
  trapCells: 3,
  totalCells: 40,
  qaCells: 5,
  dareCells: 3,
}

// Party changes only the board mix and content policy. The board size and all
// punishment entities still come from the standard snapshot.
const PARTY_BOARD_OVERLAY: Partial<BoardConfig> = {
  punishmentCells: PARTY_BOARD_CONFIG.punishmentCells,
  chainPunishmentCells: PARTY_BOARD_CONFIG.chainPunishmentCells,
  bonusCells: PARTY_BOARD_CONFIG.bonusCells,
  reverseCells: PARTY_BOARD_CONFIG.reverseCells,
  restCells: PARTY_BOARD_CONFIG.restCells,
  restartCells: PARTY_BOARD_CONFIG.restartCells,
  trapCells: PARTY_BOARD_CONFIG.trapCells,
  qaCells: PARTY_BOARD_CONFIG.qaCells,
  dareCells: PARTY_BOARD_CONFIG.dareCells,
}

export const MODE_POLICIES: Readonly<Record<ModeId, ModePolicy>> = {
  classic: {
    modeId: 'classic',
    rulesetVersion: 'classic_v1',
    authority: 'local',
    boardOverlay: {},
    contentOverlay: 'standard',
    interactionOverlay: 'classic',
    stageConstraints: {},
    eventOverlay: 'disabled',
    interventionOverlay: 'disabled',
  },
  party: {
    modeId: 'party',
    rulesetVersion: 'party_v3',
    authority: 'local',
    boardOverlay: PARTY_BOARD_OVERLAY,
    contentOverlay: 'party',
    interactionOverlay: 'party',
    stageConstraints: PARTY_ACT_CONSTRAINTS,
    eventOverlay: 'party',
    interventionOverlay: 'party',
  },
  online_party: {
    modeId: 'online_party',
    rulesetVersion: 'party_v3',
    authority: 'server',
    boardOverlay: PARTY_BOARD_OVERLAY,
    contentOverlay: 'party',
    interactionOverlay: 'server_authoritative',
    stageConstraints: PARTY_ACT_CONSTRAINTS,
    eventOverlay: 'party',
    interventionOverlay: 'party',
  },
}

export const STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const STANDARD_TRAPS: TrapAction[] = [
  { name: '晾臀机关', description: '晾臀5分钟' },
  {
    name: '随机惩罚机关',
    description:
      '由上一个被惩罚的玩家使用任意工具惩罚屁股，必须自己请罚，大声说出"请xxx打我的屁股"',
  },
]

const PARTY_TRAPS: TrapAction[] = [
  { name: '晾臀机关', description: '晾臀5分钟', trapVariant: 'text' },
  {
    name: '请罚机关',
    description: '必须自己请罚，大声说出"请打我的屁股"',
    trapVariant: 'text',
  },
  {
    name: '全员机关',
    description: '所有人站成一排，由踩到机关的人依次用手掌打每人屁股 3 下',
    trapVariant: 'all_players',
  },
  {
    name: '全员猜拳',
    description: '所有人参加反应速度测试，最快者获得一次免罚',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: '记忆翻牌',
    description: '记住三张图案的顺序；失败者下一次惩罚加倍',
    trapVariant: 'mini_game_memory',
  },
  {
    name: '快速问答',
    description: '在倒计时内完成题目；超时者下一次惩罚加倍',
    trapVariant: 'mini_game_quiz',
  },
  {
    name: '二选一',
    description: '选择你的命运',
    trapVariant: 'choice',
    choiceA: '用手掌打屁股 15 下',
    choiceB: '保持跪趴姿势 2 分钟',
  },
  {
    name: '高风险二选一',
    description: '选择你的命运',
    trapVariant: 'choice',
    choiceA: '用藤条打屁股 10 下',
    choiceB: '后退 5 格',
  },
  {
    name: '轮盘机关',
    description: '命运轮盘！随机选一名玩家接受惩罚——不一定是你哦',
    trapVariant: 'roulette',
  },
  {
    name: '共难轮盘',
    description: '命运轮盘！随机选一名玩家，和你一起用手掌互打屁股 5 下',
    trapVariant: 'roulette',
  },
]

const PARTY_QA_QUESTIONS = {
  warmup: [
    '你的安全词是什么？',
    '你觉得最疼的工具是什么？',
    '你第一次接触 SP 是什么时候？',
    '你被打的时候会叫出声吗？',
    '你更怕疼还是更怕痒？',
    '你能承受的最高强度工具是什么？',
    '你有没有一个特别想尝试的惩罚姿势？',
    '你觉得被打之前的等待和被打本身哪个更紧张？',
  ],
  heating: [
    '描述一次印象最深的惩罚经历',
    '你最不能接受的惩罚方式是什么？',
    '你被打哭过吗？是什么情况？',
    '你有被罚站或罚跪过吗？感受如何？',
    '你被惩罚后需要多长时间恢复？',
    '你有没有在惩罚中途想喊安全词的时候？',
    '你觉得惩罚前的"数罪"环节有必要吗？',
  ],
  finale: [
    '你更喜欢被惩罚还是惩罚别人？',
    '你理想中的 SP 关系是什么样的？',
    '你希望日常相处中也有惩罚元素吗？',
    '你愿意为对方破例的底线是什么？',
    '你觉得惩罚中最重要的是疼痛感还是仪式感？',
    '如果可以设计一个完美的惩罚场景，你会怎么设计？',
  ],
} as const

const PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    '闭眼，让任意一人用一种工具轻触你的手背，猜是什么工具',
    '模仿被打时最常有的表情，保持 10 秒',
    '给左边的人按摩肩膀 30 秒',
    '用最严厉的语气对右边的人说"你给我过来"',
    '站起来展示一个受罚姿势，保持 15 秒',
  ],
  heating: [
    '让右边的人选择你下一轮的受罚姿势',
    '闭眼伸出手心，让任意一人用手掌轻拍 3 下，猜是谁',
    '选一个人，互相对视 30 秒不许笑',
    '模仿求饶的样子，要足够真诚让其他人满意',
    '跟右边的人交换棋盘位置',
  ],
  finale: [
    '让所有人投票选出本局"最能忍"的玩家',
    '选一个人，用你选择的工具在对方手背上轻敲 5 下',
    '做一次标准的请罚礼仪：主动说出自己想被用什么工具打哪里',
    '让左边的人用手掌轻打你手心 3 下，你不能缩手',
    '描述你心目中最完美的惩罚，其他人投票要不要现在执行',
  ],
} as const

const PARTY_SCENE_PRESETS = {
  icebreaker: {
    name: '初见破冰',
    description: '问答多、惩罚轻，适合第一次见面',
    boardConfig: {
      punishmentCells: 16,
      chainPunishmentCells: 1,
      bonusCells: 1,
      reverseCells: 1,
      restCells: 1,
      restartCells: 2,
      trapCells: 2,
      totalCells: 40,
      qaCells: 8,
      dareCells: 4,
    },
    actConstraintsOverride: {
      warmup: { maxToolIntensity: 2, maxStrikes: 10 },
      heating: { maxToolIntensity: 5, maxStrikes: 20 },
      finale: { maxToolIntensity: 7, maxStrikes: 25 },
    },
  },
  hardcore: {
    name: '老友加码',
    description: '惩罚密集、强度高，适合熟悉的玩伴',
    boardConfig: {
      punishmentCells: 24,
      chainPunishmentCells: 4,
      bonusCells: 1,
      reverseCells: 1,
      restCells: 0,
      restartCells: 2,
      trapCells: 3,
      totalCells: 40,
      qaCells: 1,
      dareCells: 0,
    },
    actConstraintsOverride: {
      warmup: { maxToolIntensity: 5, minStrikes: 10, maxStrikes: 20 },
      heating: { maxToolIntensity: 9, minStrikes: 15, maxStrikes: 30 },
      finale: { maxToolIntensity: 10, minStrikes: 20, maxStrikes: 40 },
    },
  },
  intimate: {
    name: '一对一私密',
    description: '指令格亲密、节奏缓慢，适合两人',
    boardConfig: {
      punishmentCells: 18,
      chainPunishmentCells: 2,
      bonusCells: 1,
      reverseCells: 1,
      restCells: 1,
      restartCells: 2,
      trapCells: 2,
      totalCells: 40,
      qaCells: 5,
      dareCells: 4,
    },
    actConstraintsOverride: undefined,
  },
  group_fun: {
    name: '多人欢乐',
    description: '全员机关多、互动密集，适合 3 人以上聚会',
    boardConfig: {
      punishmentCells: 18,
      chainPunishmentCells: 2,
      bonusCells: 1,
      reverseCells: 1,
      restCells: 1,
      restartCells: 2,
      trapCells: 5,
      totalCells: 40,
      qaCells: 4,
      dareCells: 3,
    },
    actConstraintsOverride: undefined,
  },
} as const

export const GAME_CONFIG = {
  BOARD: { SIZE: 40, GRID_SIZE: { rows: 5, cols: 8 } },
  DICE: { MIN_VALUE: 1, MAX_VALUE: 6, ANIMATION_DURATION: 3000 },
  PLAYERS: { DEFAULT_COUNT: 1, COLORS: ['#ff6b6b'], NAMES: ['玩家'] },
  ANIMATION: { MOVE_DURATION: 500, EFFECT_DISPLAY_DURATION: 2000 },
  DEFAULT_TOOLS: STANDARD_TOOLS,
  DEFAULT_BODY_PARTS: STANDARD_BODY_PARTS,
  DEFAULT_POSITIONS: STANDARD_POSITIONS,
  PUNISHMENT_CELLS: {
    3: { tool: '手掌', bodyPart: '手心', position: '站立' },
    7: { tool: '尺子', bodyPart: '大腿', position: '手扶墙' },
    9: { tool: '手掌', bodyPart: '屁股', position: '站立' },
    11: { tool: '木板', bodyPart: '大腿', position: '趴在桌子上' },
    15: { tool: '藤条', bodyPart: '屁股', position: '手抓膝盖' },
    17: { tool: '尺子', bodyPart: '手心', position: '手扶墙' },
    19: { tool: '皮拍', bodyPart: '屁股', position: '跪趴' },
    21: { tool: '手掌', bodyPart: '大腿', position: '站立' },
    23: { tool: '木板', bodyPart: '大腿', position: '趴在桌子上' },
    27: { tool: '尺子', bodyPart: '手心', position: '趴在桌子上' },
    29: { tool: '皮拍', bodyPart: '大腿', position: '手抓膝盖' },
    31: { tool: '手掌', bodyPart: '手心', position: '站立' },
    33: { tool: '木板', bodyPart: '屁股', position: '手扶墙' },
    35: { tool: '尺子', bodyPart: '大腿', position: '手扶墙' },
    37: { tool: '藤条', bodyPart: '屁股', position: '趴在桌子上' },
    39: { tool: '皮拍', bodyPart: '大腿', position: '跪趴' },
  },
  DYNAMIC_PUNISHMENT_CELLS: {
    4: {
      type: 'dice_multiplier',
      tool: '手掌',
      bodyPart: '屁股',
      position: '站立',
      multiplier: 2,
      description: '打的数量是骰子点数的2倍',
    },
    16: {
      type: 'other_player_choice',
      tool: '藤条',
      bodyPart: '屁股',
      position: '手抓膝盖',
      description: '用藤条打屁股，手抓膝盖，数量由其他玩家决定',
    },
    24: {
      type: 'previous_player',
      tool: '木板',
      bodyPart: '大腿',
      position: '趴在桌子上',
      description: '用木板打大腿，趴在桌子上',
    },
    26: {
      type: 'next_player',
      tool: '藤条',
      bodyPart: '屁股',
      position: '跪趴',
      description: '用藤条打屁股，跪趴',
    },
    34: {
      type: 'previous_player',
      tool: '尺子',
      bodyPart: '大腿',
      position: '手扶墙',
      description: '用尺子打大腿，手扶墙',
    },
    36: {
      type: 'other_player_choice',
      tool: '藤条',
      bodyPart: '屁股',
      position: '手抓膝盖',
      description: '用藤条打屁股，手抓膝盖，数量由其他玩家决定',
    },
  },
  BONUS_CELLS: {
    5: { type: 'move', value: 2, description: '前进2步' },
    25: { type: 'move', value: 3, description: '前进3步' },
  },
  REVERSE_CELLS: {
    8: { type: 'reverse', value: 2, description: '后退2步' },
    18: { type: 'reverse', value: 3, description: '后退3步' },
  },
  REST_CELLS: {
    12: { type: 'rest', value: 1, description: '休息一回合' },
    32: { type: 'rest', value: 1, description: '休息一回合' },
  },
  RESTART_CELLS: {
    10: { description: '回到起点' },
    20: { description: '回到起点' },
    30: { description: '回到起点' },
  },
  DEFAULT_RATIOS: { bodyPartRatio: 60, toolRatio: 25, positionRatio: 15 },
  DEFAULT_PUNISHMENT_STRIKES: { min: 10, max: 30, step: 5 },
  DEFAULT_DOUBLE_PUNISHMENT_CHANCE: 20,
  DEFAULT_BOARD_CONFIG: STANDARD_BOARD_CONFIG,
  DEFAULT_TRAPS: {
    晾臀机关: { description: '晾臀5分钟' },
    随机惩罚机关: {
      description:
        '由上一个被惩罚的玩家使用任意工具惩罚屁股，必须自己请罚，大声说出"请xxx打我的屁股"',
    },
  },
  PARTY_BOARD_CONFIG,
  PARTY_ACT_CONSTRAINTS,
  PARTY_QA_QUESTIONS,
  PARTY_DARE_INSTRUCTIONS,
  PARTY_TRAPS,
  PARTY_SCENE_PRESETS,
} as const

export const CELL_ICON_NAMES: Record<string, string> = {
  punishment: 'Zap',
  chain_punishment: 'Link',
  bonus: 'Gift',
  reverse: 'Undo2',
  rest: 'Moon',
  restart: 'RotateCcw',
  trap: 'Skull',
  start: 'Rocket',
  normal: 'Circle',
  qa: 'MessageCircleQuestion',
  dare: 'Flame',
}

export const CELL_ICONS: Record<string, string> = {
  punishment: '⚡',
  bonus: '🎁',
  special: '⬅️',
  restart: '🔄',
  trap: '💀',
}

export const CELL_COLORS: Record<string, { color: string; border: string }> = {
  punishment: { color: 'var(--color-punishment)', border: 'var(--color-punishment)' },
  chain_punishment: {
    color: 'var(--color-chain-punishment)',
    border: 'var(--color-chain-punishment)',
  },
  bonus: { color: 'var(--color-bonus)', border: 'var(--color-bonus)' },
  special: { color: 'var(--color-special)', border: 'var(--color-special)' },
  restart: { color: 'var(--color-restart)', border: 'var(--color-restart)' },
  trap: { color: 'var(--color-trap)', border: 'var(--color-trap)' },
  qa: { color: 'var(--color-qa, #3b82f6)', border: 'var(--color-qa, #3b82f6)' },
  dare: { color: 'var(--color-dare, #f59e0b)', border: 'var(--color-dare, #f59e0b)' },
}

const cloneBoardConfig = (config: BoardConfig): BoardConfig => ({
  punishmentCells: config.punishmentCells,
  chainPunishmentCells: config.chainPunishmentCells,
  bonusCells: config.bonusCells,
  reverseCells: config.reverseCells,
  restCells: config.restCells,
  restartCells: config.restartCells,
  trapCells: config.trapCells,
  totalCells: config.totalCells,
  ...(config.qaCells === undefined ? {} : { qaCells: config.qaCells }),
  ...(config.dareCells === undefined ? {} : { dareCells: config.dareCells }),
})

const clonePunishmentConfig = (config: PunishmentConfig): PunishmentConfig => ({
  tools: Object.fromEntries(
    Object.entries(config.tools).map(([name, tool]) => [name, { ...tool, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(config.bodyParts).map(([name, bodyPart]) => [name, { ...bodyPart, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(config.positions).map(([name, position]) => [
      name,
      { ...position, name, compatibleBodyParts: [...position.compatibleBodyParts] },
    ])
  ),
  minStrikes: config.minStrikes,
  maxStrikes: config.maxStrikes,
  step: config.step,
  maxTakeoffFailures: config.maxTakeoffFailures,
  doublePunishmentChance: config.doublePunishmentChance,
})

const cloneTraps = (traps: readonly TrapAction[]): TrapAction[] => traps.map(trap => ({ ...trap }))

const cloneStageConstraints = (
  constraints: Readonly<Partial<Record<PartyAct, PunishmentConstraints>>>
): Partial<Record<PartyAct, PunishmentConstraints>> =>
  Object.fromEntries(
    Object.entries(constraints).map(([act, value]) => [act, value ? { ...value } : value])
  ) as Partial<Record<PartyAct, PunishmentConstraints>>

const cloneConfig = (config: ConfigSnapshot): ConfigSnapshot => ({
  modeId: config.modeId,
  rulesetVersion: config.rulesetVersion,
  boardConfig: cloneBoardConfig(config.boardConfig),
  punishmentConfig: clonePunishmentConfig(config.punishmentConfig),
  traps: cloneTraps(config.traps),
  qaQuestions: [...config.qaQuestions],
  dareInstructions: [...config.dareInstructions],
  punishmentConstraints: config.punishmentConstraints
    ? { ...config.punishmentConstraints }
    : undefined,
  stageConstraints: cloneStageConstraints(config.stageConstraints),
  authority: config.authority,
})

export const applyBoardConfigOverlay = (
  base: BoardConfig,
  overlay: Partial<BoardConfig>
): BoardConfig => {
  const candidate = { ...base, ...overlay } as BoardConfig
  const isCandidateValid = Boolean(validateBoardConfig(candidate))
  if (isCandidateValid) return candidate

  const fields = numericBoardFields.filter(
    field =>
      field !== 'totalCells' &&
      (field !== 'qaCells' && field !== 'dareCells' ? true : candidate[field] !== undefined)
  ) as Array<Exclude<(typeof numericBoardFields)[number], 'totalCells'>>
  const capacity = Math.max(0, candidate.totalCells - 2)
  const desired = fields.map(field => Math.max(0, Number(candidate[field] ?? 0)))
  const totalDesired = desired.reduce((sum, count) => sum + count, 0)
  if (totalDesired === 0)
    return { ...candidate, ...Object.fromEntries(fields.map(field => [field, 0])) }

  const allocations = desired.map((count, index) => {
    const exact = (count * capacity) / totalDesired
    return { index, count: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let remaining = capacity - allocations.reduce((sum, allocation) => sum + allocation.count, 0)
  for (const allocation of [...allocations].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index
  )) {
    if (remaining <= 0) break
    allocation.count += 1
    remaining -= 1
  }
  return {
    ...candidate,
    ...Object.fromEntries(fields.map((field, index) => [field, allocations[index]?.count ?? 0])),
  }
}

const standardSnapshot: ConfigSnapshot = {
  modeId: 'classic',
  rulesetVersion: 'classic_v1',
  boardConfig: cloneBoardConfig(STANDARD_BOARD_CONFIG),
  punishmentConfig: clonePunishmentConfig(STANDARD_PUNISHMENT_CONFIG),
  traps: cloneTraps(STANDARD_TRAPS),
  qaQuestions: [],
  dareInstructions: [],
  stageConstraints: {},
  authority: 'local',
}

const applyNamedOverrides = <T extends { name: string }, Override extends Partial<T>>(
  base: Record<string, T>,
  overrides: Record<string, Override>,
  isCompleteEntry: (entry: Override) => boolean,
  normalize: (name: string, entry: Override, fallback: T | undefined) => T
): Record<string, T> => {
  const overrideEntries = Object.entries(overrides)
  const replaceCategory =
    overrideEntries.length > 0 && overrideEntries.every(([, entry]) => isCompleteEntry(entry))
  const names = replaceCategory
    ? overrideEntries.map(([name]) => name)
    : [...new Set([...Object.keys(base), ...overrideEntries.map(([name]) => name)])]

  return Object.fromEntries(
    names.map(name => {
      const entry = overrides[name] ?? {}
      return [name, normalize(name, entry as Override, base[name])]
    })
  )
}

const hasCompleteToolFields = (entry: Partial<PunishmentTool>): boolean =>
  typeof entry.name === 'string' &&
  typeof entry.intensity === 'number' &&
  typeof entry.ratio === 'number'

const hasCompleteBodyPartFields = (entry: Partial<PunishmentBodyPart>): boolean =>
  typeof entry.name === 'string' &&
  typeof entry.sensitivity === 'number' &&
  typeof entry.ratio === 'number'

const hasCompletePositionFields = (entry: Partial<PunishmentPosition>): boolean =>
  typeof entry.name === 'string' &&
  typeof entry.ratio === 'number' &&
  Array.isArray(entry.compatibleBodyParts)

export function createStandardConfigSnapshot(overrides: ConfigOverrides = {}): ConfigSnapshot {
  const snapshot = cloneConfig(standardSnapshot)
  if (overrides.modeId) snapshot.modeId = overrides.modeId
  if (overrides.rulesetVersion) {
    snapshot.rulesetVersion = overrides.rulesetVersion
  } else if (overrides.modeId) {
    snapshot.rulesetVersion = MODE_POLICIES[overrides.modeId].rulesetVersion
  }
  if (overrides.authority) {
    snapshot.authority = overrides.authority
  } else if (overrides.modeId) {
    snapshot.authority = MODE_POLICIES[overrides.modeId].authority
  }
  if (overrides.boardConfig) {
    snapshot.boardConfig = { ...snapshot.boardConfig, ...overrides.boardConfig }
  }
  if (overrides.punishmentConfig) {
    const punishment = overrides.punishmentConfig
    snapshot.punishmentConfig = {
      ...snapshot.punishmentConfig,
      ...punishment,
      tools: punishment.tools
        ? applyNamedOverrides(
            snapshot.punishmentConfig.tools,
            punishment.tools,
            hasCompleteToolFields,
            (name, tool, fallback) => ({
              name: tool.name ?? fallback?.name ?? name,
              intensity: tool.intensity ?? fallback?.intensity ?? 1,
              ratio: tool.ratio ?? fallback?.ratio ?? 0,
            })
          )
        : cloneRecord(snapshot.punishmentConfig.tools),
      bodyParts: punishment.bodyParts
        ? applyNamedOverrides(
            snapshot.punishmentConfig.bodyParts,
            punishment.bodyParts,
            hasCompleteBodyPartFields,
            (name, bodyPart, fallback) => ({
              name: bodyPart.name ?? fallback?.name ?? name,
              sensitivity: bodyPart.sensitivity ?? fallback?.sensitivity ?? 1,
              ratio: bodyPart.ratio ?? fallback?.ratio ?? 0,
            })
          )
        : cloneRecord(snapshot.punishmentConfig.bodyParts),
      positions: punishment.positions
        ? applyNamedOverrides(
            snapshot.punishmentConfig.positions,
            punishment.positions,
            hasCompletePositionFields,
            (name, position, fallback) => ({
              name: position.name ?? fallback?.name ?? name,
              ratio: position.ratio ?? fallback?.ratio ?? 0,
              compatibleBodyParts: [
                ...(position.compatibleBodyParts ?? fallback?.compatibleBodyParts ?? []),
              ],
            })
          )
        : cloneRecord(snapshot.punishmentConfig.positions),
    }
  }
  if (overrides.traps) snapshot.traps = cloneTraps(overrides.traps)
  if (overrides.qaQuestions) snapshot.qaQuestions = [...overrides.qaQuestions]
  if (overrides.dareInstructions) snapshot.dareInstructions = [...overrides.dareInstructions]
  if (overrides.stageConstraints) {
    snapshot.stageConstraints = cloneStageConstraints(overrides.stageConstraints)
  }
  return snapshot
}

export function createPunishmentConfig(): PunishmentConfig {
  return clonePunishmentConfig(STANDARD_PUNISHMENT_CONFIG)
}

export function createBoardConfig(): BoardConfig {
  return cloneBoardConfig(STANDARD_BOARD_CONFIG)
}

export function createModeConfig(
  modeId: ModeId,
  standard: ConfigSnapshot = createStandardConfigSnapshot()
): ConfigSnapshot {
  const base = cloneConfig(standard)
  const policy = MODE_POLICIES[modeId]
  if (policy.contentOverlay === 'standard') {
    return {
      ...base,
      modeId: policy.modeId,
      rulesetVersion: policy.rulesetVersion,
      authority: policy.authority,
    }
  }

  return {
    ...base,
    modeId: policy.modeId,
    rulesetVersion: policy.rulesetVersion,
    boardConfig: applyBoardConfigOverlay(base.boardConfig, policy.boardOverlay),
    punishmentConfig: clonePunishmentConfig(base.punishmentConfig),
    traps: cloneTraps(PARTY_TRAPS),
    qaQuestions: [
      ...PARTY_QA_QUESTIONS.warmup,
      ...PARTY_QA_QUESTIONS.heating,
      ...PARTY_QA_QUESTIONS.finale,
    ],
    dareInstructions: [
      ...PARTY_DARE_INSTRUCTIONS.warmup,
      ...PARTY_DARE_INSTRUCTIONS.heating,
      ...PARTY_DARE_INSTRUCTIONS.finale,
    ],
    punishmentConstraints: { ...(policy.stageConstraints.warmup ?? {}) },
    stageConstraints: cloneStageConstraints(policy.stageConstraints),
    authority: policy.authority,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const numericBoardFields = [
  'punishmentCells',
  'chainPunishmentCells',
  'bonusCells',
  'reverseCells',
  'restCells',
  'restartCells',
  'trapCells',
  'totalCells',
  'qaCells',
  'dareCells',
] as const

const trapVariants = new Set<TrapVariant>([
  'text',
  'all_players',
  'choice',
  'roulette',
  'mini_game_reaction',
  'mini_game_memory',
  'mini_game_quiz',
])

const isTrapVariant = (value: unknown): value is TrapVariant =>
  typeof value === 'string' && trapVariants.has(value as TrapVariant)

/**
 * Returns a human-readable validation error for one trap entry.
 * Keeping this logic separate lets strict import validation and the
 * recovery-oriented normalizer apply the same rules.
 */
export function describeTrapConfigEntry(value: unknown): string | null {
  if (!isRecord(value)) return '必须是配置对象'
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return 'name 必须是非空字符串'
  }
  if (typeof value.description !== 'string' || value.description.trim().length === 0) {
    return 'description 必须是非空字符串'
  }
  if (value.trapVariant !== undefined && !isTrapVariant(value.trapVariant)) {
    return 'trapVariant 不是受支持的机关类型'
  }
  if (value.choiceA !== undefined && typeof value.choiceA !== 'string') {
    return 'choiceA 必须是字符串'
  }
  if (value.choiceB !== undefined && typeof value.choiceB !== 'string') {
    return 'choiceB 必须是字符串'
  }
  if (value.trapVariant === 'choice') {
    if (typeof value.choiceA !== 'string' || value.choiceA.trim().length === 0) {
      return '选择机关必须提供去除首尾空白后的非空 choiceA'
    }
    if (typeof value.choiceB !== 'string' || value.choiceB.trim().length === 0) {
      return '选择机关必须提供去除首尾空白后的非空 choiceB'
    }
  }
  return null
}

export function validateTrapConfigEntry(value: unknown): value is TrapAction {
  return describeTrapConfigEntry(value) === null
}

export function validateTrapConfig(value: unknown): value is TrapAction[] {
  return Array.isArray(value) && value.length > 0 && value.every(validateTrapConfigEntry)
}

export function normalizeTrapConfig(
  value: unknown,
  fallback: readonly TrapAction[] = STANDARD_TRAPS
): TrapAction[] {
  if (!Array.isArray(value)) return cloneTraps(fallback)
  const normalized = value.flatMap(entry => {
    if (!validateTrapConfigEntry(entry) || !isRecord(entry)) return []
    return [
      {
        name: entry.name,
        description: entry.description,
        ...(isTrapVariant(entry.trapVariant) ? { trapVariant: entry.trapVariant } : {}),
        ...(typeof entry.choiceA === 'string' ? { choiceA: entry.choiceA } : {}),
        ...(typeof entry.choiceB === 'string' ? { choiceB: entry.choiceB } : {}),
      },
    ]
  })
  return normalized.length > 0 ? normalized : cloneTraps(fallback)
}

export function validateBoardConfig(value: unknown): value is BoardConfig {
  if (!isRecord(value)) return false
  const counts: Array<(typeof numericBoardFields)[number]> = [
    'punishmentCells',
    'chainPunishmentCells',
    'bonusCells',
    'reverseCells',
    'restCells',
    'restartCells',
    'trapCells',
    'totalCells',
  ]
  if (value.qaCells !== undefined) counts.push('qaCells')
  if (value.dareCells !== undefined) counts.push('dareCells')
  if (
    !counts.every(field => typeof value[field] === 'number' && Number.isInteger(value[field])) ||
    typeof value.totalCells !== 'number' ||
    value.totalCells < 20 ||
    value.totalCells > 100
  ) {
    return false
  }
  const assigned = counts
    .filter(field => field !== 'totalCells')
    .reduce((total, field) => total + Number(value[field]), 0)
  return (
    counts.every(field => field === 'totalCells' || Number(value[field]) >= 0) &&
    assigned <= value.totalCells - 2
  )
}

export function normalizeBoardConfig(
  value: unknown,
  fallback: BoardConfig = STANDARD_BOARD_CONFIG
): BoardConfig {
  const source = isRecord(value) ? value : undefined
  if (!source) return cloneBoardConfig(fallback)
  const normalized: BoardConfig = cloneBoardConfig(fallback)
  for (const field of numericBoardFields) {
    if (typeof source[field] === 'number' && Number.isInteger(source[field])) {
      if (field === 'qaCells' || field === 'dareCells') normalized[field] = source[field]
      else normalized[field] = source[field]
    }
  }
  if (source.chainPunishmentCells === undefined) normalized.chainPunishmentCells = 0
  return normalized
}

const normalizeNamedEntries = <T extends { name: string }>(
  value: unknown,
  fallback: Record<string, T>,
  normalize: (name: string, value: Record<string, unknown>, base: T) => T
): Record<string, T> => {
  const entries: Array<[string, Record<string, unknown>]> = []
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isRecord(entry) && typeof entry.name === 'string' && entry.name.trim()) {
        entries.push([entry.name, entry])
      }
    }
  } else if (isRecord(value)) {
    for (const [name, entry] of Object.entries(value)) {
      if (isRecord(entry) && name.trim()) entries.push([name, entry])
    }
  }
  if (entries.length === 0) return cloneRecord(fallback)
  return Object.fromEntries(
    entries.map(([name, entry]) => {
      const base = fallback[name] ?? ({ name, ratio: 0 } as unknown as T)
      return [name, normalize(name, entry, base)]
    })
  )
}

const cloneRecord = <T extends { name: string }>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).map(([name, value]) => [
      name,
      {
        ...value,
        name,
        ...(Array.isArray((value as { compatibleBodyParts?: unknown }).compatibleBodyParts)
          ? {
              compatibleBodyParts: [
                ...(value as unknown as PunishmentPosition).compatibleBodyParts,
              ],
            }
          : {}),
      },
    ])
  )

function isStructurallyValidPunishmentConfig(value: unknown): value is PunishmentConfig {
  if (!isRecord(value)) return false
  const tools = value.tools
  const bodyParts = value.bodyParts
  const positions = value.positions
  if (!isRecord(tools) || !isRecord(bodyParts) || !isRecord(positions)) return false
  if (
    Object.keys(tools).length === 0 ||
    Object.keys(bodyParts).length === 0 ||
    Object.keys(positions).length === 0
  )
    return false
  const validRatio = (entry: unknown): entry is { ratio: number } =>
    isRecord(entry) &&
    typeof entry.ratio === 'number' &&
    Number.isFinite(entry.ratio) &&
    entry.ratio >= 0 &&
    entry.ratio <= 100
  if (
    !Object.values(tools).every(entry => {
      if (!isRecord(entry) || !validRatio(entry)) return false
      const candidate = entry as Record<string, unknown>
      return (
        Number.isInteger(candidate.intensity) &&
        Number(candidate.intensity) >= 1 &&
        Number(candidate.intensity) <= 10
      )
    })
  ) {
    return false
  }
  if (
    !Object.values(bodyParts).every(entry => {
      if (!isRecord(entry) || !validRatio(entry)) return false
      const candidate = entry as Record<string, unknown>
      return (
        Number.isInteger(candidate.sensitivity) &&
        Number(candidate.sensitivity) >= 1 &&
        Number(candidate.sensitivity) <= 10
      )
    })
  ) {
    return false
  }
  const bodyPartNames = new Set(Object.keys(bodyParts))
  if (
    !Object.values(positions).every(entry => {
      if (!isRecord(entry) || !validRatio(entry)) {
        return false
      }
      const candidate = entry as Record<string, unknown>
      if (!Array.isArray(candidate.compatibleBodyParts)) return false
      const compatibleBodyParts = candidate.compatibleBodyParts as unknown[]
      return compatibleBodyParts.every(
        (name: unknown) => typeof name === 'string' && bodyPartNames.has(name)
      )
    })
  ) {
    return false
  }
  const minStrikes = value.minStrikes
  const maxStrikes = value.maxStrikes
  const step = value.step
  const maxTakeoffFailures = value.maxTakeoffFailures
  const doublePunishmentChance = value.doublePunishmentChance
  return (
    Object.values(tools).some(entry => validRatio(entry) && entry.ratio > 0) &&
    Object.values(bodyParts).some(entry => validRatio(entry) && entry.ratio > 0) &&
    Object.values(positions).some(entry => validRatio(entry) && entry.ratio > 0) &&
    Number.isSafeInteger(minStrikes) &&
    Number(minStrikes) >= 1 &&
    Number(minStrikes) <= 100 &&
    Number.isSafeInteger(maxStrikes) &&
    Number(maxStrikes) >= Number(minStrikes) &&
    Number(maxStrikes) <= 100 &&
    Number.isSafeInteger(step) &&
    Number(step) >= 1 &&
    Number(step) <= 100 &&
    Number.isSafeInteger(maxTakeoffFailures) &&
    Number(maxTakeoffFailures) >= 1 &&
    Number(maxTakeoffFailures) <= 10 &&
    typeof doublePunishmentChance === 'number' &&
    Number.isFinite(doublePunishmentChance) &&
    doublePunishmentChance >= 0 &&
    doublePunishmentChance <= 100
  )
}

export type PunishmentConfigIssueCode =
  | 'INVALID_STRUCTURE'
  | 'NO_COMPATIBLE_COMBINATION'
  | 'INVALID_STRIKE_RANGE'

export interface PunishmentConfigIssue {
  readonly code: PunishmentConfigIssueCode
  readonly message: string
}

export type PunishmentConfigValidationResult =
  | Readonly<{ isValid: true; issues: readonly [] }>
  | Readonly<{ isValid: false; issues: readonly PunishmentConfigIssue[] }>

export function inspectPunishmentConfig(
  value: unknown,
  constraints: PunishmentConstraints = {}
): PunishmentConfigValidationResult {
  if (!isStructurallyValidPunishmentConfig(value)) {
    return {
      isValid: false,
      issues: [
        {
          code: 'INVALID_STRUCTURE',
          message: '工具、部位、姿势或惩罚次数参数超出有效范围。',
        },
      ],
    }
  }

  const minimum = Math.max(1, constraints.minStrikes ?? value.minStrikes)
  const maximum = Math.max(minimum, constraints.maxStrikes ?? value.maxStrikes)
  if (Math.ceil(minimum / value.step) > Math.floor(maximum / value.step)) {
    return {
      isValid: false,
      issues: [
        {
          code: 'INVALID_STRIKE_RANGE',
          message: '惩罚次数范围内没有符合当前步长的可用值。',
        },
      ],
    }
  }

  const maxIntensity = constraints.maxToolIntensity ?? Infinity
  const hasCompatibleCombination = Object.values(value.tools).some(
    tool =>
      tool.ratio > 0 &&
      tool.intensity <= maxIntensity &&
      Object.values(value.bodyParts).some(
        bodyPart =>
          bodyPart.ratio > 0 &&
          bodyPart.sensitivity >= tool.intensity &&
          Object.values(value.positions).some(
            position =>
              position.ratio > 0 &&
              (position.compatibleBodyParts.length === 0 ||
                position.compatibleBodyParts.includes(bodyPart.name))
          )
      )
  )
  if (!hasCompatibleCombination) {
    return {
      isValid: false,
      issues: [
        {
          code: 'NO_COMPATIBLE_COMBINATION',
          message: '当前启用的工具、部位和姿势无法组成任何兼容的惩罚。',
        },
      ],
    }
  }

  return { isValid: true, issues: [] }
}

export function validatePunishmentConfig(
  value: unknown,
  constraints?: PunishmentConstraints
): value is PunishmentConfig {
  return inspectPunishmentConfig(value, constraints).isValid
}

export function normalizePunishmentConfig(
  value: unknown,
  fallback: PunishmentConfig = STANDARD_PUNISHMENT_CONFIG
): PunishmentConfig {
  const source = isRecord(value) ? value : {}
  const base = clonePunishmentConfig(fallback)
  const tools = normalizeNamedEntries(source.tools, base.tools, (name, entry, current) => ({
    name,
    intensity: typeof entry.intensity === 'number' ? entry.intensity : current.intensity,
    ratio: typeof entry.ratio === 'number' ? entry.ratio : current.ratio,
  }))
  const bodyParts = normalizeNamedEntries(
    source.bodyParts,
    base.bodyParts,
    (name, entry, current) => ({
      name,
      sensitivity: typeof entry.sensitivity === 'number' ? entry.sensitivity : current.sensitivity,
      ratio: typeof entry.ratio === 'number' ? entry.ratio : current.ratio,
    })
  )
  const positions = normalizeNamedEntries(
    source.positions,
    base.positions,
    (name, entry, current) => ({
      name,
      ratio: typeof entry.ratio === 'number' ? entry.ratio : current.ratio,
      compatibleBodyParts: Array.isArray(entry.compatibleBodyParts)
        ? entry.compatibleBodyParts.filter((part): part is string => typeof part === 'string')
        : [],
    })
  )
  return {
    tools,
    bodyParts,
    positions,
    minStrikes: typeof source.minStrikes === 'number' ? source.minStrikes : base.minStrikes,
    maxStrikes: typeof source.maxStrikes === 'number' ? source.maxStrikes : base.maxStrikes,
    step: typeof source.step === 'number' ? source.step : base.step,
    maxTakeoffFailures:
      typeof source.maxTakeoffFailures === 'number'
        ? source.maxTakeoffFailures
        : base.maxTakeoffFailures,
    doublePunishmentChance:
      typeof source.doublePunishmentChance === 'number'
        ? source.doublePunishmentChance
        : base.doublePunishmentChance,
  }
}

const normalizePunishmentConstraints = (value: unknown): PunishmentConstraints => {
  if (!isRecord(value)) return {}
  return {
    ...(typeof value.maxToolIntensity === 'number'
      ? { maxToolIntensity: value.maxToolIntensity }
      : {}),
    ...(typeof value.minStrikes === 'number' ? { minStrikes: value.minStrikes } : {}),
    ...(typeof value.maxStrikes === 'number' ? { maxStrikes: value.maxStrikes } : {}),
    ...(typeof value.doublePunishmentChance === 'number'
      ? { doublePunishmentChance: value.doublePunishmentChance }
      : {}),
  }
}

export function normalizeConfigSnapshot(value: unknown): ConfigSnapshot {
  const source = isRecord(value) ? value : {}
  const standard = createStandardConfigSnapshot()
  const modeId: ModeId =
    source.modeId === 'party' || source.modeId === 'online_party' ? source.modeId : 'classic'
  const rulesetVersion = MODE_POLICIES[modeId].rulesetVersion
  const defaultStageConstraints = MODE_POLICIES[modeId].stageConstraints
  const sourceStageConstraints = isRecord(source.stageConstraints) ? source.stageConstraints : {}
  const stageConstraints = Object.fromEntries(
    partyActs.flatMap(act => {
      const candidate = sourceStageConstraints[act] ?? defaultStageConstraints[act]
      return candidate === undefined ? [] : [[act, normalizePunishmentConstraints(candidate)]]
    })
  ) as Partial<Record<PartyAct, PunishmentConstraints>>
  const trapsValue = source.traps ?? source.trapConfig
  const traps = normalizeTrapConfig(trapsValue, standard.traps)
  return {
    modeId,
    rulesetVersion,
    boardConfig: normalizeBoardConfig(source.boardConfig, standard.boardConfig),
    punishmentConfig: normalizePunishmentConfig(source.punishmentConfig, standard.punishmentConfig),
    traps,
    qaQuestions: Array.isArray(source.qaQuestions)
      ? source.qaQuestions.filter((entry): entry is string => typeof entry === 'string')
      : [],
    dareInstructions: Array.isArray(source.dareInstructions)
      ? source.dareInstructions.filter((entry): entry is string => typeof entry === 'string')
      : [],
    punishmentConstraints: isRecord(source.punishmentConstraints)
      ? {
          ...(typeof source.punishmentConstraints.maxToolIntensity === 'number'
            ? { maxToolIntensity: source.punishmentConstraints.maxToolIntensity }
            : {}),
          ...(typeof source.punishmentConstraints.minStrikes === 'number'
            ? { minStrikes: source.punishmentConstraints.minStrikes }
            : {}),
          ...(typeof source.punishmentConstraints.maxStrikes === 'number'
            ? { maxStrikes: source.punishmentConstraints.maxStrikes }
            : {}),
          ...(typeof source.punishmentConstraints.doublePunishmentChance === 'number'
            ? { doublePunishmentChance: source.punishmentConstraints.doublePunishmentChance }
            : {}),
        }
      : undefined,
    stageConstraints,
    authority: MODE_POLICIES[modeId].authority,
  }
}

const isValidPunishmentConstraints = (value: unknown): value is PunishmentConstraints => {
  if (!isRecord(value)) return false
  const minStrikes = value.minStrikes
  const maxStrikes = value.maxStrikes
  return (
    (value.maxToolIntensity === undefined ||
      (typeof value.maxToolIntensity === 'number' &&
        Number.isInteger(value.maxToolIntensity) &&
        value.maxToolIntensity >= 1 &&
        value.maxToolIntensity <= 10)) &&
    (minStrikes === undefined ||
      (typeof minStrikes === 'number' && Number.isInteger(minStrikes) && minStrikes >= 1)) &&
    (maxStrikes === undefined ||
      (typeof maxStrikes === 'number' && Number.isInteger(maxStrikes) && maxStrikes >= 1)) &&
    (minStrikes === undefined ||
      maxStrikes === undefined ||
      (typeof minStrikes === 'number' &&
        typeof maxStrikes === 'number' &&
        maxStrikes >= minStrikes)) &&
    (value.doublePunishmentChance === undefined ||
      (typeof value.doublePunishmentChance === 'number' &&
        Number.isFinite(value.doublePunishmentChance) &&
        value.doublePunishmentChance >= 0 &&
        value.doublePunishmentChance <= 100))
  )
}

export function validateConfigSnapshot(value: unknown): value is ConfigSnapshot {
  if (!isRecord(value)) return false
  const constraints = value.punishmentConstraints
  const validConstraints = constraints === undefined || isValidPunishmentConstraints(constraints)
  const stageConstraints = value.stageConstraints
  const validStageConstraints =
    isRecord(stageConstraints) &&
    Object.entries(stageConstraints).every(
      ([act, stage]) => partyActs.includes(act as PartyAct) && isValidPunishmentConstraints(stage)
    )
  const punishmentConfigValid = validatePunishmentConfig(value.punishmentConfig)
  const baseConstraints = isValidPunishmentConstraints(constraints) ? constraints : {}
  const generatableForBase =
    punishmentConfigValid &&
    validConstraints &&
    validatePunishmentConfig(value.punishmentConfig, baseConstraints)
  const generatableForEveryStage =
    punishmentConfigValid &&
    validStageConstraints &&
    Object.values(stageConstraints as Record<string, unknown>).every(
      stage =>
        isValidPunishmentConstraints(stage) &&
        validatePunishmentConfig(value.punishmentConfig, { ...baseConstraints, ...stage })
    )
  return (
    ((value.modeId === 'classic' && value.rulesetVersion === 'classic_v1') ||
      ((value.modeId === 'party' || value.modeId === 'online_party') &&
        value.rulesetVersion === 'party_v3')) &&
    validateBoardConfig(value.boardConfig) &&
    punishmentConfigValid &&
    validateTrapConfig(value.traps) &&
    Array.isArray(value.qaQuestions) &&
    value.qaQuestions.every(entry => typeof entry === 'string') &&
    Array.isArray(value.dareInstructions) &&
    value.dareInstructions.every(entry => typeof entry === 'string') &&
    validConstraints &&
    validStageConstraints &&
    generatableForBase &&
    generatableForEveryStage &&
    value.authority === MODE_POLICIES[value.modeId as ModeId]?.authority
  )
}

export function serializeConfigSnapshot(config: ConfigSnapshot): string {
  if (!validateConfigSnapshot(config)) throw new Error('配置快照无效，不能序列化')
  return JSON.stringify(config)
}

export function projectPublicConfig(config: ConfigSnapshot): PublicConfigProjection {
  return {
    modeId: config.modeId,
    rulesetVersion: config.rulesetVersion,
    boardConfig: cloneBoardConfig(config.boardConfig),
    authority: config.authority,
  }
}

export function cryptoRandomInt(
  minimum: number,
  maximum: number,
  source: CryptoRandomSource = globalThis.crypto
): number {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
    throw new RangeError('随机整数范围必须是按升序排列的安全整数')
  }
  const range = maximum - minimum + 1
  const uint32Range = 0x1_0000_0000
  if (range > uint32Range) {
    throw new RangeError('随机整数范围不能超过 uint32 可表示的取值数量')
  }
  const acceptanceLimit = Math.floor(uint32Range / range) * range
  const bytes = new Uint32Array(1)
  let sample: number
  do {
    source.getRandomValues(bytes)
    sample = bytes[0]
  } while (sample >= acceptanceLimit)
  return minimum + (sample % range)
}

const secureRandomSource: BoardRandomSource = {
  randomInt: cryptoRandomInt,
  random: () => cryptoRandomInt(0, 0xffff_ffff) / 0x1_0000_0000,
  choice: entries => {
    if (entries.length === 0) throw new Error('不能从空集合中选择')
    const selected = entries[secureRandomSource.randomInt(0, entries.length - 1)]
    if (selected === undefined) throw new Error('随机选择结果超出集合范围')
    return selected
  },
}

export function chooseWeighted<T>(
  entries: readonly T[],
  weights: readonly number[],
  randomUnit: () => number = () => cryptoRandomInt(0, 0xffff_ffff) / 0x1_0000_0000
): T {
  if (entries.length === 0 || entries.length !== weights.length) {
    throw new Error('加权选择的候选项与权重数量必须一致且不能为空')
  }
  if (weights.some(weight => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError('加权选择的权重必须是非负有限数')
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (!(total > 0) || !Number.isFinite(total)) {
    throw new RangeError('加权选择的权重总和必须是正有限数')
  }
  const unit = randomUnit()
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1) {
    throw new RangeError('随机源必须返回 [0, 1) 范围内的数字')
  }
  const threshold = unit * total
  let cumulative = 0
  for (let index = 0; index < entries.length; index += 1) {
    cumulative += weights[index] ?? 0
    const entry = entries[index]
    if (entry !== undefined && threshold < cumulative) return entry
  }
  const fallback = entries[entries.length - 1]
  if (fallback === undefined) throw new Error('加权选择没有可用候选项')
  return fallback
}

const chooseByRatio = <T extends { ratio: number }>(
  entries: readonly T[],
  random: BoardRandomSource
): T => {
  const enabled = entries.filter(entry => entry.ratio > 0)
  if (enabled.length === 0) throw new Error('没有启用的惩罚配置')
  return chooseWeighted(
    enabled,
    enabled.map(entry => entry.ratio),
    () => random.random?.() ?? random.randomInt(0, 0x00ff_ffff) / 0x0100_0000
  )
}

export function createCompatiblePunishmentAction(
  config: PunishmentConfig,
  random: BoardRandomSource = secureRandomSource,
  constraints?: PunishmentConstraints
): PunishmentAction {
  const tools = Object.values(config.tools)
  const bodyParts = Object.values(config.bodyParts)
  const positions = Object.values(config.positions)
  const maxIntensity = constraints?.maxToolIntensity ?? Infinity
  const viableTools = tools.filter(
    tool =>
      tool.ratio > 0 &&
      tool.intensity <= maxIntensity &&
      bodyParts.some(
        bodyPart =>
          bodyPart.ratio > 0 &&
          bodyPart.sensitivity >= tool.intensity &&
          positions.some(
            position =>
              position.ratio > 0 &&
              (position.compatibleBodyParts.length === 0 ||
                position.compatibleBodyParts.includes(bodyPart.name))
          )
      )
  )
  const tool = chooseByRatio(viableTools, random)
  const viableBodyParts = bodyParts.filter(
    bodyPart =>
      bodyPart.ratio > 0 &&
      bodyPart.sensitivity >= tool.intensity &&
      positions.some(
        position =>
          position.ratio > 0 &&
          (position.compatibleBodyParts.length === 0 ||
            position.compatibleBodyParts.includes(bodyPart.name))
      )
  )
  const bodyPart = chooseByRatio(viableBodyParts, random)
  const position = chooseByRatio(
    positions.filter(
      candidate =>
        candidate.ratio > 0 &&
        (candidate.compatibleBodyParts.length === 0 ||
          candidate.compatibleBodyParts.includes(bodyPart.name))
    ),
    random
  )
  const step = Math.max(1, config.step)
  const minimum = Math.max(1, constraints?.minStrikes ?? config.minStrikes)
  const maximum = Math.max(minimum, constraints?.maxStrikes ?? config.maxStrikes)
  const minimumMultiple = Math.ceil(minimum / step)
  const maximumMultiple = Math.floor(maximum / step)
  if (minimumMultiple > maximumMultiple) throw new Error('惩罚次数范围内没有合法步长')
  const strikes = random.randomInt(minimumMultiple, maximumMultiple) * step
  return {
    tool: { ...tool },
    bodyPart: { ...bodyPart },
    position: { ...position, compatibleBodyParts: [...position.compatibleBodyParts] },
    strikes,
    description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
  }
}

export function createSharedBoard(
  config: ConfigSnapshot,
  random: BoardRandomSource = secureRandomSource
): BoardCell[] {
  if (!validateBoardConfig(config.boardConfig)) throw new Error('棋盘配置无效')
  const boardConfig = config.boardConfig
  const totalCells = boardConfig.totalCells
  const availablePositions = Array.from({ length: totalCells - 2 }, (_, index) => index + 2)
  for (let index = availablePositions.length - 1; index > 0; index -= 1) {
    const swapIndex = random.randomInt(0, index)
    const current = availablePositions[index]
    const swap = availablePositions[swapIndex]
    if (current === undefined || swap === undefined) {
      throw new Error('棋盘随机源返回了越界位置')
    }
    availablePositions[index] = swap
    availablePositions[swapIndex] = current
  }

  const board = new Map<number, BoardCell>([
    [
      1,
      {
        id: 1,
        type: 'bonus',
        position: 1,
        effect: { type: 'move', value: 0, description: '起点' },
      },
    ],
    [
      totalCells,
      {
        id: totalCells,
        type: 'bonus',
        position: totalCells,
        effect: { type: 'move', value: 0, description: '终点 - 游戏胜利' },
      },
    ],
  ])
  let cursor = 0
  const take = (count: number): number[] => {
    const positions = availablePositions.slice(cursor, cursor + count)
    cursor += count
    return positions
  }
  const punishmentPositions = take(boardConfig.punishmentCells)
  const chainPositions = take(boardConfig.chainPunishmentCells)
  const bonusPositions = take(boardConfig.bonusCells)
  const reversePositions = take(boardConfig.reverseCells)
  const restPositions = take(boardConfig.restCells)
  const restartPositions = take(boardConfig.restartCells)
  const trapPositions = take(boardConfig.trapCells)
  const qaPositions = take(boardConfig.qaCells ?? 0)
  const darePositions = take(boardConfig.dareCells ?? 0)

  for (const position of punishmentPositions) {
    const punishment = createCompatiblePunishmentAction(
      config.punishmentConfig,
      random,
      config.punishmentConstraints
    )
    board.set(position, {
      id: position,
      type: 'punishment',
      position,
      effect: { type: 'punishment', value: 0, description: punishment.description, punishment },
    })
  }
  for (const position of chainPositions) {
    const punishment = createCompatiblePunishmentAction(
      config.punishmentConfig,
      random,
      config.punishmentConstraints
    )
    board.set(position, {
      id: position,
      type: 'chain_punishment',
      position,
      effect: {
        type: 'chain_punishment',
        value: 0,
        description: `连锁惩罚：${punishment.description}`,
        punishment,
      },
    })
  }
  for (const position of bonusPositions) {
    const value = random.choice([2, 3])
    board.set(position, {
      id: position,
      type: 'bonus',
      position,
      effect: { type: 'move', value, description: `前进${value}步` },
    })
  }
  for (const position of reversePositions) {
    const value = random.choice([2, 3])
    board.set(position, {
      id: position,
      type: 'special',
      position,
      effect: { type: 'reverse', value, description: `后退${value}步` },
    })
  }
  for (const position of restPositions) {
    board.set(position, {
      id: position,
      type: 'special',
      position,
      effect: { type: 'rest', value: 1, description: '休息1回合' },
    })
  }
  for (const position of restartPositions) {
    board.set(position, {
      id: position,
      type: 'restart',
      position,
      effect: { type: 'restart', value: 0, description: '回到起点' },
    })
  }
  for (const position of trapPositions) {
    if (config.traps.length === 0) throw new Error('机关配置不能为空')
    const trap = random.choice(config.traps)
    board.set(position, {
      id: position,
      type: 'trap',
      position,
      effect: {
        type: 'trap',
        value: 0,
        description: trap.description,
        trapVariant: trap.trapVariant,
        choiceA: trap.choiceA,
        choiceB: trap.choiceB,
      },
    })
  }
  for (const position of qaPositions) {
    const question = random.choice(
      config.qaQuestions.length > 0 ? config.qaQuestions : ['问答时间']
    )
    board.set(position, {
      id: position,
      type: 'qa',
      position,
      effect: { type: 'qa', value: 0, description: question },
    })
  }
  for (const position of darePositions) {
    const dare = random.choice(
      config.dareInstructions.length > 0 ? config.dareInstructions : ['执行指令']
    )
    board.set(position, {
      id: position,
      type: 'dare',
      position,
      effect: { type: 'dare', value: 0, description: dare },
    })
  }
  for (let position = 2; position < totalCells; position += 1) {
    if (!board.has(position)) {
      board.set(position, {
        id: position,
        type: 'bonus',
        position,
        effect: { type: 'move', value: 0, description: '普通格子' },
      })
    }
  }
  return Array.from({ length: totalCells }, (_, index) => {
    const cell = board.get(index + 1)
    if (!cell) throw new Error(`棋盘缺少第 ${index + 1} 格`)
    return cell
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// English-locale default content
// ─────────────────────────────────────────────────────────────────────────────

const EN_STANDARD_TOOLS = {
  Hand: { intensity: 2, ratio: 8 },
  Ruler: { intensity: 3, ratio: 8 },
  Paddle: { intensity: 5, ratio: 8 },
  Cane: { intensity: 7, ratio: 8 },
  Strap: { intensity: 6, ratio: 8 },
  Belt: { intensity: 7, ratio: 8 },
  Hairbrush: { intensity: 5, ratio: 8 },
  'Ping-pong paddle': { intensity: 4, ratio: 8 },
  'Loopy Johnny': { intensity: 8, ratio: 6 },
  'Bath brush': { intensity: 6, ratio: 8 },
  Switch: { intensity: 8, ratio: 6 },
  'Riding crop': { intensity: 5, ratio: 6 },
} as const

const EN_STANDARD_BODY_PARTS = {
  Bottom: { sensitivity: 10, ratio: 80 },
  Thighs: { sensitivity: 5, ratio: 5 },
  Back: { sensitivity: 7, ratio: 5 },
  Palms: { sensitivity: 3, ratio: 5 },
  'Sit-spot': { sensitivity: 8, ratio: 5 },
} as const

const EN_STANDARD_POSITIONS = {
  Standing: {
    ratio: 20,
    compatibleBodyParts: ['Bottom', 'Back', 'Thighs', 'Sit-spot', 'Palms'],
  },
  'Hands on wall': {
    ratio: 20,
    compatibleBodyParts: ['Bottom', 'Back', 'Thighs', 'Sit-spot'],
  },
  'Bent over a table': {
    ratio: 20,
    compatibleBodyParts: ['Bottom', 'Back', 'Thighs', 'Sit-spot'],
  },
  'Touching toes': {
    ratio: 20,
    compatibleBodyParts: ['Bottom', 'Thighs', 'Sit-spot'],
  },
  'Over-the-knee (OTK)': {
    ratio: 20,
    compatibleBodyParts: ['Bottom', 'Sit-spot', 'Thighs'],
  },
} as const

const EN_STANDARD_TRAPS: TrapAction[] = [
  {
    name: 'Display trap',
    description: 'Bare and display your bottom for 5 minutes',
  },
  {
    name: 'Beg for it',
    description:
      'Must ask for punishment yourself — say aloud "Please spank my bottom" to the previous spanker',
  },
]

const EN_PARTY_TRAPS: TrapAction[] = [
  {
    name: 'Display trap',
    description: 'Bare and display your bottom for 5 minutes',
    trapVariant: 'text',
  },
  {
    name: 'Beg for it',
    description: 'Must request your own punishment — say aloud "Please spank me"',
    trapVariant: 'text',
  },
  {
    name: 'Group trap',
    description:
      'Everyone lines up. The player who landed here gives each person 3 hand spanks on the bottom',
    trapVariant: 'all_players',
  },
  {
    name: 'Reaction race',
    description: 'Everyone takes the reaction speed test — the fastest wins one free pass',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: 'Memory flip',
    description: 'Memorise the order of three symbols — fail and your next punishment is doubled',
    trapVariant: 'mini_game_memory',
  },
  {
    name: 'Quick quiz',
    description: 'Answer before the timer runs out — time out and your next punishment is doubled',
    trapVariant: 'mini_game_quiz',
  },
  {
    name: 'Choose your fate',
    description: 'Pick one:',
    trapVariant: 'choice',
    choiceA: '15 hand spanks on the bottom',
    choiceB: 'Hold the OTK position for 2 minutes',
  },
  {
    name: 'High-stakes choice',
    description: 'Pick one:',
    trapVariant: 'choice',
    choiceA: '10 cane strokes on the bottom',
    choiceB: 'Move back 5 spaces',
  },
  {
    name: 'Roulette trap',
    description: 'Spin the wheel! A random player receives the punishment — might not be you!',
    trapVariant: 'roulette',
  },
  {
    name: 'Shared roulette',
    description:
      'Spin the wheel! A random player is chosen — you both exchange 5 hand spanks on the bottom',
    trapVariant: 'roulette',
  },
]

const EN_PARTY_QA_QUESTIONS = {
  warmup: [
    'What is your safeword?',
    'Which implement do you find the most intense?',
    'When did you first encounter the spanking lifestyle?',
    'Do you make sounds during a spanking?',
    'Are you more afraid of pain or of anticipation?',
    'What is the highest-intensity implement you can handle?',
    'Is there a particular punishment position you have always wanted to try?',
    'Which is more nerve-racking — waiting before a spanking or the spanking itself?',
  ],
  heating: [
    'Describe your most memorable punishment experience',
    'What is one type of punishment you cannot accept?',
    'Have you ever cried during a spanking? What was the situation?',
    'Have you ever been made to stand in the corner or kneel? How did it feel?',
    'How long do you usually need to recover after a punishment?',
    'Has there been a moment mid-punishment when you wanted to use your safeword?',
    'Do you think a formal "scolding" before punishment adds to the experience?',
  ],
  finale: [
    'Do you prefer giving or receiving spankings?',
    'What does your ideal spanking relationship look like?',
    'Would you like discipline to be part of everyday life together?',
    'What is the absolute limit you would not cross for a partner?',
    'Is the physical sensation or the ritual/ceremony more important to you in a spanking?',
    'If you could design the perfect punishment scenario, what would it look like?',
  ],
} as const

const EN_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Close your eyes. Let anyone lightly touch the back of your hand with one implement — guess what it is',
    "Mimic the face you make when you're being spanked. Hold it for 10 seconds",
    'Give the person on your left a 30-second shoulder massage',
    'Say to the person on your right in your sternest voice: "Come here right now."',
    'Stand up and demonstrate a punishment position. Hold it for 15 seconds',
  ],
  heating: [
    'Let the person on your right choose your punishment position for the next round',
    'Close your eyes and extend your palm — let anyone give it 3 light slaps and guess who it was',
    'Choose one person and maintain eye contact for 30 seconds without laughing',
    'Mime begging for forgiveness convincingly enough to satisfy everyone',
    'Swap board positions with the person on your right',
  ],
  finale: [
    'Everyone votes on who showed the best endurance this game',
    'Pick one person and give the back of their hand 5 light taps with your chosen implement',
    'Perform a formal punishment request: say aloud which implement and body part you choose for yourself',
    'Let the person on your left give your palm 3 light spanks — you may not pull away',
    'Describe your perfect punishment scenario. Everyone votes whether to carry it out right now',
  ],
} as const

export const EN_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(EN_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(EN_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(EN_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

export interface LocaleContent {
  punishmentConfig: PunishmentConfig
  standardTraps: TrapAction[]
  partyTraps: TrapAction[]
  partyQaQuestions: {
    warmup: readonly string[]
    heating: readonly string[]
    finale: readonly string[]
  }
  partyDareInstructions: {
    warmup: readonly string[]
    heating: readonly string[]
    finale: readonly string[]
  }
  defaultPlayerName: (index: number) => string
}

const ZH_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: STANDARD_PUNISHMENT_CONFIG,
  standardTraps: STANDARD_TRAPS,
  partyTraps: PARTY_TRAPS,
  partyQaQuestions: PARTY_QA_QUESTIONS,
  partyDareInstructions: PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `玩家${index + 1}`,
}

const EN_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: EN_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: EN_STANDARD_TRAPS,
  partyTraps: EN_PARTY_TRAPS,
  partyQaQuestions: EN_PARTY_QA_QUESTIONS,
  partyDareInstructions: EN_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Player ${index + 1}`,
}

const JA_STANDARD_TOOLS = {
  平手: { intensity: 2, ratio: 8 },
  定規: { intensity: 3, ratio: 8 },
  木の板: { intensity: 5, ratio: 8 },
  竹の鞭: { intensity: 7, ratio: 8 },
  戒尺: { intensity: 5, ratio: 8 },
  赤いスパンカー: { intensity: 7, ratio: 8 },
  緑のスパンカー: { intensity: 7, ratio: 8 },
  グルースティック: { intensity: 9, ratio: 6 },
  充電ケーブル: { intensity: 9, ratio: 8 },
  ヘアブラシ: { intensity: 5, ratio: 8 },
  レザークロップ: { intensity: 7, ratio: 8 },
  アクリル板: { intensity: 7, ratio: 6 },
} as const

const JA_STANDARD_BODY_PARTS = {
  お尻: { sensitivity: 10, ratio: 80 },
  背中: { sensitivity: 7, ratio: 5 },
  太もも: { sensitivity: 5, ratio: 5 },
  お尻の谷間: { sensitivity: 2, ratio: 5 },
  手のひら: { sensitivity: 2, ratio: 5 },
} as const

const JA_STANDARD_POSITIONS = {
  直立: { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間', '手のひら'] },
  壁に手をつく: { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
  机にうつ伏せ: { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
  膝を掴む: { ratio: 20, compatibleBodyParts: ['お尻', '太もも', 'お尻の谷間'] },
  四つん這い: { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
} as const

const JA_STANDARD_TRAPS: TrapAction[] = [
  { name: 'お尻さらしの罠', description: '5分間お尻を露出する' },
  {
    name: 'ランダム罰の罠',
    description:
      '前に罰を受けたプレイヤーに任意の道具でお尻を打たれる。「私のお尻を打ってください」と大声でお願いする',
  },
]

const JA_PARTY_TRAPS: TrapAction[] = [
  { name: 'お尻さらしの罠', description: '5分間お尻を露出する', trapVariant: 'text' },
  {
    name: 'お願いの罠',
    description: '「私のお尻を打ってください」と大声でお願いする',
    trapVariant: 'text',
  },
  {
    name: '全員の罠',
    description: '全員が一列に並び、罠を踏んだ人が順番に平手で全員のお尻を3回打つ',
    trapVariant: 'all_players',
  },
  {
    name: '全員じゃんけん',
    description: '全員で反射神経テスト。一番早い人が1回罰を免除',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: '神経衰弱',
    description: '3つの絵柄の順番を覚える。失敗した人は次の罰が倍になる',
    trapVariant: 'mini_game_memory',
  },
]

const JA_PARTY_QA_QUESTIONS = {
  warmup: [
    'あなたのセーフワードは？',
    '一番好きな道具は何？',
    '初めてSP（スパンキング）を知ったのはいつ？',
    '打たれている時に声を出す？',
    '痛みと未知の恐怖、どっちが怖い？',
    '耐えられる道具の限界は？',
    'ずっと試してみたかった姿勢はある？',
    '罰を待っている時と打たれている時、どっちが苦痛？',
  ],
  heating: [
    '一番印象に残っている罰の経験を教えて',
    '絶対に受け入れられないプレイはある？',
    'お尻を打たれて泣いたことはある？それはどんな状況？',
    '立たされたり跪かされたりしたことはある？どんな気分だった？',
    'アフターケアは普段どれくらい必要？',
    '途中でセーフワードを使おうと思った瞬間はある？',
    'お仕置きの前の「お説教」は必要だと思う？',
  ],
  finale: [
    'もし選べるなら、打つ方と打たれる方どっちがいい？',
    '理想のSP関係はどんな感じ？',
    'SPを日常生活の一部にしたい？',
    'パートナーのために妥協できる最大のラインは？',
    '純粋な痛みと儀式感、どっちを重視する？',
    '脳内で一番多く妄想したシチュエーションを教えて',
  ],
} as const

const JA_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    '目を閉じて、誰かに任意の道具で手の甲を軽く触ってもらい、道具を当てる',
    '打たれて痛い時の表情を真似て、10秒間キープ',
    '左側の人に30秒間肩もみをする',
    '一番厳しい口調で右側の人に「ここに来てお仕置きを受けなさい！」と言う',
    '立って標準的なお仕置きの姿勢を実演し、15秒間キープ',
  ],
  heating: [
    '右側の人に次のターンの罰の姿勢を指定してもらう',
    '目を閉じて手のひらを出し、誰かに3回打ってもらい、誰が打ったか当てる',
    '誰か1人を選んで、30秒間見つめ合う（笑ってはいけない）',
    'みんなが満足するまで許しを乞う演技をする',
    '右側の人と盤上の位置を交換する',
  ],
  finale: [
    '全員で一番痛みに耐えた人を投票で選ぶ',
    '誰か1人を選んで、好きな道具で手の甲を軽く5回打つ',
    '正式に罰を請う：どの道具でどこを打たれたいか大声で言う',
    '手のひらを出し、左側の人に3回打たれる（避けてはいけない）',
    '現実で体験したい罰のシチュエーションを語り、今すぐ実行するか全員で投票する',
  ],
} as const

const JA_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(JA_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(JA_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(JA_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const KO_STANDARD_TOOLS = {
  손바닥: { intensity: 2, ratio: 8 },
  자: { intensity: 3, ratio: 8 },
  나무판자: { intensity: 5, ratio: 8 },
  회초리: { intensity: 7, ratio: 8 },
  계척: { intensity: 5, ratio: 8 },
  '빨간 스팽커': { intensity: 7, ratio: 8 },
  '초록 스팽커': { intensity: 7, ratio: 8 },
  글루스틱: { intensity: 9, ratio: 6 },
  '충전 케이블': { intensity: 9, ratio: 8 },
  헤어브러시: { intensity: 5, ratio: 8 },
  '가죽 패들': { intensity: 7, ratio: 8 },
  아크릴판: { intensity: 7, ratio: 6 },
} as const

const KO_STANDARD_BODY_PARTS = {
  엉덩이: { sensitivity: 10, ratio: 80 },
  등: { sensitivity: 7, ratio: 5 },
  허벅지: { sensitivity: 5, ratio: 5 },
  '엉덩이 골': { sensitivity: 2, ratio: 5 },
  손바닥: { sensitivity: 2, ratio: 5 },
} as const

const KO_STANDARD_POSITIONS = {
  서있기: { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골', '손바닥'] },
  '벽 짚기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
  '책상에 엎드리기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
  '무릎 잡기': { ratio: 20, compatibleBodyParts: ['엉덩이', '허벅지', '엉덩이 골'] },
  '네발로 엎드리기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
} as const

const KO_STANDARD_TRAPS: TrapAction[] = [
  { name: '엉덩이 노출 함정', description: '5분 동안 엉덩이 노출하기' },
  {
    name: '랜덤 체벌 함정',
    description:
      '이전에 벌을 받은 플레이어가 임의의 도구로 엉덩이를 때림. "제 엉덩이를 때려주세요"라고 큰 소리로 부탁해야 함',
  },
]

const KO_PARTY_TRAPS: TrapAction[] = [
  { name: '엉덩이 노출 함정', description: '5분 동안 엉덩이 노출하기', trapVariant: 'text' },
  {
    name: '체벌 부탁 함정',
    description: '"제 엉덩이를 때려주세요"라고 큰 소리로 부탁해야 함',
    trapVariant: 'text',
  },
  {
    name: '전원 함정',
    description:
      '모두 일렬로 서고, 함정을 밟은 사람이 차례대로 손바닥으로 모두의 엉덩이를 3번씩 때림',
    trapVariant: 'all_players',
  },
  {
    name: '전원 가위바위보',
    description: '모두 반사신경 테스트 참여. 가장 빠른 사람은 체벌 1회 면제',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: '카드 뒤집기',
    description: '3개의 그림 순서를 기억하기. 실패한 사람은 다음 체벌이 두 배가 됨',
    trapVariant: 'mini_game_memory',
  },
]

const KO_PARTY_QA_QUESTIONS = {
  warmup: [
    '당신의 세이프워드는 무엇인가요?',
    '가장 좋아하는 도구는 무엇인가요?',
    '처음 SP를 접한 것은 언제인가요?',
    '맞을 때 소리를 내는 편인가요?',
    '아픔과 미지에 대한 공포 중 어느 것이 더 두렵나요?',
    '견딜 수 있는 도구의 한계는 어디까지인가요?',
    '계속 해보고 싶었지만 아직 못해본 자세가 있나요?',
    '체벌을 기다리는 것과 맞는 것 중 어느 것이 더 괴로운가요?',
  ],
  heating: [
    '가장 기억에 남는 체벌 경험을 설명해주세요',
    '절대 받아들일 수 없는 플레이가 있나요?',
    '엉덩이를 맞고 운 적이 있나요? 어떤 상황이었나요?',
    '벌을 받기 위해 서 있거나 무릎 꿇은 적이 있나요? 기분이 어땠나요?',
    '체벌 후 애프터케어는 보통 얼마나 필요한가요?',
    '도중에 세이프워드를 쓰고 싶었던 순간이 있었나요?',
    '체벌 전 "훈계"가 필요하다고 생각하나요?',
  ],
  finale: [
    '하나만 고를 수 있다면, 때리는 쪽과 맞는 쪽 중 어느 쪽이 좋나요?',
    '당신이 이상적으로 생각하는 SP 관계는 어떤 모습인가요?',
    'SP가 일상의 일부가 되었으면 하나요?',
    '파트너를 위해 타협할 수 있는 최대 한계는 어디까지인가요?',
    '순수한 통각과 의식적인 느낌 중 어느 것을 더 중요하게 생각하나요?',
    '머릿속으로 가장 많이 상상해본 상황을 설명해주세요',
  ],
} as const

const KO_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    '눈을 감고, 누군가 임의의 도구로 손등을 살짝 터치하게 한 후 도구를 맞추기',
    '맞아서 아플 때의 표정을 흉내내고 10초간 유지하기',
    '왼쪽 사람의 어깨를 30초 동안 주물러주기',
    '가장 엄격한 말투로 오른쪽 사람에게 "이리 와서 맞으세요!"라고 말하기',
    '일어나서 표준적인 체벌 자세를 시연하고 15초간 유지하기',
  ],
  heating: [
    '오른쪽 사람에게 다음 턴의 체벌 자세를 지정해달라고 하기',
    '눈을 감고 손바닥을 내밀면, 누군가 3번 때리고 누가 때렸는지 맞추기',
    '한 사람을 선택해서 30초 동안 눈을 맞추기 (웃으면 안 됨)',
    '모두가 만족할 때까지 용서를 구하는 연기하기',
    '오른쪽 사람과 보드판의 위치를 바꾸기',
  ],
  finale: [
    '모두 투표로 이번 게임에서 가장 고통을 잘 참은 사람 뽑기',
    '한 사람을 선택해서, 가장 좋아하는 도구로 손등을 살짝 5번 때리기',
    '정식으로 체벌 요청하기: 어떤 도구로 어디를 맞고 싶은지 큰 소리로 말하기',
    '손바닥을 내밀고 왼쪽 사람에게 3번 맞기 (피하면 안 됨)',
    '현실에서 경험하고 싶은 체벌 상황을 설명하고, 지금 당장 실행할지 모두 투표하기',
  ],
} as const

const KO_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(KO_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(KO_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(KO_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const JA_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: JA_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: JA_STANDARD_TRAPS,
  partyTraps: JA_PARTY_TRAPS,
  partyQaQuestions: JA_PARTY_QA_QUESTIONS,
  partyDareInstructions: JA_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `プレイヤー${index + 1}`,
}

const KO_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: KO_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: KO_STANDARD_TRAPS,
  partyTraps: KO_PARTY_TRAPS,
  partyQaQuestions: KO_PARTY_QA_QUESTIONS,
  partyDareInstructions: KO_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `플레이어 ${index + 1}`,
}

// --- Spanish (es) ---
const ES_STANDARD_TOOLS = {
  Mano: { intensity: 2, ratio: 8 },
  Regla: { intensity: 3, ratio: 8 },
  'Tabla de madera': { intensity: 5, ratio: 8 },
  'Vara de bambú': { intensity: 7, ratio: 8 },
  Palmeta: { intensity: 5, ratio: 8 },
  'Azote rojo': { intensity: 7, ratio: 8 },
  'Azote verde': { intensity: 7, ratio: 8 },
  'Barra de silicona': { intensity: 9, ratio: 6 },
  Cable: { intensity: 9, ratio: 8 },
  'Cepillo de pelo': { intensity: 5, ratio: 8 },
  'Fusta de cuero': { intensity: 7, ratio: 8 },
  'Placa acrílica': { intensity: 7, ratio: 6 },
} as const

const ES_STANDARD_BODY_PARTS = {
  Trasero: { sensitivity: 10, ratio: 80 },
  Espalda: { sensitivity: 7, ratio: 5 },
  Muslos: { sensitivity: 5, ratio: 5 },
  Hendidura: { sensitivity: 2, ratio: 5 },
  Palmas: { sensitivity: 2, ratio: 5 },
} as const

const ES_STANDARD_POSITIONS = {
  'De pie': {
    ratio: 20,
    compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura', 'Palmas'],
  },
  'Apoyado en pared': {
    ratio: 20,
    compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'],
  },
  'Sobre la mesa': {
    ratio: 20,
    compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'],
  },
  'Sujetando rodillas': { ratio: 20, compatibleBodyParts: ['Trasero', 'Muslos', 'Hendidura'] },
  'A gatas': { ratio: 20, compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'] },
} as const

const ES_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Trampa de exposición', description: 'Exponer el trasero por 5 minutos' },
  {
    name: 'Trampa de castigo',
    description:
      'El jugador anterior te castiga con cualquier herramienta. Debes pedirlo en voz alta.',
  },
]

const ES_PARTY_TRAPS: TrapAction[] = [
  {
    name: 'Trampa de exposición',
    description: 'Exponer el trasero por 5 minutos',
    trapVariant: 'text',
  },
  { name: 'Trampa de ruego', description: 'Pedir el castigo en voz alta', trapVariant: 'text' },
  {
    name: 'Trampa grupal',
    description: 'El que activó la trampa da 3 palmadas a todos',
    trapVariant: 'all_players',
  },
  {
    name: 'Prueba de reflejos',
    description: 'El más rápido se libra de un castigo',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: 'Memoria',
    description: 'Recuerda las 3 cartas. Si fallas, doble castigo',
    trapVariant: 'mini_game_memory',
  },
]

const ES_PARTY_QA_QUESTIONS = {
  warmup: [
    '¿Cuál es tu palabra de seguridad?',
    '¿Cuál es tu herramienta favorita?',
    '¿Cuándo conociste el SP?',
    '¿Haces ruido al ser castigado?',
    '¿Qué duele más, la anticipación o el golpe?',
    '¿Límite de intensidad?',
    '¿Posición que deseas probar?',
    '¿Ansiedad de espera o dolor?',
  ],
  heating: [
    'Describe tu castigo más memorable',
    '¿Qué no aceptarías jamás?',
    '¿Has llorado en una sesión?',
    '¿Has sido castigado de pie o de rodillas?',
    '¿Cuánto aftercare necesitas?',
    '¿Has pensado en usar tu palabra de seguridad?',
    '¿Son necesarios los regaños previos?',
  ],
  finale: [
    '¿Prefieres dar o recibir?',
    '¿Tu relación SP ideal?',
    '¿SP cotidiano?',
    '¿Límite máximo por tu pareja?',
    '¿Dolor puro o ritual?',
    'Describe tu fantasía favorita',
  ],
} as const

const ES_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Adivina la herramienta con los ojos cerrados',
    'Finge expresión de dolor 10 seg',
    'Masaje de 30 seg al de tu izquierda',
    'Exige castigo al de tu derecha',
    'Muestra posición de castigo 15 seg',
  ],
  heating: [
    'El de tu derecha elige tu posición',
    'Adivina quién te dio 3 palmadas',
    'Mira a alguien 30 seg sin reír',
    'Ruega por perdón',
    'Cambia posición en el tablero con el de tu derecha',
  ],
  finale: [
    'Voten quién resistió mejor',
    'Dale 5 golpes suaves al de tu elección',
    'Pide un castigo formalmente',
    'Recibe 3 palmadas del de tu izquierda sin moverte',
    'Cuenta tu fantasía y voten si hacerla ahora',
  ],
} as const

const ES_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(ES_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(ES_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(ES_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// --- French (fr) ---
const FR_STANDARD_TOOLS = {
  Main: { intensity: 2, ratio: 8 },
  Règle: { intensity: 3, ratio: 8 },
  Planche: { intensity: 5, ratio: 8 },
  Canne: { intensity: 7, ratio: 8 },
  Martinet: { intensity: 5, ratio: 8 },
  'Fouet rouge': { intensity: 7, ratio: 8 },
  'Fouet vert': { intensity: 7, ratio: 8 },
  'Bâton de colle': { intensity: 9, ratio: 6 },
  Câble: { intensity: 9, ratio: 8 },
  Brosse: { intensity: 5, ratio: 8 },
  Cravache: { intensity: 7, ratio: 8 },
  Acrylique: { intensity: 7, ratio: 6 },
} as const

const FR_STANDARD_BODY_PARTS = {
  Fesses: { sensitivity: 10, ratio: 80 },
  Dos: { sensitivity: 7, ratio: 5 },
  Cuisses: { sensitivity: 5, ratio: 5 },
  Sillon: { sensitivity: 2, ratio: 5 },
  Paumes: { sensitivity: 2, ratio: 5 },
} as const

const FR_STANDARD_POSITIONS = {
  Debout: { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon', 'Paumes'] },
  'Au mur': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
  'Sur la table': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
  'Attrape-genoux': { ratio: 20, compatibleBodyParts: ['Fesses', 'Cuisses', 'Sillon'] },
  'À quatre pattes': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
} as const

const FR_STANDARD_TRAPS: TrapAction[] = [
  { name: "Piège d'exposition", description: 'Exposer ses fesses 5 min' },
  {
    name: 'Punition surprise',
    description: 'Demander à voix haute une punition au joueur précédent.',
  },
]

const FR_PARTY_TRAPS: TrapAction[] = [
  { name: "Piège d'exposition", description: 'Exposer ses fesses 5 min', trapVariant: 'text' },
  {
    name: 'Demande de punition',
    description: 'Demander une punition à voix haute',
    trapVariant: 'text',
  },
  {
    name: 'Piège de groupe',
    description: 'Donner 3 fessées à tout le monde',
    trapVariant: 'all_players',
  },
  {
    name: 'Test de réflexes',
    description: 'Le plus rapide évite une punition',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: 'Mémoire',
    description: 'Échouer double la prochaine punition',
    trapVariant: 'mini_game_memory',
  },
]

const FR_PARTY_QA_QUESTIONS = {
  warmup: [
    'Safeword ?',
    'Outil préféré ?',
    'Première découverte du SP ?',
    'Fais-tu du bruit ?',
    'Peur ou douleur ?',
    'Limite max ?',
    'Position à essayer ?',
    'Attente ou action ?',
  ],
  heating: [
    'Pire/meilleure punition ?',
    'Limite stricte ?',
    'Déjà pleuré ?',
    'Au coin ?',
    "Temps d'aftercare ?",
    'Pensé au safeword ?',
    'Sermon utile ?',
  ],
  finale: [
    'Donner ou recevoir ?',
    'Relation idéale ?',
    'SP au quotidien ?',
    'Gros sacrifice ?',
    'Douleur vs Rituel ?',
    'Fantasme ultime ?',
  ],
} as const

const FR_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    "Deviner l'outil à l'aveugle",
    'Mimer la douleur 10s',
    'Masser qqn 30s',
    'Ordonner une punition',
    'Tenir une position 15s',
  ],
  heating: [
    'Le voisin choisit ta position',
    'Deviner qui a frappé',
    'Regarder sans rire 30s',
    'Supplier le pardon',
    'Échanger sa place',
  ],
  finale: [
    'Voter le plus résistant',
    'Frapper qqn doucement 5 fois',
    'Demander formellement',
    'Prendre 3 coups sans bouger',
    'Raconter un fantasme à réaliser',
  ],
} as const

const FR_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(FR_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(FR_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(FR_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// --- German (de) ---
const DE_STANDARD_TOOLS = {
  Hand: { intensity: 2, ratio: 8 },
  Lineal: { intensity: 3, ratio: 8 },
  Holzbrett: { intensity: 5, ratio: 8 },
  Rohrstock: { intensity: 7, ratio: 8 },
  Tatzenstecken: { intensity: 5, ratio: 8 },
  'Rote Peitsche': { intensity: 7, ratio: 8 },
  'Grüne Peitsche': { intensity: 7, ratio: 8 },
  Heißklebestick: { intensity: 9, ratio: 6 },
  Kabel: { intensity: 9, ratio: 8 },
  Haarbürste: { intensity: 5, ratio: 8 },
  Lederpaddel: { intensity: 7, ratio: 8 },
  Acrylglas: { intensity: 7, ratio: 6 },
} as const

const DE_STANDARD_BODY_PARTS = {
  Hintern: { sensitivity: 10, ratio: 80 },
  Rücken: { sensitivity: 7, ratio: 5 },
  Oberschenkel: { sensitivity: 5, ratio: 5 },
  Spalte: { sensitivity: 2, ratio: 5 },
  Handflächen: { sensitivity: 2, ratio: 5 },
} as const

const DE_STANDARD_POSITIONS = {
  Stehend: {
    ratio: 20,
    compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte', 'Handflächen'],
  },
  'An der Wand': {
    ratio: 20,
    compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'],
  },
  'Auf dem Tisch': {
    ratio: 20,
    compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'],
  },
  'Knie festhalten': { ratio: 20, compatibleBodyParts: ['Hintern', 'Oberschenkel', 'Spalte'] },
  Vierfüßler: { ratio: 20, compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'] },
} as const

const DE_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Expositionsfalle', description: '5 Minuten den Hintern entblößen' },
  { name: 'Zufallsstrafe', description: 'Bitte laut um eine Strafe vom vorherigen Spieler.' },
]

const DE_PARTY_TRAPS: TrapAction[] = [
  { name: 'Expositionsfalle', description: '5 Minuten den Hintern entblößen', trapVariant: 'text' },
  { name: 'Bitte um Strafe', description: 'Laut um Strafe bitten', trapVariant: 'text' },
  { name: 'Gruppenfalle', description: 'Gib jedem 3 Schläge', trapVariant: 'all_players' },
  {
    name: 'Reaktionstest',
    description: 'Der Schnellste vermeidet Strafe',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: 'Gedächtnis',
    description: 'Bei Fehler doppelte Strafe',
    trapVariant: 'mini_game_memory',
  },
]

const DE_PARTY_QA_QUESTIONS = {
  warmup: [
    'Safeword?',
    'Lieblingswerkzeug?',
    'Erstes Mal SP?',
    'Machst du Geräusche?',
    'Schmerz oder Angst?',
    'Max. Limit?',
    'Neue Position?',
    'Warten oder Schmerz?',
  ],
  heating: [
    'Erinnerung?',
    'Absolutes No-Go?',
    'Schon mal geweint?',
    'In der Ecke gestanden?',
    'Wie viel Aftercare?',
    'An Safeword gedacht?',
    'Vorherige Predigt?',
  ],
  finale: [
    'Geben oder Nehmen?',
    'Ideale SP-Beziehung?',
    'SP im Alltag?',
    'Größter Kompromiss?',
    'Schmerz oder Ritual?',
    'Größte Fantasie?',
  ],
} as const

const DE_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Werkzeug blind erraten',
    'Schmerzgesicht 10s mimen',
    'Jemanden 30s massieren',
    'Strafe anordnen',
    'Position 15s halten',
  ],
  heating: [
    'Nachbar wählt Position',
    'Rate, wer geschlagen hat',
    '30s Augenkontakt ohne Lachen',
    'Um Gnade betteln',
    'Platz tauschen',
  ],
  finale: [
    'Härtester Spieler Wahl',
    'Jemandem 5 leichte Schläge geben',
    'Offiziell um Strafe bitten',
    '3 Schläge ohne Zucken',
    'Fantasie erzählen & abstimmen',
  ],
} as const

const DE_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(DE_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(DE_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(DE_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// --- Russian (ru) ---
const RU_STANDARD_TOOLS = {
  Ладонь: { intensity: 2, ratio: 8 },
  Линейка: { intensity: 3, ratio: 8 },
  Доска: { intensity: 5, ratio: 8 },
  Трость: { intensity: 7, ratio: 8 },
  Указка: { intensity: 5, ratio: 8 },
  'Красный кнут': { intensity: 7, ratio: 8 },
  'Зеленый кнут': { intensity: 7, ratio: 8 },
  'Клеевой стержень': { intensity: 9, ratio: 6 },
  Кабель: { intensity: 9, ratio: 8 },
  Щетка: { intensity: 5, ratio: 8 },
  Плетка: { intensity: 7, ratio: 8 },
  Акрил: { intensity: 7, ratio: 6 },
} as const

const RU_STANDARD_BODY_PARTS = {
  Ягодицы: { sensitivity: 10, ratio: 80 },
  Спина: { sensitivity: 7, ratio: 5 },
  Бедра: { sensitivity: 5, ratio: 5 },
  Ложбинка: { sensitivity: 2, ratio: 5 },
  Ладони: { sensitivity: 2, ratio: 5 },
} as const

const RU_STANDARD_POSITIONS = {
  Стоя: { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка', 'Ладони'] },
  'У стены': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
  'На столе': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
  'Держа колени': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Бедра', 'Ложбинка'] },
  'На четвереньках': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
} as const

const RU_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Ловушка показа', description: 'Оголить ягодицы на 5 минут' },
  { name: 'Случайное наказание', description: 'Громко попросить наказание у предыдущего игрока.' },
]

const RU_PARTY_TRAPS: TrapAction[] = [
  { name: 'Ловушка показа', description: 'Оголить ягодицы на 5 минут', trapVariant: 'text' },
  { name: 'Просьба наказания', description: 'Громко попросить наказание', trapVariant: 'text' },
  {
    name: 'Групповая ловушка',
    description: 'Дать каждому по 3 шлепка',
    trapVariant: 'all_players',
  },
  {
    name: 'Тест реакции',
    description: 'Самый быстрый избегает наказания',
    trapVariant: 'mini_game_reaction',
  },
  { name: 'Память', description: 'Ошибка удваивает наказание', trapVariant: 'mini_game_memory' },
]

const RU_PARTY_QA_QUESTIONS = {
  warmup: [
    'Стоп-слово?',
    'Любимый инструмент?',
    'Первый опыт SP?',
    'Издаешь звуки?',
    'Боль или ожидание?',
    'Максимум?',
    'Новая поза?',
    'Ожидание или боль?',
  ],
  heating: [
    'Лучшее воспоминание?',
    'Табу?',
    'Плакал(а)?',
    'Стоял(а) в углу?',
    'Афтеркеа?',
    'Думал(а) о стоп-слове?',
    'Нужна ли лекция?',
  ],
  finale: [
    'Давать или получать?',
    'Идеальные отношения?',
    'SP каждый день?',
    'Компромисс?',
    'Боль или ритуал?',
    'Главная фантазия?',
  ],
} as const

const RU_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Угадай инструмент вслепую',
    'Изобрази боль 10 сек',
    'Массаж 30 сек',
    'Прикажи наказать',
    'Держи позу 15 сек',
  ],
  heating: [
    'Сосед выбирает позу',
    'Угадай, кто ударил',
    '30 сек зрительного контакта',
    'Моли о пощаде',
    'Поменяйся местами',
  ],
  finale: [
    'Выбор самого стойкого',
    'Дать кому-то 5 шлепков',
    'Официально попросить наказание',
    '3 удара без движений',
    'Рассказать фантазию',
  ],
} as const

const RU_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(RU_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(RU_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(RU_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// --- Portuguese (pt) ---
const PT_STANDARD_TOOLS = {
  Mão: { intensity: 2, ratio: 8 },
  Régua: { intensity: 3, ratio: 8 },
  Tábua: { intensity: 5, ratio: 8 },
  Vara: { intensity: 7, ratio: 8 },
  Palmatória: { intensity: 5, ratio: 8 },
  'Chicote vermelho': { intensity: 7, ratio: 8 },
  'Chicote verde': { intensity: 7, ratio: 8 },
  'Cola quente': { intensity: 9, ratio: 6 },
  Cabo: { intensity: 9, ratio: 8 },
  Escova: { intensity: 5, ratio: 8 },
  'Palmatória de couro': { intensity: 7, ratio: 8 },
  Acrílico: { intensity: 7, ratio: 6 },
} as const

const PT_STANDARD_BODY_PARTS = {
  Bumbum: { sensitivity: 10, ratio: 80 },
  Costas: { sensitivity: 7, ratio: 5 },
  Coxas: { sensitivity: 5, ratio: 5 },
  Fenda: { sensitivity: 2, ratio: 5 },
  Palmas: { sensitivity: 2, ratio: 5 },
} as const

const PT_STANDARD_POSITIONS = {
  'Em pé': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda', 'Palmas'] },
  'Na parede': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
  'Na mesa': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
  'Segurando joelhos': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Coxas', 'Fenda'] },
  'De quatro': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
} as const

const PT_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Armadilha de exposição', description: 'Expor o bumbum por 5 min' },
  { name: 'Punição surpresa', description: 'Pedir punição ao jogador anterior em voz alta.' },
]

const PT_PARTY_TRAPS: TrapAction[] = [
  { name: 'Armadilha de exposição', description: 'Expor o bumbum por 5 min', trapVariant: 'text' },
  { name: 'Pedido de punição', description: 'Pedir punição em voz alta', trapVariant: 'text' },
  {
    name: 'Armadilha em grupo',
    description: 'Dar 3 palmadas em todos',
    trapVariant: 'all_players',
  },
  {
    name: 'Teste de reflexo',
    description: 'O mais rápido evita punição',
    trapVariant: 'mini_game_reaction',
  },
  { name: 'Memória', description: 'Errar dobra a punição', trapVariant: 'mini_game_memory' },
]

const PT_PARTY_QA_QUESTIONS = {
  warmup: [
    'Safeword?',
    'Ferramenta favorita?',
    'Primeira vez no SP?',
    'Faz barulho?',
    'Medo ou dor?',
    'Limite?',
    'Nova posição?',
    'Esperar ou apanhar?',
  ],
  heating: [
    'Melhor lembrança?',
    'Não aceita nunca?',
    'Já chorou?',
    'De castigo?',
    'Tempo de aftercare?',
    'Pensou no safeword?',
    'Sermão ajuda?',
  ],
  finale: [
    'Dar ou receber?',
    'Relação ideal?',
    'SP todo dia?',
    'Maior sacrifício?',
    'Dor ou ritual?',
    'Fantasia favorita?',
  ],
} as const

const PT_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Adivinhar ferramenta',
    'Fingir dor 10s',
    'Massagem 30s',
    'Ordenar punição',
    'Manter posição 15s',
  ],
  heating: [
    'Vizinho escolhe posição',
    'Adivinhar quem bateu',
    'Olhar 30s sem rir',
    'Implorar perdão',
    'Trocar de lugar',
  ],
  finale: [
    'Votar no mais resistente',
    'Dar 5 palmadas leves',
    'Pedir punição formalmente',
    '3 golpes sem se mover',
    'Contar fantasia para votação',
  ],
} as const

const PT_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(PT_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(PT_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(PT_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// --- Italian (it) ---
const IT_STANDARD_TOOLS = {
  Mano: { intensity: 2, ratio: 8 },
  Righello: { intensity: 3, ratio: 8 },
  Tavola: { intensity: 5, ratio: 8 },
  Canna: { intensity: 7, ratio: 8 },
  Bacchetta: { intensity: 5, ratio: 8 },
  'Frusta rossa': { intensity: 7, ratio: 8 },
  'Frusta verde': { intensity: 7, ratio: 8 },
  'Colla a caldo': { intensity: 9, ratio: 6 },
  Cavo: { intensity: 9, ratio: 8 },
  Spazzola: { intensity: 5, ratio: 8 },
  Scudiscio: { intensity: 7, ratio: 8 },
  Acrilico: { intensity: 7, ratio: 6 },
} as const

const IT_STANDARD_BODY_PARTS = {
  Sedera: { sensitivity: 10, ratio: 80 },
  Schiena: { sensitivity: 7, ratio: 5 },
  Cosce: { sensitivity: 5, ratio: 5 },
  Fessura: { sensitivity: 2, ratio: 5 },
  Palmi: { sensitivity: 2, ratio: 5 },
} as const

const IT_STANDARD_POSITIONS = {
  'In piedi': {
    ratio: 20,
    compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura', 'Palmi'],
  },
  'Al muro': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
  'Sul tavolo': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
  'Tenendo ginocchia': { ratio: 20, compatibleBodyParts: ['Sedera', 'Cosce', 'Fessura'] },
  'A carponi': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
} as const

const IT_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Trappola esposizione', description: 'Esporre il sedere per 5 min' },
  {
    name: 'Punizione a sorpresa',
    description: 'Chiedi ad alta voce una punizione al giocatore precedente.',
  },
]

const IT_PARTY_TRAPS: TrapAction[] = [
  { name: 'Trappola esposizione', description: 'Esporre il sedere per 5 min', trapVariant: 'text' },
  {
    name: 'Richiesta di punizione',
    description: 'Chiedi una punizione ad alta voce',
    trapVariant: 'text',
  },
  {
    name: 'Trappola di gruppo',
    description: 'Dai 3 sculacciate a tutti',
    trapVariant: 'all_players',
  },
  {
    name: 'Test di riflessi',
    description: 'Il più veloce evita la punizione',
    trapVariant: 'mini_game_reaction',
  },
  {
    name: 'Memoria',
    description: 'Sbagliare raddoppia la punizione',
    trapVariant: 'mini_game_memory',
  },
]

const IT_PARTY_QA_QUESTIONS = {
  warmup: [
    'Safeword?',
    'Strumento preferito?',
    'Prima volta in SP?',
    'Fai rumore?',
    'Paura o dolore?',
    'Limite?',
    'Nuova posizione?',
    'Aspettare o dolore?',
  ],
  heating: [
    'Miglior ricordo?',
    'Mai accettato?',
    'Hai pianto?',
    'In castigo?',
    'Tempo di aftercare?',
    'Pensato al safeword?',
    'Discorsetto utile?',
  ],
  finale: [
    'Dare o ricevere?',
    'Relazione ideale?',
    'SP tutti i giorni?',
    'Miglior compromesso?',
    'Dolore o rito?',
    'Fantasia preferita?',
  ],
} as const

const IT_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    'Indovina strumento alla cieca',
    'Mima dolore 10s',
    'Massaggio 30s',
    'Ordina punizione',
    'Tieni posizione 15s',
  ],
  heating: [
    'Il vicino sceglie la posizione',
    'Indovina chi ha colpito',
    'Guarda 30s senza ridere',
    'Implora perdono',
    'Scambia posto',
  ],
  finale: [
    'Vota il più resistente',
    'Dai 5 colpi leggeri',
    'Chiedi punizione formalmente',
    '3 colpi senza muoverti',
    'Racconta fantasia per votazione',
  ],
} as const

const IT_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(IT_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(IT_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(IT_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

// Locale contents
const ES_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: ES_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: ES_STANDARD_TRAPS,
  partyTraps: ES_PARTY_TRAPS,
  partyQaQuestions: ES_PARTY_QA_QUESTIONS,
  partyDareInstructions: ES_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Jugador ${index + 1}`,
}

const FR_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: FR_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: FR_STANDARD_TRAPS,
  partyTraps: FR_PARTY_TRAPS,
  partyQaQuestions: FR_PARTY_QA_QUESTIONS,
  partyDareInstructions: FR_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Joueur ${index + 1}`,
}

const DE_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: DE_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: DE_STANDARD_TRAPS,
  partyTraps: DE_PARTY_TRAPS,
  partyQaQuestions: DE_PARTY_QA_QUESTIONS,
  partyDareInstructions: DE_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Spieler ${index + 1}`,
}

const RU_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: RU_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: RU_STANDARD_TRAPS,
  partyTraps: RU_PARTY_TRAPS,
  partyQaQuestions: RU_PARTY_QA_QUESTIONS,
  partyDareInstructions: RU_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Игрок ${index + 1}`,
}

const PT_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: PT_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: PT_STANDARD_TRAPS,
  partyTraps: PT_PARTY_TRAPS,
  partyQaQuestions: PT_PARTY_QA_QUESTIONS,
  partyDareInstructions: PT_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Jogador ${index + 1}`,
}

const IT_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: IT_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: IT_STANDARD_TRAPS,
  partyTraps: IT_PARTY_TRAPS,
  partyQaQuestions: IT_PARTY_QA_QUESTIONS,
  partyDareInstructions: IT_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => `Giocatore ${index + 1}`,
}

/**
 * Returns the appropriate locale content for the given BCP-47 language tag
 * (e.g. navigator.language). Falls back to English for any non-Chinese locale.
 */
export function getLocaleContent(language: string): LocaleContent {
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return ZH_LOCALE_CONTENT
  if (normalized.startsWith('ja')) return JA_LOCALE_CONTENT
  if (normalized.startsWith('ko')) return KO_LOCALE_CONTENT
  if (normalized.startsWith('es')) return ES_LOCALE_CONTENT
  if (normalized.startsWith('fr')) return FR_LOCALE_CONTENT
  if (normalized.startsWith('de')) return DE_LOCALE_CONTENT
  if (normalized.startsWith('ru')) return RU_LOCALE_CONTENT
  if (normalized.startsWith('pt')) return PT_LOCALE_CONTENT
  if (normalized.startsWith('it')) return IT_LOCALE_CONTENT
  return EN_LOCALE_CONTENT
}

export { EN_STANDARD_TOOLS, EN_STANDARD_BODY_PARTS, EN_STANDARD_POSITIONS }
