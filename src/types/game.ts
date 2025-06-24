export interface Player {
  id: number;
  name: string;
  color: string;
  position: number;
  isWinner: boolean;
}

export interface PunishmentTool {
  id: string;
  name: string;
  intensity: number; // 1-5 强度等级
}

export interface PunishmentBodyPart {
  id: string;
  name: string;
  sensitivity: number; // 1-5 敏感度等级
}

export interface PunishmentConfig {
  tools: PunishmentTool[];
  bodyParts: PunishmentBodyPart[];
  maxStrikes: number;
}

export interface PunishmentAction {
  tool: PunishmentTool;
  bodyPart: PunishmentBodyPart;
  strikes: number;
  description: string;
}

export interface BoardCell {
  id: number;
  type: 'normal' | 'punishment' | 'bonus' | 'special';
  effect?: {
    type: 'punishment' | 'move' | 'skip' | 'reverse';
    value: number;
    description: string;
    punishment?: PunishmentAction;
  };
  position: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  gameStatus: 'waiting' | 'rolling' | 'moving' | 'finished' | 'configuring';
  winner: Player | null;
  board: BoardCell[];
  punishmentConfig: PunishmentConfig;
}

export interface DiceAnimation {
  isRolling: boolean;
  duration: number;
} 