export interface Player {
  id: number
  name: string
  color: string
  position: number
  isWinner: boolean
  isMoving?: boolean // 添加移动动画状态
  hasTakenOff?: boolean // 是否已经起飞
}

export interface PunishmentTool {
  id: string
  name: string
  intensity: number // 1-5 强度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentBodyPart {
  id: string
  name: string
  sensitivity: number // 1-5 耐受度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentPosition {
  id: string
  name: string
  difficulty: number // 1-5 难度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentConfig {
  tools: PunishmentTool[]
  bodyParts: PunishmentBodyPart[]
  positions: PunishmentPosition[]
  minStrikes: number // 最小惩罚次数
  maxStrikes: number // 最大惩罚次数
}

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
  type: 'punishment' | 'bonus' | 'special' | 'restart'
  effect?: {
    type: 'punishment' | 'move' | 'rest' | 'reverse' | 'restart'
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
    | 'instructions'
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
