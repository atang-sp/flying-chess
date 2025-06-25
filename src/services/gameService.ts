import type { Player, BoardCell, GameState, PunishmentConfig, PunishmentAction, PunishmentTool, PunishmentBodyPart, PunishmentPosition } from '../types/game';
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

      // 检查是否为动态惩罚格子
      if (i in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS) {
        cell.type = 'punishment';
        const dynamicConfig = GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS[i as keyof typeof GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS];
        const tool = GAME_CONFIG.DEFAULT_TOOLS.find(t => t.id === dynamicConfig.tool);
        const bodyPart = GAME_CONFIG.DEFAULT_BODY_PARTS.find(b => b.id === dynamicConfig.bodyPart);
        const position = GAME_CONFIG.DEFAULT_POSITIONS.find(p => p.id === dynamicConfig.position);
        
        if (tool && bodyPart && position) {
          const punishment: PunishmentAction = {
            tool,
            bodyPart,
            position,
            strikes: 'strikes' in dynamicConfig ? dynamicConfig.strikes : 10,
            description: dynamicConfig.description,
            dynamicType: dynamicConfig.type as 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice',
            multiplier: 'multiplier' in dynamicConfig ? dynamicConfig.multiplier : undefined
          };
          
          cell.effect = {
            type: 'punishment',
            value: 0,
            description: dynamicConfig.description,
            punishment
          };
        }
      }
      // 检查是否为普通惩罚格子
      else if (i in GAME_CONFIG.PUNISHMENT_CELLS) {
        cell.type = 'punishment';
        const punishmentConfig = GAME_CONFIG.PUNISHMENT_CELLS[i as keyof typeof GAME_CONFIG.PUNISHMENT_CELLS];
        const tool = GAME_CONFIG.DEFAULT_TOOLS.find(t => t.id === punishmentConfig.tool);
        const bodyPart = GAME_CONFIG.DEFAULT_BODY_PARTS.find(b => b.id === punishmentConfig.bodyPart);
        const position = GAME_CONFIG.DEFAULT_POSITIONS.find(p => p.id === punishmentConfig.position);
        
        if (tool && bodyPart && position) {
          const punishment: PunishmentAction = {
            tool,
            bodyPart,
            position,
            strikes: punishmentConfig.strikes,
            description: `用${tool.name}打${bodyPart.name}${punishmentConfig.strikes}下，姿势：${position.name}`
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
          type: specialConfig.type as 'move' | 'rest' | 'reverse',
          value: specialConfig.value,
          description: specialConfig.description
        };
      }
      // 检查是否为回到起点格子
      else if (i in GAME_CONFIG.RESTART_CELLS) {
        cell.type = 'restart';
        const restartConfig = GAME_CONFIG.RESTART_CELLS[i as keyof typeof GAME_CONFIG.RESTART_CELLS];
        cell.effect = {
          type: 'restart',
          value: 0,
          description: restartConfig.description
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
    // 创建默认配置，使用均等比例
    const tools = GAME_CONFIG.DEFAULT_TOOLS.map(tool => ({
      ...tool,
      ratio: 100 / GAME_CONFIG.DEFAULT_TOOLS.length // 均等比例
    }));
    
    const bodyParts = GAME_CONFIG.DEFAULT_BODY_PARTS.map(bodyPart => ({
      ...bodyPart,
      ratio: 100 / GAME_CONFIG.DEFAULT_BODY_PARTS.length // 均等比例
    }));
    
    const positions = GAME_CONFIG.DEFAULT_POSITIONS.map(position => ({
      ...position,
      ratio: 100 / GAME_CONFIG.DEFAULT_POSITIONS.length // 均等比例
    }));
    
    return {
      tools,
      bodyParts,
      positions,
      maxStrikes: 30
    };
  }

  static rollDice(): number {
    return Math.floor(Math.random() * (GAME_CONFIG.DICE.MAX_VALUE - GAME_CONFIG.DICE.MIN_VALUE + 1)) + GAME_CONFIG.DICE.MIN_VALUE;
  }

  static movePlayer(player: Player, diceValue: number, board: BoardCell[], currentPlayerIndex: number, totalPlayers: number): { newPosition: number; effect?: string; punishment?: PunishmentAction; targetPlayerIndex?: number; cellEffect?: any } {
    // 设置移动动画状态
    player.isMoving = true;
    
    // 延迟清除移动动画状态
    setTimeout(() => {
      player.isMoving = false;
    }, 600); // 与CSS动画时长匹配

    let newPosition = player.position + diceValue;
    let effect: string | undefined;
    let punishment: PunishmentAction | undefined;
    let targetPlayerIndex: number | undefined;
    let cellEffect: any = undefined;

    // 处理环形移动
    if (newPosition > 40) {
      newPosition = 40; // 到达终点
    }

    // 检查新位置的格子效果
    const targetCell = board.find(cell => cell.position === newPosition);
    if (targetCell && targetCell.effect) {
      cellEffect = targetCell.effect;
      
      switch (targetCell.effect.type) {
        case 'punishment':
          if (targetCell.effect.punishment) {
            punishment = targetCell.effect.punishment;
            effect = `触发惩罚：${targetCell.effect.punishment.tool.name} ${targetCell.effect.punishment.bodyPart.name} ${targetCell.effect.punishment.position.name} ${targetCell.effect.punishment.strikes}下`;
          }
          break;
          
        case 'move':
          const moveSteps = targetCell.effect.value;
          newPosition += moveSteps;
          if (newPosition > 40) newPosition = 40;
          if (newPosition < 0) newPosition = 0;
          effect = `移动${moveSteps > 0 ? '+' : ''}${moveSteps}步`;
          break;
          
        case 'reverse':
          const reverseSteps = targetCell.effect.value;
          newPosition -= reverseSteps;
          if (newPosition < 0) newPosition = 0;
          effect = `后退${reverseSteps}步`;
          break;
          
        case 'restart':
          newPosition = 0;
          effect = '回到起点';
          break;
          
        case 'rest':
          effect = `休息${targetCell.effect.value}回合`;
          break;
      }
    }

    return { newPosition, effect, punishment, targetPlayerIndex, cellEffect };
  }

  // 处理格子效果（第二步）
  static processCellEffect(player: Player, cellEffect: any): { newPosition: number; effect: string; fromPosition: number; toPosition: number } {
    // 设置移动动画状态
    player.isMoving = true;
    
    // 延迟清除移动动画状态
    setTimeout(() => {
      player.isMoving = false;
    }, 600); // 与CSS动画时长匹配

    const fromPosition = player.position;
    let newPosition = player.position;
    let effect = '';

    switch (cellEffect.type) {
      case 'move':
        newPosition += cellEffect.value;
        if (newPosition > 40) newPosition = 40;
        if (newPosition < 0) newPosition = 0;
        effect = `移动${cellEffect.value > 0 ? '+' : ''}${cellEffect.value}步`;
        break;
        
      case 'reverse':
        newPosition -= cellEffect.value;
        if (newPosition < 0) newPosition = 0;
        effect = `后退${cellEffect.value}步`;
        break;
        
      case 'restart':
        newPosition = 0;
        effect = '回到起点';
        break;
        
      case 'rest':
        effect = `休息${cellEffect.value}回合`;
        break;
    }

    return { newPosition, effect, fromPosition, toPosition: newPosition };
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
    
    // 环形布局：外圈-内圈
    const totalCells = GAME_CONFIG.BOARD.SIZE;
    const outerRing = 20; // 外圈20格
    const innerRing = 20; // 内圈20格
    
    if (position <= outerRing) {
      // 外圈：5x4的矩形
      const index = position - 1;
      const row = Math.floor(index / 5);
      const col = index % 5;
      return { row, col };
    } else if (position <= outerRing + innerRing) {
      // 内圈：5x4的矩形
      const index = position - outerRing - 1;
      const row = Math.floor(index / 5) + 1;
      const col = (index % 5) + 1;
      return { row, col };
    } else {
      // 超出范围，返回默认位置
      return { row: 0, col: 0 };
    }
  }

  // 检查是否为特殊格子
  static isSpecialCell(position: number): boolean {
    return position in GAME_CONFIG.PUNISHMENT_CELLS || 
           position in GAME_CONFIG.BONUS_CELLS || 
           position in GAME_CONFIG.SPECIAL_CELLS;
  }

  // 获取格子类型
  static getCellType(position: number): 'normal' | 'punishment' | 'bonus' | 'special' | 'restart' {
    if (position in GAME_CONFIG.PUNISHMENT_CELLS || position in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS) {
      return 'punishment';
    } else if (position in GAME_CONFIG.BONUS_CELLS) {
      return 'bonus';
    } else if (position in GAME_CONFIG.SPECIAL_CELLS) {
      return 'special';
    } else if (position in GAME_CONFIG.RESTART_CELLS) {
      return 'restart';
    }
    return 'normal';
  }

  // 根据比例随机选择项目
  static selectByRatio<T extends { ratio: number }>(items: T[]): T {
    const totalRatio = items.reduce((sum, item) => sum + item.ratio, 0);
    const random = Math.random() * totalRatio;
    
    let currentSum = 0;
    for (const item of items) {
      currentSum += item.ratio;
      if (random <= currentSum) {
        return item;
      }
    }
    
    // 兜底返回第一个
    return items[0];
  }

  // 生成随机惩罚（考虑强度耐受度限制和比例）
  static generateRandomPunishment(config: PunishmentConfig): PunishmentAction {
    let tool: PunishmentTool;
    let bodyPart: PunishmentBodyPart;
    let position: PunishmentPosition;
    
    // 使用自定义比例
    tool = this.selectByRatio(config.tools);
    bodyPart = this.selectByRatio(config.bodyParts);
    position = this.selectByRatio(config.positions);
    
    // 确保工具强度不超过部位耐受性（耐受度）
    if (tool.intensity > bodyPart.sensitivity) {
      // 重新选择工具，选择强度不超过耐受性的工具
      const validTools = config.tools.filter(t => t.intensity <= bodyPart.sensitivity);
      if (validTools.length > 0) {
        tool = this.selectByRatio(validTools);
      }
    }
    
    const strikes = Math.floor(Math.random() * config.maxStrikes) + 1;
    
    return {
      tool,
      bodyPart,
      position,
      strikes,
      description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`
    };
  }

  // 验证惩罚配置的合理性
  static validatePunishmentConfig(config: PunishmentConfig): boolean {
    // 检查是否有可用的工具和部位组合
    for (const tool of config.tools) {
      const hasValidBodyPart = config.bodyParts.some(b => b.sensitivity >= tool.intensity);
      if (!hasValidBodyPart) {
        return false; // 有工具没有合适的部位
      }
    }
    
    for (const bodyPart of config.bodyParts) {
      const hasValidTool = config.tools.some(t => t.intensity <= bodyPart.sensitivity);
      if (!hasValidTool) {
        return false; // 有部位没有合适的工具
      }
    }
    
    return true;
  }

  // 应用均等比例
  static applyEqualRatio(config: PunishmentConfig): void {
    const toolRatio = 100 / config.tools.length;
    const bodyPartRatio = 100 / config.bodyParts.length;
    const positionRatio = 100 / config.positions.length;
    
    config.tools.forEach(tool => tool.ratio = toolRatio);
    config.bodyParts.forEach(bodyPart => bodyPart.ratio = bodyPartRatio);
    config.positions.forEach(position => position.ratio = positionRatio);
  }

  // 生成多个惩罚组合供玩家确认
  static generatePunishmentCombinations(config: PunishmentConfig, count: number = 10): PunishmentAction[] {
    const combinations: PunishmentAction[] = [];
    
    for (let i = 0; i < count; i++) {
      const combination = this.generateRandomPunishment(config);
      combinations.push(combination);
    }
    
    return combinations;
  }

  // 根据确认的组合更新棋盘
  static updateBoardWithConfirmedCombinations(board: BoardCell[], combinations: PunishmentAction[]): BoardCell[] {
    const updatedBoard = [...board];
    
    // 获取所有惩罚格子的位置
    const punishmentPositions = [
      ...Object.keys(GAME_CONFIG.PUNISHMENT_CELLS).map(Number),
      ...Object.keys(GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS).map(Number)
    ];
    
    // 为每个惩罚格子分配一个确认的组合
    punishmentPositions.forEach((position, index) => {
      const cell = updatedBoard.find(c => c.position === position);
      if (cell && index < combinations.length) {
        const combination = combinations[index];
        
        // 检查是否为动态惩罚格子
        if (position in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS) {
          const dynamicConfig = GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS[position as keyof typeof GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS];
          combination.dynamicType = dynamicConfig.type as 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice';
          combination.multiplier = 'multiplier' in dynamicConfig ? dynamicConfig.multiplier : undefined;
          
          // 更新描述
          switch (combination.dynamicType) {
            case 'dice_multiplier':
              if (combination.multiplier) {
                combination.description = `用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}（骰子点数×${combination.multiplier}）`;
              }
              break;
            case 'previous_player':
              combination.description = `上一个玩家：用${combination.tool.name}打${combination.bodyPart.name}${combination.strikes}下，姿势：${combination.position.name}`;
              break;
            case 'next_player':
              combination.description = `下一个玩家：用${combination.tool.name}打${combination.bodyPart.name}${combination.strikes}下，姿势：${combination.position.name}`;
              break;
            case 'other_player_choice':
              combination.description = `用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}（数量由其他玩家决定）`;
              break;
          }
        }
        
        cell.effect = {
          type: 'punishment',
          value: 0,
          description: combination.description,
          punishment: combination
        };
      }
    });
    
    return updatedBoard;
  }
} 