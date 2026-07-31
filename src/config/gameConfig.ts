// 游戏配置文件
export const GAME_CONFIG = {
  // 棋盘配置
  BOARD: {
    SIZE: 40, // 40格
    GRID_SIZE: { rows: 5, cols: 8 }, // 5行8列的蛇形布局
  },

  // 骰子配置
  DICE: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    ANIMATION_DURATION: 3000, // 动画持续时间(ms) - 增加到3秒
  },

  // 玩家配置
  PLAYERS: {
    DEFAULT_COUNT: 1, // 改为1个玩家，轮流进行
    COLORS: ['#ff6b6b'],
    NAMES: ['玩家'],
  },

  // 动画配置
  ANIMATION: {
    MOVE_DURATION: 500, // 移动动画持续时间(ms)
    EFFECT_DISPLAY_DURATION: 2000, // 效果显示持续时间(ms)
  },

  // 默认惩罚工具
  DEFAULT_TOOLS: {
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
  },

  // 默认身体部位
  DEFAULT_BODY_PARTS: {
    屁股: { sensitivity: 10, ratio: 80 }, // 耐受性最高，任何工具都可以
    后背: { sensitivity: 7, ratio: 5 }, // 中等耐受性
    大腿: { sensitivity: 5, ratio: 5 }, // 中等耐受性
    臀缝: { sensitivity: 2, ratio: 5 }, // 最敏感，只能用手掌
    手心: { sensitivity: 2, ratio: 5 }, // 最敏感，只能用手掌
  },

  // 默认受罚姿势
  DEFAULT_POSITIONS: {
    站立: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝', '手心'] },
    手扶墙: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
    趴在桌子上: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
    手抓膝盖: { ratio: 20, compatibleBodyParts: ['屁股', '大腿', '臀缝'] },
    跪趴: { ratio: 20, compatibleBodyParts: ['屁股', '后背', '大腿', '臀缝'] },
  },

  // 惩罚格子配置 - 增加更多惩罚格子
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

  // 动态惩罚格子配置 - 调整位置避免冲突
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

  // 奖励格子配置 - 前进格子，最多3步
  BONUS_CELLS: {
    5: { type: 'move', value: 2, description: '前进2步' },
    25: { type: 'move', value: 3, description: '前进3步' },
  },

  // 后退格子配置
  REVERSE_CELLS: {
    8: { type: 'reverse', value: 2, description: '后退2步' },
    18: { type: 'reverse', value: 3, description: '后退3步' },
  },

  // 休息格子配置
  REST_CELLS: {
    12: { type: 'rest', value: 1, description: '休息一回合' },
    32: { type: 'rest', value: 1, description: '休息一回合' },
  },

  // 回到起点格子配置
  RESTART_CELLS: {
    10: { description: '回到起点' },
    20: { description: '回到起点' },
    30: { description: '回到起点' },
  },

  // 默认比例设置
  DEFAULT_RATIOS: {
    bodyPartRatio: 60, // 部位比例60%
    toolRatio: 25, // 工具比例25%
    positionRatio: 15, // 姿势比例15%
  },

  // 默认惩罚数量配置
  DEFAULT_PUNISHMENT_STRIKES: {
    min: 10, // 最小惩罚次数
    max: 30, // 最大惩罚次数
    step: 5, // 调整步长
  },

  // 翻倍陷阱默认概率（0-100）
  DEFAULT_DOUBLE_PUNISHMENT_CHANCE: 20,

  // 默认棋盘配置
  DEFAULT_BOARD_CONFIG: {
    punishmentCells: 26, // 惩罚格子数量
    chainPunishmentCells: 2, // 连锁惩罚格子数量
    bonusCells: 1, // 前进格子数量（2.5% × 40 = 1）
    reverseCells: 2, // 后退格子数量（5% × 40 = 2）
    restCells: 1, // 休息格子数量（2.5% × 40 = 1）
    restartCells: 4, // 回到起点格子数量（10% × 40 = 4）
    trapCells: 2, // 机关格子数量（5% × 40 = 2）
    totalCells: 40, // 总格子数量
  },

  // 默认机关配置
  DEFAULT_TRAPS: {
    晾臀机关: {
      description: '晾臀5分钟',
    },
    随机惩罚机关: {
      description:
        '由上一个被惩罚的玩家使用任意工具惩罚屁股，必须自己请罚，大声说出"请xxx打我的屁股"',
    },
  },

  // --- 升温局专属配置 ---

  PARTY_BOARD_CONFIG: {
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
  },

  PARTY_ACT_CONSTRAINTS: {
    warmup: { maxToolIntensity: 3, minStrikes: 5, maxStrikes: 15, doublePunishmentChance: 0 },
    heating: { maxToolIntensity: 7, minStrikes: 10, maxStrikes: 25, doublePunishmentChance: 15 },
    finale: { maxToolIntensity: 10, minStrikes: 15, maxStrikes: 30, doublePunishmentChance: 25 },
  } as const,

  PARTY_QA_QUESTIONS: {
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
  },

  PARTY_DARE_INSTRUCTIONS: {
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
  },

  PARTY_TRAPS: [
    { name: '晾臀机关', description: '晾臀5分钟', trapVariant: 'text' as const },
    {
      name: '请罚机关',
      description: '必须自己请罚，大声说出"请打我的屁股"',
      trapVariant: 'text' as const,
    },
    {
      name: '全员机关',
      description: '所有人站成一排，由踩到机关的人依次用手掌打每人屁股 3 下',
      trapVariant: 'all_players' as const,
    },
    {
      name: '全员猜拳',
      description: '所有人参加反应速度测试，最快者获得一次免罚',
      trapVariant: 'mini_game_reaction' as const,
    },
    {
      name: '记忆翻牌',
      description: '记住三张图案的顺序；失败者下一次惩罚加倍',
      trapVariant: 'mini_game_memory' as const,
    },
    {
      name: '快速问答',
      description: '在倒计时内完成题目；超时者下一次惩罚加倍',
      trapVariant: 'mini_game_quiz' as const,
    },
    {
      name: '二选一',
      description: '选择你的命运',
      trapVariant: 'choice' as const,
      choiceA: '用手掌打屁股 15 下',
      choiceB: '保持跪趴姿势 2 分钟',
    },
    {
      name: '高风险二选一',
      description: '选择你的命运',
      trapVariant: 'choice' as const,
      choiceA: '用藤条打屁股 10 下',
      choiceB: '后退 5 格',
    },
    {
      name: '轮盘机关',
      description: '命运轮盘！随机选一名玩家接受惩罚——不一定是你哦',
      trapVariant: 'roulette' as const,
    },
    {
      name: '共难轮盘',
      description: '命运轮盘！随机选一名玩家，和你一起用手掌互打屁股 5 下',
      trapVariant: 'roulette' as const,
    },
  ],

  PARTY_SCENE_PRESETS: {
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
  },
}

// Lucide icon component name mapping for cell types
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

// Legacy emoji mapping (kept for fallback/compatibility)
export const CELL_ICONS: Record<string, string> = {
  punishment: '⚡',
  bonus: '🎁',
  special: '⬅️',
  restart: '🔄',
  trap: '💀',
}

// Cell type color tokens (dark theme)
export const CELL_COLORS: Record<string, { color: string; border: string }> = {
  punishment: {
    color: 'var(--color-punishment)',
    border: 'var(--color-punishment)',
  },
  chain_punishment: {
    color: 'var(--color-chain-punishment)',
    border: 'var(--color-chain-punishment)',
  },
  bonus: {
    color: 'var(--color-bonus)',
    border: 'var(--color-bonus)',
  },
  special: {
    color: 'var(--color-special)',
    border: 'var(--color-special)',
  },
  restart: {
    color: 'var(--color-restart)',
    border: 'var(--color-restart)',
  },
  trap: {
    color: 'var(--color-trap)',
    border: 'var(--color-trap)',
  },
  qa: {
    color: 'var(--color-qa, #3b82f6)',
    border: 'var(--color-qa, #3b82f6)',
  },
  dare: {
    color: 'var(--color-dare, #f59e0b)',
    border: 'var(--color-dare, #f59e0b)',
  },
}
