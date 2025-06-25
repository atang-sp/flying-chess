import type { Player, BoardCell, GameState, PunishmentConfig, PunishmentAction, PunishmentTool, PunishmentBodyPart, PunishmentPosition } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';

export class GameService {
  static createBoard(punishmentConfig?: PunishmentConfig): BoardCell[] {
    const board: BoardCell[] = [];
    
    // 使用用户配置或默认配置
    const config = punishmentConfig || this.createPunishmentConfig();
    
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
        
        // 使用用户配置中的工具、部位、姿势
        const tool = config.tools.find(t => t.id === dynamicConfig.tool) || config.tools[0];
        const bodyPart = config.bodyParts.find(b => b.id === dynamicConfig.bodyPart) || config.bodyParts[0];
        const position = config.positions.find(p => p.id === dynamicConfig.position) || config.positions[0];
        
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
        
        // 使用用户配置中的工具、部位、姿势
        const tool = config.tools.find(t => t.id === punishmentConfig.tool) || config.tools[0];
        const bodyPart = config.bodyParts.find(b => b.id === punishmentConfig.bodyPart) || config.bodyParts[0];
        const position = config.positions.find(p => p.id === punishmentConfig.position) || config.positions[0];
        
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
        isWinner: false,
        hasTakenOff: false
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

  static movePlayer(player: Player, diceValue: number, board: BoardCell[], currentPlayerIndex: number, totalPlayers: number, punishmentConfig: PunishmentConfig): { newPosition: number; effect?: string; punishment?: PunishmentAction; targetPlayerIndex?: number; cellEffect?: any; canTakeOff?: boolean; executorIndex?: number } {
    // 设置移动动画状态
    player.isMoving = true;
    
    // 延迟清除移动动画状态
    setTimeout(() => {
      player.isMoving = false;
    }, 600); // 与CSS动画时长匹配

    let newPosition = player.position;
    let effect: string | undefined;
    let punishment: PunishmentAction | undefined;
    let targetPlayerIndex: number | undefined;
    let cellEffect: any = undefined;
    let canTakeOff = false;
    let executorIndex: number | undefined;

    // 检查是否在起点且未起飞
    if (player.position === 0 && !player.hasTakenOff) {
      if (diceValue === 6) {
        // 起飞成功
        player.hasTakenOff = true;
        newPosition = 1; // 移动到第一个格子
        effect = '起飞成功！移动到第1格';
        canTakeOff = true;
      } else {
        // 未起飞，触发惩罚
        const tool = this.selectByRatio(punishmentConfig.tools);
        const bodyPart = this.selectByRatio(punishmentConfig.bodyParts);
        const position = this.selectByRatio(punishmentConfig.positions);
        
        // 计算惩罚执行者
        const otherPlayersCount = totalPlayers - 1;
        if (otherPlayersCount > 0) {
          executorIndex = diceValue % otherPlayersCount;
        }
        
        punishment = {
          tool,
          bodyPart,
          position,
          strikes: diceValue,
          description: `未起飞，被惩罚：${tool.name} ${bodyPart.name} ${position.name} ${diceValue}下`
        };
        
        effect = `未起飞！被惩罚${diceValue}下`;
        return { newPosition, effect, punishment, targetPlayerIndex, cellEffect, canTakeOff, executorIndex };
      }
    } else {
      // 已经起飞，正常移动
      newPosition = player.position + diceValue;
      
      // 处理环形移动
      if (newPosition > 40) {
        newPosition = 40; // 到达终点
      }
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
          player.hasTakenOff = false; // 回到起点后需要重新起飞
          effect = '回到起点，需要重新起飞';
          break;
          
        case 'rest':
          effect = `休息${targetCell.effect.value}回合`;
          break;
      }
    }

    return { newPosition, effect, punishment, targetPlayerIndex, cellEffect, canTakeOff, executorIndex };
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
    
    // 使用自定义比例选择工具
    tool = this.selectByRatio(config.tools);
    
    // 根据工具强度选择合适的部位（考虑比例）
    const validBodyParts = config.bodyParts.filter(b => b.sensitivity >= tool.intensity);
    if (validBodyParts.length > 0) {
      // 在有效部位中按比例选择
      bodyPart = this.selectByRatio(validBodyParts);
    } else {
      // 如果没有合适的部位，选择耐受度最高的部位
      bodyPart = config.bodyParts.reduce((max, current) => 
        current.sensitivity > max.sensitivity ? current : max
      );
    }
    
    // 使用自定义比例选择姿势
    position = this.selectByRatio(config.positions);
    
    // 惩罚次数完全随机，与工具/部位/姿势无关
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

  // 生成更符合用户偏好的惩罚组合
  static generateBalancedPunishmentCombinations(config: PunishmentConfig, count: number = 10): PunishmentAction[] {
    const combinations: PunishmentAction[] = [];
    
    // 确保工具、部位、姿势的分布符合用户设置的比例
    const toolDistribution = this.calculateDistribution(config.tools, count);
    const bodyPartDistribution = this.calculateDistribution(config.bodyParts, count);
    const positionDistribution = this.calculateDistribution(config.positions, count);
    
    // 生成组合
    for (let i = 0; i < count; i++) {
      // 根据分布选择工具、部位、姿势
      const tool = this.selectByDistribution(config.tools, toolDistribution, i);
      const bodyPart = this.selectByDistribution(config.bodyParts, bodyPartDistribution, i);
      const position = this.selectByDistribution(config.positions, positionDistribution, i);
      
      // 确保工具强度不超过部位耐受性
      const finalTool = tool.intensity <= bodyPart.sensitivity ? tool : 
        config.tools.find(t => t.intensity <= bodyPart.sensitivity) || tool;
      
      // 惩罚次数完全随机，与工具/部位/姿势无关
      const strikes = Math.floor(Math.random() * config.maxStrikes) + 1;
      
      const combination: PunishmentAction = {
        tool: finalTool,
        bodyPart,
        position,
        strikes,
        description: `用${finalTool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`
      };
      
      combinations.push(combination);
    }
    
    return combinations;
  }

  // 计算分布
  private static calculateDistribution<T extends { ratio: number }>(items: T[], totalCount: number): number[] {
    const distribution: number[] = [];
    
    // 如果只有一个选项，直接分配所有数量
    if (items.length === 1) {
      distribution.push(totalCount);
      return distribution;
    }
    
    let remainingCount = totalCount;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const count = Math.round((item.ratio / 100) * totalCount);
      const actualCount = Math.min(count, remainingCount);
      distribution.push(actualCount);
      remainingCount -= actualCount;
    }
    
    // 如果还有剩余，分配给比例最高的项目
    while (remainingCount > 0) {
      const maxRatioIndex = items.reduce((maxIndex, item, index) => 
        item.ratio > items[maxIndex].ratio ? index : maxIndex, 0
      );
      distribution[maxRatioIndex]++;
      remainingCount--;
    }
    
    return distribution;
  }

  // 根据分布选择项目
  private static selectByDistribution<T extends { ratio: number }>(
    items: T[], 
    distribution: number[], 
    currentIndex: number
  ): T {
    let cumulativeCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      cumulativeCount += distribution[i];
      if (currentIndex < cumulativeCount) {
        return items[i];
      }
    }
    
    // 兜底返回第一个
    return items[0];
  }
} 