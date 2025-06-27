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
  DEFAULT_TOOLS: [
    { id: 'hand', name: '手掌', intensity: 1, ratio: 20 },
    { id: 'ruler', name: '尺子', intensity: 2, ratio: 20 },
    { id: 'wooden_board', name: '木板', intensity: 3, ratio: 20 },
    { id: 'cane', name: '藤条', intensity: 4, ratio: 20 },
    { id: 'paddle', name: '拍子', intensity: 5, ratio: 20 },
  ],

  // 默认身体部位
  DEFAULT_BODY_PARTS: [
    { id: 'butt', name: '屁股', sensitivity: 5, ratio: 80 }, // 耐受性最高，任何工具都可以
    { id: 'thighs', name: '大腿', sensitivity: 3, ratio: 12 }, // 中等耐受性
    { id: 'hands', name: '手心', sensitivity: 1, ratio: 8 }, // 最敏感，只能用手掌
  ],

  // 默认受罚姿势
  DEFAULT_POSITIONS: [
    { id: 'standing', name: '站立', difficulty: 1, ratio: 20 },
    { id: 'wall_lean', name: '手扶墙', difficulty: 2, ratio: 20 },
    { id: 'table_lean', name: '趴在桌子上', difficulty: 3, ratio: 20 },
    { id: 'knee_grab', name: '手抓膝盖', difficulty: 4, ratio: 20 },
    { id: 'kneeling', name: '跪趴', difficulty: 5, ratio: 20 },
  ],

  // 惩罚格子配置 - 增加更多惩罚格子
  PUNISHMENT_CELLS: {
    3: { tool: 'hand', bodyPart: 'hands', position: 'standing' },
    7: { tool: 'ruler', bodyPart: 'thighs', position: 'wall_lean' },
    9: { tool: 'hand', bodyPart: 'butt', position: 'standing' },
    11: { tool: 'wooden_board', bodyPart: 'thighs', position: 'table_lean' },
    15: { tool: 'cane', bodyPart: 'butt', position: 'knee_grab' },
    17: { tool: 'ruler', bodyPart: 'hands', position: 'wall_lean' },
    19: { tool: 'paddle', bodyPart: 'butt', position: 'kneeling' },
    21: { tool: 'hand', bodyPart: 'thighs', position: 'standing' },
    23: { tool: 'wooden_board', bodyPart: 'thighs', position: 'table_lean' },
    25: { tool: 'cane', bodyPart: 'butt', position: 'kneeling' },
    27: { tool: 'ruler', bodyPart: 'hands', position: 'table_lean' },
    29: { tool: 'paddle', bodyPart: 'thighs', position: 'knee_grab' },
    31: { tool: 'hand', bodyPart: 'hands', position: 'standing' },
    33: { tool: 'wooden_board', bodyPart: 'butt', position: 'wall_lean' },
    35: { tool: 'ruler', bodyPart: 'thighs', position: 'wall_lean' },
    37: { tool: 'cane', bodyPart: 'butt', position: 'table_lean' },
    39: { tool: 'paddle', bodyPart: 'thighs', position: 'kneeling' },
  },

  // 动态惩罚格子配置 - 调整位置避免冲突
  DYNAMIC_PUNISHMENT_CELLS: {
    4: {
      type: 'dice_multiplier',
      tool: 'hand',
      bodyPart: 'butt',
      position: 'standing',
      multiplier: 2,
      description: '打的数量是骰子点数的2倍',
    },
    16: {
      type: 'other_player_choice',
      tool: 'cane',
      bodyPart: 'butt',
      position: 'knee_grab',
      description: '用藤条打屁股，手抓膝盖，数量由其他玩家决定',
    },
    24: {
      type: 'previous_player',
      tool: 'wooden_board',
      bodyPart: 'thighs',
      position: 'table_lean',
      description: '用木板打大腿，趴在桌子上',
    },
    26: {
      type: 'next_player',
      tool: 'cane',
      bodyPart: 'butt',
      position: 'kneeling',
      description: '用藤条打屁股，跪趴',
    },
    34: {
      type: 'previous_player',
      tool: 'ruler',
      bodyPart: 'thighs',
      position: 'wall_lean',
      description: '用尺子打大腿，手扶墙',
    },
    36: {
      type: 'other_player_choice',
      tool: 'cane',
      bodyPart: 'butt',
      position: 'knee_grab',
      description: '用藤条打屁股，手抓膝盖，数量由其他玩家决定',
    },
  },

  // 奖励格子配置 - 前进格子，最多3步
  BONUS_CELLS: {
    5: { type: 'move', value: 2, description: '前进2步' },
    25: { type: 'move', value: 3, description: '前进3步' },
  },

  // 特殊格子配置 - 后退格子和休息格子
  SPECIAL_CELLS: {
    8: { type: 'reverse', value: 2, description: '后退2步' },
    18: { type: 'reverse', value: 3, description: '后退3步' },
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
}

// 格子类型图标映射
export const CELL_ICONS = {
  punishment: '⚡',
  bonus: '🎁',
  special: '⬅️',
  restart: '🔄',
}

// 格子类型颜色映射
export const CELL_COLORS = {
  punishment: {
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
    border: '#ff4757',
  },
  bonus: {
    background: 'linear-gradient(135deg, #2ed573, #1e90ff)',
    border: '#00d2d3',
  },
  special: {
    background: 'linear-gradient(135deg, #ffa726, #ff9800)',
    border: '#ff7043',
  },
  restart: {
    background: 'linear-gradient(135deg, #ab47bc, #8e44ad)',
    border: '#9b59b6',
  },
}
