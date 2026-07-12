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
export const CELL_COLORS = {
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
}
