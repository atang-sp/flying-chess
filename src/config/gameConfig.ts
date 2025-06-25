// 游戏配置文件
export const GAME_CONFIG = {
  // 棋盘配置
  BOARD: {
    SIZE: 60, // 增加到60格
    GRID_SIZE: 8, // 8x8的环形布局
  },
  
  // 骰子配置
  DICE: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    ANIMATION_DURATION: 2000, // 动画持续时间(ms) - 增加到2秒
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
    { id: 'butt', name: '屁股', sensitivity: 5, ratio: 33.33 }, // 耐受性最高，任何工具都可以
    { id: 'thighs', name: '大腿', sensitivity: 3, ratio: 33.33 }, // 中等耐受性
    { id: 'hands', name: '手心', sensitivity: 1, ratio: 33.34 }, // 最敏感，只能用手掌
  ],
  
  // 默认受罚姿势
  DEFAULT_POSITIONS: [
    { id: 'standing', name: '站立', difficulty: 1, ratio: 20 },
    { id: 'wall_lean', name: '手扶墙', difficulty: 2, ratio: 20 },
    { id: 'table_lean', name: '趴在桌子上', difficulty: 3, ratio: 20 },
    { id: 'knee_grab', name: '手抓膝盖', difficulty: 4, ratio: 20 },
    { id: 'kneeling', name: '跪趴', difficulty: 5, ratio: 20 },
  ],
  
  // 惩罚格子配置
  PUNISHMENT_CELLS: {
    3: { tool: 'hand', bodyPart: 'hands', position: 'standing', strikes: 5 },
    7: { tool: 'ruler', bodyPart: 'thighs', position: 'wall_lean', strikes: 8 },
    11: { tool: 'wooden_board', bodyPart: 'thighs', position: 'table_lean', strikes: 10 },
    15: { tool: 'cane', bodyPart: 'butt', position: 'knee_grab', strikes: 12 },
    19: { tool: 'paddle', bodyPart: 'butt', position: 'kneeling', strikes: 15 },
    23: { tool: 'wooden_board', bodyPart: 'thighs', position: 'table_lean', strikes: 18 },
    27: { tool: 'cane', bodyPart: 'butt', position: 'kneeling', strikes: 20 },
    31: { tool: 'hand', bodyPart: 'hands', position: 'standing', strikes: 6 },
    35: { tool: 'ruler', bodyPart: 'thighs', position: 'wall_lean', strikes: 9 },
    39: { tool: 'wooden_board', bodyPart: 'butt', position: 'table_lean', strikes: 12 },
    43: { tool: 'cane', bodyPart: 'butt', position: 'kneeling', strikes: 15 },
    47: { tool: 'paddle', bodyPart: 'butt', position: 'kneeling', strikes: 18 },
    51: { tool: 'wooden_board', bodyPart: 'thighs', position: 'table_lean', strikes: 20 },
    55: { tool: 'cane', bodyPart: 'butt', position: 'kneeling', strikes: 25 },
  },
  
  // 动态惩罚格子配置
  DYNAMIC_PUNISHMENT_CELLS: {
    4: { 
      type: 'dice_multiplier', 
      tool: 'hand', 
      bodyPart: 'butt', 
      position: 'standing', 
      multiplier: 2,
      description: '打的数量是骰子点数的2倍'
    },
    8: { 
      type: 'previous_player', 
      tool: 'ruler', 
      bodyPart: 'thighs', 
      position: 'wall_lean', 
      strikes: 10,
      description: '上一个玩家挨打'
    },
    12: { 
      type: 'next_player', 
      tool: 'wooden_board', 
      bodyPart: 'butt', 
      position: 'table_lean', 
      strikes: 12,
      description: '下一个玩家挨打'
    },
    16: { 
      type: 'other_player_choice', 
      tool: 'cane', 
      bodyPart: 'butt', 
      position: 'knee_grab', 
      description: '其他玩家指定打多少下'
    },
    20: { 
      type: 'dice_multiplier', 
      tool: 'paddle', 
      bodyPart: 'butt', 
      position: 'kneeling', 
      multiplier: 3,
      description: '打的数量是骰子点数的3倍'
    },
    24: { 
      type: 'previous_player', 
      tool: 'wooden_board', 
      bodyPart: 'thighs', 
      position: 'table_lean', 
      strikes: 15,
      description: '上一个玩家挨打'
    },
    28: { 
      type: 'next_player', 
      tool: 'cane', 
      bodyPart: 'butt', 
      position: 'kneeling', 
      strikes: 18,
      description: '下一个玩家挨打'
    },
    32: { 
      type: 'dice_multiplier', 
      tool: 'hand', 
      bodyPart: 'butt', 
      position: 'standing', 
      multiplier: 2,
      description: '打的数量是骰子点数的2倍'
    },
    36: { 
      type: 'previous_player', 
      tool: 'ruler', 
      bodyPart: 'thighs', 
      position: 'wall_lean', 
      strikes: 12,
      description: '上一个玩家挨打'
    },
    40: { 
      type: 'next_player', 
      tool: 'wooden_board', 
      bodyPart: 'butt', 
      position: 'table_lean', 
      strikes: 15,
      description: '下一个玩家挨打'
    },
    44: { 
      type: 'other_player_choice', 
      tool: 'cane', 
      bodyPart: 'butt', 
      position: 'kneeling', 
      description: '其他玩家指定打多少下'
    },
    48: { 
      type: 'dice_multiplier', 
      tool: 'paddle', 
      bodyPart: 'butt', 
      position: 'kneeling', 
      multiplier: 4,
      description: '打的数量是骰子点数的4倍'
    },
    52: { 
      type: 'previous_player', 
      tool: 'wooden_board', 
      bodyPart: 'thighs', 
      position: 'table_lean', 
      strikes: 20,
      description: '上一个玩家挨打'
    },
    56: { 
      type: 'next_player', 
      tool: 'cane', 
      bodyPart: 'butt', 
      position: 'kneeling', 
      strikes: 25,
      description: '下一个玩家挨打'
    },
  },
  
  // 奖励格子配置
  BONUS_CELLS: {
    5: { type: 'move', value: 3, description: '前进3步' },
    9: { type: 'move', value: 2, description: '前进2步' },
    13: { type: 'move', value: 4, description: '前进4步' },
    17: { type: 'move', value: 3, description: '前进3步' },
    21: { type: 'move', value: 5, description: '前进5步' },
    25: { type: 'move', value: 4, description: '前进4步' },
    29: { type: 'move', value: 6, description: '前进6步' },
    33: { type: 'move', value: 4, description: '前进4步' },
    37: { type: 'move', value: 3, description: '前进3步' },
    41: { type: 'move', value: 5, description: '前进5步' },
    45: { type: 'move', value: 4, description: '前进4步' },
    49: { type: 'move', value: 6, description: '前进6步' },
    53: { type: 'move', value: 5, description: '前进5步' },
    57: { type: 'move', value: 7, description: '前进7步' },
  },
  
  // 特殊格子配置
  SPECIAL_CELLS: {
    6: { type: 'skip', value: 1, description: '跳过下一回合' },
    14: { type: 'reverse', value: 2, description: '后退2步' },
    18: { type: 'skip', value: 1, description: '跳过下一回合' },
    22: { type: 'reverse', value: 3, description: '后退3步' },
    26: { type: 'skip', value: 1, description: '跳过下一回合' },
    30: { type: 'reverse', value: 4, description: '后退4步' },
    34: { type: 'skip', value: 1, description: '跳过下一回合' },
    38: { type: 'reverse', value: 3, description: '后退3步' },
    42: { type: 'skip', value: 1, description: '跳过下一回合' },
    46: { type: 'reverse', value: 5, description: '后退5步' },
    50: { type: 'skip', value: 1, description: '跳过下一回合' },
    54: { type: 'reverse', value: 4, description: '后退4步' },
    58: { type: 'skip', value: 1, description: '跳过下一回合' },
  },
  
  // 回到起点格子配置
  RESTART_CELLS: {
    10: { description: '回到起点' },
    20: { description: '回到起点' },
    30: { description: '回到起点' },
    40: { description: '回到起点' },
    50: { description: '回到起点' },
  },
  
  // 默认比例设置
  DEFAULT_RATIOS: {
    bodyPartRatio: 60, // 部位比例60%
    toolRatio: 25, // 工具比例25%
    positionRatio: 15, // 姿势比例15%
  }
};

// 格子类型图标映射
export const CELL_ICONS = {
  punishment: '⚡',
  bonus: '🎁',
  special: '⭐',
  restart: '🔄',
  normal: ''
};

// 格子类型颜色映射
export const CELL_COLORS = {
  punishment: {
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
    border: '#ff4757'
  },
  bonus: {
    background: 'linear-gradient(135deg, #2ed573, #1e90ff)',
    border: '#2ed573'
  },
  special: {
    background: 'linear-gradient(135deg, #ffd93d, #ffb347)',
    border: '#ffa726'
  },
  restart: {
    background: 'linear-gradient(135deg, #ff4757, #ff3742)',
    border: '#ff3742'
  },
  normal: {
    background: 'white',
    border: '#ddd'
  }
}; 