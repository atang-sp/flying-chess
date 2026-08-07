/**
 * The shared configuration boundary for classic, local Party, and online Party.
 *
 * This module deliberately has no dependency on Vue, localStorage, or the
 * browser application. The room server and the local game both consume the
 * same snapshot/normalization/board-generation functions.
 */

export type ModeId = 'classic' | 'party' | 'online_party'
export type RulesetVersion = 'classic_v1' | 'party_v2'

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
  punishmentConfig?: Partial<PunishmentConfig> & {
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
    rulesetVersion: 'party_v2',
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
    rulesetVersion: 'party_v2',
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

const fitBoardOverlayToCapacity = (
  base: BoardConfig,
  overlay: Partial<BoardConfig>
): BoardConfig => {
  const candidate = { ...base, ...overlay } as BoardConfig
  const isCandidateValid = Boolean(validateBoardConfig(candidate))
  if (isCandidateValid) return candidate

  const fields = numericBoardFields.filter(field => field !== 'totalCells') as Array<
    Exclude<(typeof numericBoardFields)[number], 'totalCells'>
  >
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
      tools: Object.fromEntries(
        Object.entries(snapshot.punishmentConfig.tools).map(([name, tool]) => [
          name,
          { ...tool, ...(punishment.tools?.[name] ?? {}) },
        ])
      ),
      bodyParts: Object.fromEntries(
        Object.entries(snapshot.punishmentConfig.bodyParts).map(([name, bodyPart]) => [
          name,
          { ...bodyPart, ...(punishment.bodyParts?.[name] ?? {}) },
        ])
      ),
      positions: Object.fromEntries(
        Object.entries(snapshot.punishmentConfig.positions).map(([name, position]) => [
          name,
          {
            ...position,
            ...(punishment.positions?.[name] ?? {}),
            compatibleBodyParts: [
              ...(punishment.positions?.[name]?.compatibleBodyParts ??
                position.compatibleBodyParts),
            ],
          },
        ])
      ),
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
    boardConfig: fitBoardOverlayToCapacity(base.boardConfig, policy.boardOverlay),
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

export function validateTrapConfig(value: unknown): value is TrapAction[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      trap =>
        isRecord(trap) &&
        typeof trap.name === 'string' &&
        trap.name.trim().length > 0 &&
        typeof trap.description === 'string' &&
        trap.description.trim().length > 0 &&
        (trap.trapVariant === undefined || isTrapVariant(trap.trapVariant)) &&
        (trap.choiceA === undefined || typeof trap.choiceA === 'string') &&
        (trap.choiceB === undefined || typeof trap.choiceB === 'string')
    )
  )
}

export function normalizeTrapConfig(
  value: unknown,
  fallback: readonly TrapAction[] = STANDARD_TRAPS
): TrapAction[] {
  if (!Array.isArray(value)) return cloneTraps(fallback)
  const normalized = value.flatMap(entry => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      typeof entry.description !== 'string'
    ) {
      return []
    }
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

export function validatePunishmentConfig(value: unknown): value is PunishmentConfig {
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
    Number.isInteger(minStrikes) &&
    Number(minStrikes) >= 1 &&
    Number.isInteger(maxStrikes) &&
    Number(maxStrikes) >= Number(minStrikes) &&
    Number.isInteger(step) &&
    Number(step) >= 1 &&
    Number.isInteger(maxTakeoffFailures) &&
    Number(maxTakeoffFailures) >= 1 &&
    typeof doublePunishmentChance === 'number' &&
    doublePunishmentChance >= 0 &&
    doublePunishmentChance <= 100
  )
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
        : Array.isArray(current.compatibleBodyParts)
          ? [...current.compatibleBodyParts]
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
  const rulesetVersion: RulesetVersion = modeId === 'classic' ? 'classic_v1' : 'party_v2'
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
  return (
    ((value.modeId === 'classic' && value.rulesetVersion === 'classic_v1') ||
      ((value.modeId === 'party' || value.modeId === 'online_party') &&
        value.rulesetVersion === 'party_v2')) &&
    validateBoardConfig(value.boardConfig) &&
    validatePunishmentConfig(value.punishmentConfig) &&
    validateTrapConfig(value.traps) &&
    Array.isArray(value.qaQuestions) &&
    value.qaQuestions.every(entry => typeof entry === 'string') &&
    Array.isArray(value.dareInstructions) &&
    value.dareInstructions.every(entry => typeof entry === 'string') &&
    validConstraints &&
    validStageConstraints &&
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
  choice: entries => {
    if (entries.length === 0) throw new Error('不能从空集合中选择')
    const selected = entries[secureRandomSource.randomInt(0, entries.length - 1)]
    if (selected === undefined) throw new Error('随机选择结果超出集合范围')
    return selected
  },
}

const chooseWeighted = <T extends { ratio: number }>(
  entries: readonly T[],
  random: BoardRandomSource
): T => {
  const enabled = entries.filter(entry => entry.ratio > 0)
  if (enabled.length === 0) throw new Error('没有启用的惩罚配置')
  if (random.weightedChoice) {
    return random.weightedChoice(
      enabled,
      enabled.map(entry => entry.ratio)
    )
  }
  const total = enabled.reduce((sum, entry) => sum + entry.ratio, 0)
  const threshold = random.randomInt(1, Math.max(1, Math.ceil(total)))
  let cumulative = 0
  for (const entry of enabled) {
    cumulative += entry.ratio
    if (threshold <= cumulative) return entry
  }
  const fallback = enabled[enabled.length - 1]
  if (fallback === undefined) throw new Error('没有启用的惩罚配置')
  return fallback
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
  const tool = chooseWeighted(viableTools, random)
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
  const bodyPart = chooseWeighted(viableBodyParts, random)
  const position = chooseWeighted(
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
