import type { Player, BoardCell, GameState, PunishmentConfig, PunishmentAction, PunishmentTool, PunishmentBodyPart } from '../types/game';
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

      // 检查是否为惩罚格子
      if (i in GAME_CONFIG.PUNISHMENT_CELLS) {
        cell.type = 'punishment';
        const punishmentConfig = GAME_CONFIG.PUNISHMENT_CELLS[i as keyof typeof GAME_CONFIG.PUNISHMENT_CELLS];
        const tool = GAME_CONFIG.DEFAULT_TOOLS.find(t => t.id === punishmentConfig.tool);
        const bodyPart = GAME_CONFIG.DEFAULT_BODY_PARTS.find(b => b.id === punishmentConfig.bodyPart);
        
        if (tool && bodyPart) {
          const punishment: PunishmentAction = {
            tool,
            bodyPart,
            strikes: punishmentConfig.strikes,
            description: `用${tool.name}打${bodyPart.name}${punishmentConfig.strikes}下`
          };
          
          cell.effect = {
            type: 'punishment',
            value: 0,
            description: punishment.description,
            punishment
          };
        }
      }
      // 检查是否为奖励格子
      else if (i in GAME_CONFIG.BONUS_CELLS) {
        cell.type = 'bonus';
        const bonusConfig = GAME_CONFIG.BONUS_CELLS[i as keyof typeof GAME_CONFIG.BONUS_CELLS];
        cell.effect = {
          type: 'move',
          value: bonusConfig.value,
          description: bonusConfig.description
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

  static createPunishmentConfig(): PunishmentConfig {
    return {
      tools: [...GAME_CONFIG.DEFAULT_TOOLS],
      bodyParts: [...GAME_CONFIG.DEFAULT_BODY_PARTS],
      maxStrikes: 30
    };
  }

  static rollDice(): number {
    return Math.floor(Math.random() * (GAME_CONFIG.DICE.MAX_VALUE - GAME_CONFIG.DICE.MIN_VALUE + 1)) + GAME_CONFIG.DICE.MIN_VALUE;
  }

  static movePlayer(player: Player, diceValue: number, board: BoardCell[]): { newPosition: number; effect?: string; punishment?: PunishmentAction } {
    let newPosition = player.position + diceValue;
    let effect: string | undefined;
    let punishment: PunishmentAction | undefined;

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
      } else if (cell.effect.type === 'punishment') {
        punishment = cell.effect.punishment;
      }
    }

    return { newPosition, effect, punishment };
  }

  static checkWinner(player: Player): boolean {
    return player.position >= GAME_CONFIG.BOARD.SIZE;
  }

  static getNextPlayer(currentIndex: number, totalPlayers: number): number {
    return (currentIndex + 1) % totalPlayers;
  }

  // 获取玩家在环形棋盘上的显示位置
  static getPlayerDisplayPosition(position: number): { row: number; col: number } {
    if (position === 0) return { row: -1, col: -1 }; // 起始位置
    
    // 环形布局：外圈-内圈-中心
    const totalCells = GAME_CONFIG.BOARD.SIZE;
    const outerRing = 20; // 外圈20格
    const innerRing = 8;  // 内圈8格
    const center = 2;     // 中心2格
    
    if (position <= outerRing) {
      // 外圈：5x4的矩形
      const index = position - 1;
      const row = Math.floor(index / 5);
      const col = index % 5;
      return { row, col };
    } else if (position <= outerRing + innerRing) {
      // 内圈：4x2的矩形
      const index = position - outerRing - 1;
      const row = Math.floor(index / 4) + 1;
      const col = (index % 4) + 1;
      return { row, col };
    } else {
      // 中心：2x1
      const index = position - outerRing - innerRing - 1;
      return { row: 2, col: 2 + index };
    }
  }

  // 检查是否为特殊格子
  static isSpecialCell(position: number): boolean {
    return position in GAME_CONFIG.PUNISHMENT_CELLS || 
           position in GAME_CONFIG.BONUS_CELLS || 
           position in GAME_CONFIG.SPECIAL_CELLS;
  }

  // 获取格子类型
  static getCellType(position: number): 'normal' | 'punishment' | 'bonus' | 'special' {
    if (position in GAME_CONFIG.PUNISHMENT_CELLS) return 'punishment';
    if (position in GAME_CONFIG.BONUS_CELLS) return 'bonus';
    if (position in GAME_CONFIG.SPECIAL_CELLS) return 'special';
    return 'normal';
  }

  // 生成随机惩罚
  static generateRandomPunishment(config: PunishmentConfig): PunishmentAction {
    const tool = config.tools[Math.floor(Math.random() * config.tools.length)];
    const bodyPart = config.bodyParts[Math.floor(Math.random() * config.bodyParts.length)];
    const strikes = Math.floor(Math.random() * config.maxStrikes) + 1;
    
    return {
      tool,
      bodyPart,
      strikes,
      description: `用${tool.name}打${bodyPart.name}${strikes}下`
    };
  }
} 