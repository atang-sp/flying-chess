// 游戏配置文件
export const GAME_CONFIG = {
  // 棋盘配置
  BOARD: {
    SIZE: 100, // 棋盘大小
    GRID_SIZE: 10, // 网格大小 (10x10)
  },
  
  // 骰子配置
  DICE: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    ANIMATION_DURATION: 1000, // 动画持续时间(ms)
  },
  
  // 玩家配置
  PLAYERS: {
    DEFAULT_COUNT: 4,
    COLORS: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
    NAMES: ['玩家1', '玩家2', '玩家3', '玩家4'],
  },
  
  // 动画配置
  ANIMATION: {
    MOVE_DURATION: 500, // 移动动画持续时间(ms)
    EFFECT_DISPLAY_DURATION: 2000, // 效果显示持续时间(ms)
  },
  
  // 梯子配置 (位置 -> 目标位置)
  LADDERS: {
    4: 18,   // 第4格 -> 第18格
    9: 31,   // 第9格 -> 第31格
    21: 63,  // 第21格 -> 第63格
    28: 64,  // 第28格 -> 第64格
    51: 118, // 第51格 -> 第118格 (超出棋盘，会被限制到100)
    71: 162, // 第71格 -> 第162格 (超出棋盘，会被限制到100)
    80: 180, // 第80格 -> 第180格 (超出棋盘，会被限制到100)
  },
  
  // 蛇配置 (位置 -> 目标位置)
  SNAKES: {
    17: 7,   // 第17格 -> 第7格
    54: 34,  // 第54格 -> 第34格
    62: 19,  // 第62格 -> 第19格
    87: 24,  // 第87格 -> 第24格
    93: 73,  // 第93格 -> 第73格
    95: 75,  // 第95格 -> 第75格
    98: 78,  // 第98格 -> 第78格
  },
  
  // 特殊格子配置
  SPECIAL_CELLS: {
    25: {
      type: 'skip',
      value: 1,
      description: '跳过下一回合'
    },
    47: {
      type: 'reverse',
      value: 3,
      description: '后退3格'
    }
  }
};

// 格子类型图标映射
export const CELL_ICONS = {
  ladder: '🪜',
  snake: '🐍',
  special: '⭐',
  normal: ''
};

// 格子类型颜色映射
export const CELL_COLORS = {
  ladder: {
    background: 'linear-gradient(135deg, #a8e6cf, #88d8c0)',
    border: '#4ecdc4'
  },
  snake: {
    background: 'linear-gradient(135deg, #ffb3ba, #ff8a95)',
    border: '#ff6b6b'
  },
  special: {
    background: 'linear-gradient(135deg, #ffd93d, #ffb347)',
    border: '#ffa726'
  },
  normal: {
    background: 'white',
    border: '#ddd'
  }
}; 