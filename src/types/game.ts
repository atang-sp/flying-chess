export interface Player {
  id: number
  name: string
  color: string
  position: number
  isWinner: boolean
  isMoving?: boolean // 添加移动动画状态
  hasTakenOff?: boolean // 是否已经起飞
  failedTakeoffAttempts?: number // 起飞失败次数
}

export interface PunishmentTool {
  name: string
  intensity: number // 1-5 强度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentBodyPart {
  name: string
  sensitivity: number // 1-5 耐受度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentPosition {
  name: string
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentConfig {
  tools: Record<string, PunishmentTool>
  bodyParts: Record<string, PunishmentBodyPart>
  positions: Record<string, PunishmentPosition>
  minStrikes: number // 最小惩罚次数
  maxStrikes: number // 最大惩罚次数
  step: number // 惩罚次数步长
  maxTakeoffFailures: number // 最大起飞失败次数（达到后自动起飞）
}

// 惩罚组合定义（不包含具体次数）
export interface PunishmentCombination {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  description: string
}

// 完整的惩罚动作（包含具体次数）
export interface PunishmentAction {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  strikes?: number
  description: string
  dynamicType?: 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice'
  multiplier?: number
  targetPlayer?: 'current' | 'previous' | 'next' | 'other'
}

export interface BoardCell {
  id: number
  type: 'punishment' | 'bonus' | 'special' | 'restart' | 'trap'
  effect?: {
    type: 'punishment' | 'move' | 'rest' | 'reverse' | 'restart' | 'trap'
    value: number
    description: string
    punishment?: PunishmentAction
    dynamicType?: 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice'
    multiplier?: number
  }
  position: number
}

export interface CellEffect {
  type: 'move' | 'rest' | 'reverse' | 'restart'
  value: number
  description: string
}

export interface BoardConfig {
  punishmentCells: number // 惩罚格子数量
  bonusCells: number // 奖励格子数量
  reverseCells: number // 后退格子数量
  restCells: number // 休息格子数量
  restartCells: number // 回到起点格子数量
  trapCells: number // 机关格子数量
  totalCells: number // 总格子数量
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  diceValue: number | null
  gameStatus:
    | 'waiting'
    | 'rolling'
    | 'moving'
    | 'showing_effect'
    | 'finished'
    | 'configuring'
    | 'intro'
    | 'board_settings'
    | 'settings'
  winner: Player | null
  board: BoardCell[]
  punishmentConfig: PunishmentConfig
  boardConfig: BoardConfig
  pendingEffect: CellEffect | null
}

export interface DiceAnimation {
  isRolling: boolean
  duration: number
}

export interface TrapAction {
  name: string
  description: string
}
