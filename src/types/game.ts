export interface Player {
  id: number;
  name: string;
  color: string;
  position: number;
  isWinner: boolean;
}

export interface BoardCell {
  id: number;
  type: 'normal' | 'ladder' | 'snake' | 'special';
  effect?: {
    type: 'move' | 'skip' | 'reverse';
    value: number;
    description: string;
  };
  position: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  gameStatus: 'waiting' | 'rolling' | 'moving' | 'finished';
  winner: Player | null;
  board: BoardCell[];
}

export interface DiceAnimation {
  isRolling: boolean;
  duration: number;
} 