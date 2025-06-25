export interface Player {
  id: number;
  name: string;
  color: string;
  position: number;
  isWinner: boolean;
  isMoving?: boolean; // 添加移动动画状态
}

export interface PunishmentTool {
  id: string;
  name: string;
  intensity: number; // 1-5 强度等级
  ratio: number; // 出现比例 (0-100)
}

export interface PunishmentBodyPart {
  id: string;
  name: string;
  sensitivity: number; // 1-5 耐受度等级
  ratio: number; // 出现比例 (0-100)
}

export interface PunishmentPosition {
  id: string;
  name: string;
  difficulty: number; // 1-5 难度等级
  ratio: number; // 出现比例 (0-100)
}

export interface PunishmentConfig {
  tools: PunishmentTool[];
  bodyParts: PunishmentBodyPart[];
  positions: PunishmentPosition[];
  maxStrikes: number;
}

export interface PunishmentAction {
  tool: PunishmentTool;
  bodyPart: PunishmentBodyPart;
  position: PunishmentPosition;
  strikes: number;
  description: string;
  dynamicType?: 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice';
  multiplier?: number;
  targetPlayer?: 'current' | 'previous' | 'next' | 'other';
}

export interface BoardCell {
  id: number;
  type: 'normal' | 'punishment' | 'bonus' | 'special' | 'restart';
  effect?: {
    type: 'punishment' | 'move' | 'rest' | 'reverse' | 'restart';
    value: number;
    description: string;
    punishment?: PunishmentAction;
  };
  position: number;
}

export interface CellEffect {
  type: 'move' | 'rest' | 'reverse' | 'restart';
  value: number;
  description: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  gameStatus: 'waiting' | 'rolling' | 'moving' | 'showing_effect' | 'finished' | 'configuring' | 'intro' | 'instructions' | 'settings';
  winner: Player | null;
  board: BoardCell[];
  punishmentConfig: PunishmentConfig;
  pendingEffect: CellEffect | null;
}

export interface DiceAnimation {
  isRolling: boolean;
  duration: number;
} 