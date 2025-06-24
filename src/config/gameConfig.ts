// 游戏配置文件
export const GAME_CONFIG = {
  // 棋盘配置
  BOARD: {
    SIZE: 30, // 改为30格，适合环形布局
    GRID_SIZE: 6, // 6x5的环形布局
  },
  
  // 骰子配置
  DICE: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    ANIMATION_DURATION: 1000, // 动画持续时间(ms)
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
    { id: 'hand', name: '手掌', intensity: 1 },
    { id: 'ruler', name: '尺子', intensity: 2 },
    { id: 'belt', name: '皮带', intensity: 3 },
    { id: 'cane', name: '藤条', intensity: 4 },
    { id: 'paddle', name: '拍子', intensity: 5 },
  ],
  
  // 默认身体部位
  DEFAULT_BODY_PARTS: [
    { id: 'butt', name: '臀部', sensitivity: 5 },
    { id: 'thighs', name: '大腿', sensitivity: 4 },
    { id: 'calves', name: '小腿', sensitivity: 3 },
    { id: 'hands', name: '手心', sensitivity: 2 },
    { id: 'arms', name: '手臂', sensitivity: 1 },
  ],
  
  // 惩罚格子配置
  PUNISHMENT_CELLS: {
    3: { tool: 'hand', bodyPart: 'hands', strikes: 5 },
    7: { tool: 'ruler', bodyPart: 'calves', strikes: 8 },
    11: { tool: 'belt', bodyPart: 'thighs', strikes: 10 },
    15: { tool: 'cane', bodyPart: 'butt', strikes: 12 },
    19: { tool: 'paddle', bodyPart: 'butt', strikes: 15 },
    23: { tool: 'belt', bodyPart: 'thighs', strikes: 18 },
    27: { tool: 'cane', bodyPart: 'butt', strikes: 20 },
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
  },
  
  // 特殊格子配置
  SPECIAL_CELLS: {
    6: { type: 'skip', value: 1, description: '跳过下一回合' },
    12: { type: 'reverse', value: 2, description: '后退2步' },
    18: { type: 'skip', value: 1, description: '跳过下一回合' },
    24: { type: 'reverse', value: 3, description: '后退3步' },
  }
};

// 格子类型图标映射
export const CELL_ICONS = {
  punishment: '⚡',
  bonus: '🎁',
  special: '⭐',
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
  normal: {
    background: 'white',
    border: '#ddd'
  }
}; 