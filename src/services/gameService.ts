import type { Player, BoardCell, GameState } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';

export class GameService {
  static createBoard(): BoardCell[] {
    const board: BoardCell[] = [];
    
    for (let i = 1; i <= GAME_CONFIG.BOARD.SIZE; i++) {
      const cell: BoardCell = {
        id: i,
        type: 'normal',
        position: i
      };

      // 检查是否为梯子
      if (i in GAME_CONFIG.LADDERS) {
        cell.type = 'ladder';
        const targetPosition = GAME_CONFIG.LADDERS[i as keyof typeof GAME_CONFIG.LADDERS];
        cell.effect = {
          type: 'move',
          value: targetPosition - i,
          description: `爬梯子到第${targetPosition}格`
        };
      }
      // 检查是否为蛇
      else if (i in GAME_CONFIG.SNAKES) {
        cell.type = 'snake';
        const targetPosition = GAME_CONFIG.SNAKES[i as keyof typeof GAME_CONFIG.SNAKES];
        cell.effect = {
          type: 'move',
          value: targetPosition - i,
          description: `被蛇咬，回到第${targetPosition}格`
        };
      }
      // 检查是否为特殊格子
      else if (i in GAME_CONFIG.SPECIAL_CELLS) {
        cell.type = 'special';
        const specialConfig = GAME_CONFIG.SPECIAL_CELLS[i as keyof typeof GAME_CONFIG.SPECIAL_CELLS];
        cell.effect = {
          type: specialConfig.type as 'move' | 'skip' | 'reverse',
          value: specialConfig.value,
          description: specialConfig.description
        };
      }

      board.push(cell);
    }

    return board;
  }

  static createPlayers(): Player[] {
    const players: Player[] = [];
    
    for (let i = 0; i < GAME_CONFIG.PLAYERS.DEFAULT_COUNT; i++) {
      players.push({
        id: i + 1,
        name: GAME_CONFIG.PLAYERS.NAMES[i],
        color: GAME_CONFIG.PLAYERS.COLORS[i],
        position: 0,
        isWinner: false
      });
    }
    
    return players;
  }

  static rollDice(): number {
    return Math.floor(Math.random() * (GAME_CONFIG.DICE.MAX_VALUE - GAME_CONFIG.DICE.MIN_VALUE + 1)) + GAME_CONFIG.DICE.MIN_VALUE;
  }

  static movePlayer(player: Player, diceValue: number, board: BoardCell[]): { newPosition: number; effect?: string } {
    let newPosition = player.position + diceValue;
    let effect: string | undefined;

    // 检查是否超出棋盘
    if (newPosition > GAME_CONFIG.BOARD.SIZE) {
      newPosition = player.position; // 不移动
      effect = '超出终点，原地不动';
      return { newPosition, effect };
    }

    // 检查格子效果
    const cell = board.find(c => c.position === newPosition);
    if (cell?.effect) {
      effect = cell.effect.description;
      
      if (cell.effect.type === 'move') {
        newPosition += cell.effect.value;
        // 确保位置在有效范围内
        if (newPosition < 0) newPosition = 0;
        if (newPosition > GAME_CONFIG.BOARD.SIZE) newPosition = GAME_CONFIG.BOARD.SIZE;
      }
    }

    return { newPosition, effect };
  }

  static checkWinner(player: Player): boolean {
    return player.position >= GAME_CONFIG.BOARD.SIZE;
  }

  static getNextPlayer(currentIndex: number, totalPlayers: number): number {
    return (currentIndex + 1) % totalPlayers;
  }

  // 获取玩家在棋盘上的显示位置
  static getPlayerDisplayPosition(position: number): { row: number; col: number } {
    if (position === 0) return { row: -1, col: -1 }; // 起始位置
    
    const gridSize = GAME_CONFIG.BOARD.GRID_SIZE;
    const row = Math.floor((position - 1) / gridSize);
    const col = (position - 1) % gridSize;
    
    // 蛇形排列：偶数行反转
    const actualCol = row % 2 === 0 ? gridSize - 1 - col : col;
    const actualRow = gridSize - 1 - row; // 从下到上排列
    
    return { row: actualRow, col: actualCol };
  }

  // 检查是否为特殊格子
  static isSpecialCell(position: number): boolean {
    return position in GAME_CONFIG.LADDERS || 
           position in GAME_CONFIG.SNAKES || 
           position in GAME_CONFIG.SPECIAL_CELLS;
  }

  // 获取格子类型
  static getCellType(position: number): 'normal' | 'ladder' | 'snake' | 'special' {
    if (position in GAME_CONFIG.LADDERS) return 'ladder';
    if (position in GAME_CONFIG.SNAKES) return 'snake';
    if (position in GAME_CONFIG.SPECIAL_CELLS) return 'special';
    return 'normal';
  }
} 