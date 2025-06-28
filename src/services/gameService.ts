import type {
  Player,
  BoardCell,
  PunishmentConfig,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentTool,
  PunishmentPosition,
  BoardConfig,
} from '../types/game'
import { GAME_CONFIG } from '../config/gameConfig'

export class GameService {
  static createBoard(punishmentConfig?: PunishmentConfig, boardConfig?: BoardConfig): BoardCell[] {
    // 1. 读取配置
    const config = punishmentConfig || this.createPunishmentConfig()
    const boardConf = boardConfig || GAME_CONFIG.DEFAULT_BOARD_CONFIG

    // 始终使用随机分配逻辑，确保所有格子都严格按照棋盘配置来生成
    return this.createBoardRandom(config, boardConf)
  }

  // 随机分配棋盘（自定义配置）
  private static createBoardRandom(config: PunishmentConfig, boardConf: BoardConfig): BoardCell[] {
    const totalCells = boardConf.totalCells

    const startPosition = 1
    const endPosition = totalCells

    // 所有位置
    const allPositions = Array.from({ length: totalCells }, (_, i) => i + 1)
    const availablePositions = allPositions.filter(
      pos => pos !== startPosition && pos !== endPosition
    )

    // 随机打乱
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availablePositions[i], availablePositions[j]] = [
        availablePositions[j],
        availablePositions[i],
      ]
    }

    const cellMap = new Map<number, BoardCell>()

    // 起点
    cellMap.set(startPosition, {
      id: startPosition,
      type: 'bonus',
      position: startPosition,
      effect: {
        type: 'move',
        value: 0,
        description: '起点',
      },
    })

    // 终点
    cellMap.set(endPosition, {
      id: endPosition,
      type: 'bonus',
      position: endPosition,
      effect: {
        type: 'move',
        value: 0,
        description: '终点 - 游戏胜利',
      },
    })

    const availableCount = totalCells - 2
    let currentIndex = 0

    // 惩罚格子
    const punishmentCount = Math.min(boardConf.punishmentCells, availableCount - currentIndex)
    const punishmentPositions = availablePositions.slice(
      currentIndex,
      currentIndex + punishmentCount
    )
    currentIndex += punishmentCount

    // 奖励格子
    const bonusCount = Math.min(boardConf.bonusCells, availableCount - currentIndex)
    const bonusPositions = availablePositions.slice(currentIndex, currentIndex + bonusCount)
    currentIndex += bonusCount

    // 后退格子
    const reverseCount = Math.min(boardConf.reverseCells, availableCount - currentIndex)
    const reversePositions = availablePositions.slice(currentIndex, currentIndex + reverseCount)
    currentIndex += reverseCount

    // 休息格子
    const restCount = Math.min(boardConf.restCells, availableCount - currentIndex)
    const restPositions = availablePositions.slice(currentIndex, currentIndex + restCount)
    currentIndex += restCount

    // 回到起点格子
    const restartCount = Math.min(boardConf.restartCells, availableCount - currentIndex)
    const restartPositions = availablePositions.slice(currentIndex, currentIndex + restartCount)
    currentIndex += restartCount

    // 填充惩罚格子
    punishmentPositions.forEach(pos => {
      const tool = this.selectByRatio(config.tools)
      const bodyPart = this.selectByRatio(config.bodyParts)
      const position = this.selectByRatio(config.positions)

      const punishment: PunishmentAction = {
        tool,
        bodyPart,
        position,
        description: `用${tool.name}打${bodyPart.name}，姿势：${position.name}`,
      }

      cellMap.set(pos, {
        id: pos,
        type: 'punishment',
        position: pos,
        effect: {
          type: 'punishment',
          value: 0,
          description: punishment.description,
          punishment,
        },
      })
    })

    // 奖励格子
    bonusPositions.forEach(pos => {
      const bonusTypes = [
        { value: 2, description: '前进2步' },
        { value: 3, description: '前进3步' },
      ]
      const randomBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)]

      cellMap.set(pos, {
        id: pos,
        type: 'bonus',
        position: pos,
        effect: {
          type: 'move',
          value: randomBonus.value,
          description: randomBonus.description,
        },
      })
    })

    // 后退格子
    reversePositions.forEach(pos => {
      const reverseTypes = [
        { type: 'reverse', value: 2, description: '后退2步' },
        { type: 'reverse', value: 3, description: '后退3步' },
      ]
      const randomReverse = reverseTypes[Math.floor(Math.random() * reverseTypes.length)]

      cellMap.set(pos, {
        id: pos,
        type: 'special',
        position: pos,
        effect: {
          type: randomReverse.type as 'reverse',
          value: randomReverse.value,
          description: randomReverse.description,
        },
      })
    })

    // 休息格子
    restPositions.forEach(pos => {
      cellMap.set(pos, {
        id: pos,
        type: 'special',
        position: pos,
        effect: {
          type: 'rest',
          value: 1,
          description: '休息1回合',
        },
      })
    })

    // 回到起点格子
    restartPositions.forEach(pos => {
      cellMap.set(pos, {
        id: pos,
        type: 'restart',
        position: pos,
        effect: {
          type: 'restart',
          value: 0,
          description: '回到起点',
        },
      })
    })

    // 为剩余的空位置创建普通格子（无效果）
    for (let i = 1; i <= totalCells; i++) {
      if (!cellMap.has(i)) {
        cellMap.set(i, {
          id: i,
          type: 'bonus',
          position: i,
          effect: {
            type: 'move',
            value: 0,
            description: '普通格子',
          },
        })
      }
    }

    const randomBoard: BoardCell[] = []
    for (let i = 1; i <= totalCells; i++) {
      const cell = cellMap.get(i)
      if (cell) {
        randomBoard.push(cell)
      }
    }

    this.logBoardStats(randomBoard, '自定义棋盘分配信息')

    return randomBoard
  }

  // 打印棋盘统计信息
  private static logBoardStats(board: BoardCell[], title: string): void {
    const punishmentCount = board.filter(c => c.type === 'punishment').length
    const bonusCount = board.filter(c => c.type === 'bonus').length
    const reverseCount = board.filter(
      c => c.type === 'special' && c.effect?.type === 'reverse'
    ).length
    const restCount = board.filter(c => c.type === 'special' && c.effect?.type === 'rest').length
    const restartCount = board.filter(c => c.type === 'restart').length

    console.log(title, {
      totalCells: board.length,
      punishmentCount,
      bonusCount,
      reverseCount,
      restCount,
      restartCount,
      totalAssigned: punishmentCount + bonusCount + reverseCount + restCount + restartCount,
    })

    // 输出每个格子
    board.forEach(cell => {
      console.log(`位置 ${cell.position}: ${cell.type} - ${cell.effect?.description || '无效果'}`)
    })
  }

  static createPlayers(): Player[] {
    const players: Player[] = []

    for (let i = 0; i < GAME_CONFIG.PLAYERS.DEFAULT_COUNT; i++) {
      players.push({
        id: i + 1,
        name: GAME_CONFIG.PLAYERS.NAMES[i],
        color: GAME_CONFIG.PLAYERS.COLORS[i],
        position: 0,
        isWinner: false,
        hasTakenOff: false,
      })
    }

    return players
  }

  static createPunishmentConfig(): PunishmentConfig {
    return {
      tools: [...GAME_CONFIG.DEFAULT_TOOLS],
      bodyParts: [...GAME_CONFIG.DEFAULT_BODY_PARTS],
      positions: [...GAME_CONFIG.DEFAULT_POSITIONS],
      minStrikes: GAME_CONFIG.DEFAULT_PUNISHMENT_STRIKES.min,
      maxStrikes: GAME_CONFIG.DEFAULT_PUNISHMENT_STRIKES.max,
    }
  }

  static createBoardConfig(): BoardConfig {
    return { ...GAME_CONFIG.DEFAULT_BOARD_CONFIG }
  }

  static validateBoardConfig(config: BoardConfig): boolean {
    const totalUsed =
      config.punishmentCells +
      config.bonusCells +
      config.reverseCells +
      config.restCells +
      config.restartCells

    return (
      totalUsed <= config.totalCells &&
      config.punishmentCells >= 0 &&
      config.bonusCells >= 0 &&
      config.reverseCells >= 0 &&
      config.restCells >= 0 &&
      config.restartCells >= 0 &&
      config.totalCells >= 20
    )
  }

  static rollDice(): number {
    return (
      Math.floor(Math.random() * (GAME_CONFIG.DICE.MAX_VALUE - GAME_CONFIG.DICE.MIN_VALUE + 1)) +
      GAME_CONFIG.DICE.MIN_VALUE
    )
  }

  static movePlayer(
    player: Player,
    diceValue: number,
    board: BoardCell[],
    currentPlayerIndex: number,
    totalPlayers: number,
    punishmentConfig: PunishmentConfig
  ): {
    newPosition: number
    effect?: string
    punishment?: PunishmentAction
    targetPlayerIndex?: number
    cellEffect?: BoardCell['effect']
    canTakeOff?: boolean
    executorIndex?: number
  } {
    // 设置移动动画状态
    player.isMoving = true

    // 延迟清除移动动画状态 - 使用更可靠的方式
    const clearMovingState = () => {
      player.isMoving = false
    }

    // 设置定时器清除移动状态
    const movingTimer = setTimeout(clearMovingState, 600) // 与CSS动画时长匹配

    let newPosition = player.position
    let effect: string | undefined
    let punishment: PunishmentAction | undefined
    let targetPlayerIndex: number | undefined
    let cellEffect: BoardCell['effect'] = undefined
    let canTakeOff = false
    let executorIndex: number | undefined

    // 获取棋盘大小
    const boardSize = board.length

    // 检查是否在起点且未起飞
    if (player.position === 0 && !player.hasTakenOff) {
      if (diceValue === 6) {
        // 起飞成功
        player.hasTakenOff = true
        newPosition = 1 // 移动到第一个格子
        effect = '起飞成功！移动到第1格'
        canTakeOff = true
      } else {
        // 未起飞，触发惩罚
        const tool = this.selectByRatio(punishmentConfig.tools)
        const bodyPart = this.selectByRatio(punishmentConfig.bodyParts)
        const position = this.selectByRatio(punishmentConfig.positions)

        // 计算惩罚执行者
        const otherPlayersCount = totalPlayers - 1
        if (otherPlayersCount > 0) {
          executorIndex = diceValue % otherPlayersCount
        }

        punishment = {
          tool,
          bodyPart,
          position,
          description: `未起飞，被惩罚：${tool.name} ${bodyPart.name} ${position.name}`,
        }

        effect = `未起飞！被惩罚`

        // 确保清除移动状态
        clearTimeout(movingTimer)
        clearMovingState()

        return {
          newPosition,
          effect,
          punishment,
          targetPlayerIndex,
          cellEffect,
          canTakeOff,
          executorIndex,
        }
      }
    } else {
      // 已经起飞，正常移动
      newPosition = player.position + diceValue

      // 处理环形移动
      if (newPosition > boardSize) {
        newPosition = boardSize // 到达终点
      }
    }

    // 检查新位置的格子效果
    const targetCell = board.find(cell => cell.position === newPosition)
    if (targetCell && targetCell.effect) {
      // 如果到达终点，不触发任何格子效果
      if (newPosition === boardSize) {
        effect = '到达终点！游戏胜利！'

        // 确保清除移动状态
        clearTimeout(movingTimer)
        clearMovingState()

        return {
          newPosition,
          effect,
          punishment,
          targetPlayerIndex,
          cellEffect,
          canTakeOff,
          executorIndex,
        }
      }

      // 如果到达第1格（飞机场），不触发任何格子效果
      if (newPosition === 1) {
        effect = '到达飞机场！安全区域'

        // 确保清除移动状态
        clearTimeout(movingTimer)
        clearMovingState()

        return {
          newPosition,
          effect,
          punishment,
          targetPlayerIndex,
          cellEffect,
          canTakeOff,
          executorIndex,
        }
      }

      cellEffect = targetCell.effect

      switch (targetCell.effect.type) {
        case 'punishment':
          if (targetCell.effect.punishment) {
            punishment = targetCell.effect.punishment
            effect = `触发惩罚：${targetCell.effect.punishment.tool.name} ${targetCell.effect.punishment.bodyPart.name} ${targetCell.effect.punishment.position.name}`
          }
          break

        case 'move':
          // 不在这里应用移动效果，只返回效果信息
          effect = `移动到第${newPosition}格，触发前进${targetCell.effect.value}步效果`
          break

        case 'reverse':
          // 不在这里应用后退效果，只返回效果信息
          effect = `移动到第${newPosition}格，触发后退${targetCell.effect.value}步效果`
          break

        case 'restart':
          // 不在这里应用回到起点效果，只返回效果信息
          effect = `移动到第${newPosition}格，触发回到起点效果`
          break

        case 'rest':
          effect = `移动到第${newPosition}格，休息${targetCell.effect.value}回合`
          break
      }
    }

    // 确保清除移动状态
    clearTimeout(movingTimer)
    clearMovingState()

    return {
      newPosition,
      effect,
      punishment,
      targetPlayerIndex,
      cellEffect,
      canTakeOff,
      executorIndex,
    }
  }

  // 处理格子效果（第二步）
  static processCellEffect(
    player: Player,
    cellEffect: BoardCell['effect'],
    boardSize: number = 40
  ): { newPosition: number; effect: string; fromPosition: number; toPosition: number } {
    if (!cellEffect) {
      return {
        newPosition: player.position,
        effect: '无效果',
        fromPosition: player.position,
        toPosition: player.position,
      }
    }

    const fromPosition = player.position
    let newPosition = player.position
    let effect = ''

    switch (cellEffect.type) {
      case 'move':
        newPosition = Math.min(player.position + cellEffect.value, boardSize)
        effect = cellEffect.description || `前进${cellEffect.value}步`
        break
      case 'reverse':
        newPosition = Math.max(player.position - cellEffect.value, 1)
        effect = cellEffect.description || `后退${cellEffect.value}步`
        break
      case 'rest':
        newPosition = player.position
        effect = cellEffect.description || `休息${cellEffect.value}回合`
        break
      case 'restart':
        newPosition = 1
        effect = cellEffect.description || '回到起点'
        break
      case 'punishment':
        newPosition = player.position
        effect = cellEffect.description || '接受惩罚'
        break
      default:
        newPosition = player.position
        effect = '未知效果'
    }

    return {
      newPosition,
      effect,
      fromPosition,
      toPosition: newPosition,
    }
  }

  static checkWinner(player: Player, boardSize: number = 40): boolean {
    return player.position >= boardSize
  }

  static getNextPlayer(currentIndex: number, totalPlayers: number): number {
    return (currentIndex + 1) % totalPlayers
  }

  // 获取玩家在环形棋盘上的显示位置
  static getPlayerDisplayPosition(position: number): { row: number; col: number } {
    if (position === 0) return { row: -1, col: -1 } // 起始位置

    // 环形布局：外圈-内圈
    const outerRing = 20 // 外圈20格
    const innerRing = 20 // 内圈20格

    if (position <= outerRing) {
      // 外圈：5x4的矩形
      const index = position - 1
      const row = Math.floor(index / 5)
      const col = index % 5
      return { row, col }
    } else if (position <= outerRing + innerRing) {
      // 内圈：5x4的矩形
      const index = position - outerRing - 1
      const row = Math.floor(index / 5) + 1
      const col = (index % 5) + 1
      return { row, col }
    } else {
      // 超出范围，返回默认位置
      return { row: 0, col: 0 }
    }
  }

  // 检查是否为特殊格子
  static isSpecialCell(position: number): boolean {
    return (
      position in GAME_CONFIG.PUNISHMENT_CELLS ||
      position in GAME_CONFIG.BONUS_CELLS ||
      position in GAME_CONFIG.REVERSE_CELLS ||
      position in GAME_CONFIG.REST_CELLS
    )
  }

  // 获取格子类型
  static getCellType(position: number): 'punishment' | 'bonus' | 'special' | 'restart' {
    if (
      position in GAME_CONFIG.PUNISHMENT_CELLS ||
      position in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS
    ) {
      return 'punishment'
    } else if (position in GAME_CONFIG.BONUS_CELLS) {
      return 'bonus'
    } else if (position in GAME_CONFIG.REVERSE_CELLS || position in GAME_CONFIG.REST_CELLS) {
      return 'special'
    } else if (position in GAME_CONFIG.RESTART_CELLS) {
      return 'restart'
    }
    return 'punishment' // 默认返回惩罚格子
  }

  // 根据比例随机选择项目
  static selectByRatio<T extends { ratio: number }>(items: T[]): T {
    const validItems = items.filter(it => it.ratio > 0)
    const list = validItems.length > 0 ? validItems : items
    const totalRatio = list.reduce((sum, item) => sum + item.ratio, 0)
    if (totalRatio === 0) return list[0]
    const random = Math.random() * totalRatio
    let currentSum = 0
    for (const item of list) {
      currentSum += item.ratio
      if (random <= currentSum) {
        return item
      }
    }
    return list[0]
  }

  // 生成带随机惩罚次数的组合
  private static createPunishmentCombination(
    tool: PunishmentTool,
    bodyPart: PunishmentBodyPart,
    position: PunishmentPosition,
    config: PunishmentConfig
  ): PunishmentAction {
    // 在配置的范围内随机生成惩罚次数
    const minStrikes = Math.max(1, config.minStrikes || 10)
    const maxStrikes = Math.max(minStrikes, config.maxStrikes || 30)
    const strikes = Math.floor(Math.random() * (maxStrikes - minStrikes + 1)) + minStrikes

    return {
      tool,
      bodyPart,
      position,
      strikes,
      description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
    }
  }

  // 生成随机惩罚组合
  static generateRandomPunishment(config: PunishmentConfig): PunishmentAction {
    // 随机选择工具
    const tool = this.selectByRatio(config.tools)

    // 根据工具强度选择合适的部位
    const validBodyParts = config.bodyParts.filter(b => b.sensitivity >= tool.intensity)
    let bodyPart: PunishmentBodyPart
    if (validBodyParts.length > 0) {
      bodyPart = this.selectByRatio(validBodyParts)
    } else {
      // 如果没有合适的部位，选择耐受度最高的部位
      bodyPart = config.bodyParts.reduce((max, current) =>
        current.sensitivity > max.sensitivity ? current : max
      )
    }

    // 随机选择姿势
    const position = this.selectByRatio(config.positions)

    // 在配置的范围内随机生成惩罚次数
    const minStrikes = Math.max(1, config.minStrikes || 10)
    const maxStrikes = Math.max(minStrikes, config.maxStrikes || 30)
    const strikes = Math.floor(Math.random() * (maxStrikes - minStrikes + 1)) + minStrikes

    return {
      tool,
      bodyPart,
      position,
      strikes,
      description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
    }
  }

  // 验证惩罚配置的合理性
  static validatePunishmentConfig(config: PunishmentConfig): {
    isValid: boolean
    errorMessage?: string
    requiredSensitivity?: number
  } {
    // 检查是否有可用的工具和部位组合
    for (const tool of config.tools) {
      const hasValidBodyPart = config.bodyParts.some(b => b.sensitivity >= tool.intensity)
      if (!hasValidBodyPart) {
        return {
          isValid: false,
          errorMessage: `工具"${tool.name}"的强度(${tool.intensity})过高，没有部位可以承受。需要耐受度至少为${tool.intensity}的部位。`,
          requiredSensitivity: tool.intensity,
        }
      }
    }

    for (const bodyPart of config.bodyParts) {
      const hasValidTool = config.tools.some(t => t.intensity <= bodyPart.sensitivity)
      if (!hasValidTool) {
        return {
          isValid: false,
          errorMessage: `部位"${bodyPart.name}"的耐受度(${bodyPart.sensitivity})过低，没有工具可以使用。需要强度不超过${bodyPart.sensitivity}的工具。`,
        }
      }
    }

    return { isValid: true }
  }

  // 应用均等比例
  static applyEqualRatio(config: PunishmentConfig): void {
    const toolRatio = 100 / config.tools.length
    const bodyPartRatio = 100 / config.bodyParts.length
    const positionRatio = 100 / config.positions.length

    config.tools.forEach(tool => (tool.ratio = toolRatio))
    config.bodyParts.forEach(bodyPart => (bodyPart.ratio = bodyPartRatio))
    config.positions.forEach(position => (position.ratio = positionRatio))
  }

  // 生成多个惩罚组合供玩家确认
  static generatePunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    const combinations: PunishmentAction[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = config.tools.filter(tool => tool.ratio > 0)
    const validBodyParts = config.bodyParts.filter(bodyPart => bodyPart.ratio > 0)
    const validPositions = config.positions.filter(position => position.ratio > 0)

    // 如果任何一类没有有效配置，返回空数组
    if (validTools.length === 0 || validBodyParts.length === 0 || validPositions.length === 0) {
      return []
    }

    // 生成所有可能的有效组合（优先考虑强度限制）
    const allPossibleCombinations: PunishmentAction[] = []

    for (const tool of validTools) {
      for (const bodyPart of validBodyParts) {
        // 检查工具强度是否适合部位耐受度
        if (tool.intensity <= bodyPart.sensitivity) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombination(tool, bodyPart, position, config)
            allPossibleCombinations.push(combination)
          }
        }
      }
    }

    // 如果严格限制下的组合数量不足，放宽强度限制（但仍然只使用有效配置）
    if (allPossibleCombinations.length < count) {
      allPossibleCombinations.length = 0 // 清空数组
      for (const tool of validTools) {
        for (const bodyPart of validBodyParts) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombination(tool, bodyPart, position, config)
            allPossibleCombinations.push(combination)
          }
        }
      }
    }

    // 如果还是没有组合，返回空数组
    if (allPossibleCombinations.length === 0) {
      return []
    }

    // 随机打乱所有可能的组合
    const shuffledCombinations = [...allPossibleCombinations].sort(() => Math.random() - 0.5)

    // 选择前count个不重复的组合
    for (const combination of shuffledCombinations) {
      if (combinations.length >= count) break

      const combinationKey = `${combination.tool.id}-${combination.bodyPart.id}-${combination.position.id}`

      if (!usedCombinations.has(combinationKey)) {
        usedCombinations.add(combinationKey)
        combinations.push(combination)
      }
    }

    // 如果还是不够，允许重复（但仍然只使用有效配置）
    if (combinations.length < count) {
      const remainingCount = count - combinations.length
      for (let i = 0; i < remainingCount; i++) {
        const randomCombination =
          shuffledCombinations[Math.floor(Math.random() * shuffledCombinations.length)]
        combinations.push(randomCombination)
      }
    }

    return combinations
  }

  // 根据确认的组合更新棋盘
  static updateBoardWithConfirmedCombinations(
    board: BoardCell[],
    combinations: PunishmentAction[]
  ): BoardCell[] {
    const updatedBoard = [...board]

    // 获取所有惩罚格子的位置（基于实际棋盘）
    const punishmentCells = updatedBoard.filter(cell => cell.type === 'punishment')
    const punishmentPositions = punishmentCells.map(cell => cell.position)

    // 为每个惩罚格子分配一个确认的组合（组合可以重复使用）
    punishmentPositions.forEach((position, index) => {
      const cell = updatedBoard.find(c => c.position === position)
      if (cell && combinations.length > 0) {
        // 如果组合数量少于格子数量，循环使用组合
        const combinationIndex = index % combinations.length
        const combination = combinations[combinationIndex]

        // 检查是否为动态惩罚格子（基于预定义配置）
        if (position in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS) {
          const dynamicConfig =
            GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS[
              position as keyof typeof GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS
            ]
          combination.dynamicType = dynamicConfig.type as
            | 'dice_multiplier'
            | 'previous_player'
            | 'next_player'
            | 'other_player_choice'
          combination.multiplier =
            'multiplier' in dynamicConfig ? dynamicConfig.multiplier : undefined

          // 更新描述
          switch (combination.dynamicType) {
            case 'dice_multiplier':
              if (combination.multiplier) {
                combination.description = `用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}（骰子点数×${combination.multiplier}）`
              }
              break
            case 'previous_player':
              combination.description = `上一个玩家：用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}`
              break
            case 'next_player':
              combination.description = `下一个玩家：用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}`
              break
            case 'other_player_choice':
              combination.description = `用${combination.tool.name}打${combination.bodyPart.name}，姿势：${combination.position.name}（数量由其他玩家决定）`
              break
          }
        }

        cell.effect = {
          type: 'punishment',
          value: 0,
          description: combination.description,
          punishment: combination,
          dynamicType: combination.dynamicType,
          multiplier: combination.multiplier,
        }
      }
    })

    return updatedBoard
  }

  // 生成更符合用户偏好的惩罚组合
  static generateBalancedPunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    const combinations: PunishmentAction[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = config.tools.filter(tool => tool.ratio > 0)
    const validBodyParts = config.bodyParts.filter(bodyPart => bodyPart.ratio > 0)
    const validPositions = config.positions.filter(position => position.ratio > 0)

    // 如果任何一类没有有效配置，返回空数组
    if (validTools.length === 0 || validBodyParts.length === 0 || validPositions.length === 0) {
      return []
    }

    // 生成所有可能的有效组合（优先考虑强度限制）
    const allPossibleCombinations: PunishmentAction[] = []

    for (const tool of validTools) {
      for (const bodyPart of validBodyParts) {
        // 检查工具强度是否适合部位耐受度
        if (tool.intensity <= bodyPart.sensitivity) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombination(tool, bodyPart, position, config)
            allPossibleCombinations.push(combination)
          }
        }
      }
    }

    // 如果严格限制下的组合数量不足，放宽强度限制（但仍然只使用有效配置）
    if (allPossibleCombinations.length < count) {
      allPossibleCombinations.length = 0 // 清空数组
      for (const tool of validTools) {
        for (const bodyPart of validBodyParts) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombination(tool, bodyPart, position, config)
            allPossibleCombinations.push(combination)
          }
        }
      }
    }

    // 如果组合数量仍然不足，直接返回所有可能的组合
    if (allPossibleCombinations.length <= count) {
      return allPossibleCombinations
    }

    // 确保工具、部位、姿势的分布符合用户设置的比例（仅使用有效配置）
    const toolDistribution = this.calculateDistribution(validTools, count)
    const positionDistribution = this.calculateDistribution(validPositions, count)

    // 按比例选择组合
    let attempts = 0
    const maxAttempts = count * 5

    while (combinations.length < count && attempts < maxAttempts) {
      // 根据分布选择工具
      const tool = this.selectByDistribution(validTools, toolDistribution, combinations.length)

      // 根据工具强度选择合适的部位（考虑比例，但仅在有效部位中选择）
      const validBodyPartsForTool = validBodyParts.filter(b => b.sensitivity >= tool.intensity)
      let bodyPart: PunishmentBodyPart
      if (validBodyPartsForTool.length > 0) {
        // 在有效部位中按比例选择
        bodyPart = this.selectByRatio(validBodyPartsForTool)
      } else {
        // 如果没有合适的部位，选择耐受度最高的有效部位
        bodyPart = validBodyParts.reduce((max, current) =>
          current.sensitivity > max.sensitivity ? current : max
        )
      }

      // 根据分布选择姿势
      const position = this.selectByDistribution(
        validPositions,
        positionDistribution,
        combinations.length
      )

      // 创建组合的唯一标识符
      const combinationKey = `${tool.id}-${bodyPart.id}-${position.id}`

      // 检查是否已经存在相同的组合
      if (!usedCombinations.has(combinationKey)) {
        usedCombinations.add(combinationKey)

        const combination = this.createPunishmentCombination(tool, bodyPart, position, config)

        combinations.push(combination)
      }

      attempts++
    }

    // 如果按比例选择后还是不够，从所有可能组合中随机补充
    if (combinations.length < count) {
      const shuffledCombinations = [...allPossibleCombinations].sort(() => Math.random() - 0.5)

      for (const combination of shuffledCombinations) {
        if (combinations.length >= count) break

        const combinationKey = `${combination.tool.id}-${combination.bodyPart.id}-${combination.position.id}`

        if (!usedCombinations.has(combinationKey)) {
          usedCombinations.add(combinationKey)
          combinations.push(combination)
        }
      }
    }

    return combinations
  }

  // 计算分布
  private static calculateDistribution<T extends { ratio: number }>(
    items: T[],
    totalCount: number
  ): number[] {
    const distribution: number[] = []

    // 如果只有一个选项，直接分配所有数量
    if (items.length === 1) {
      distribution.push(totalCount)
      return distribution
    }

    let remainingCount = totalCount

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const count = Math.round((item.ratio / 100) * totalCount)
      const actualCount = Math.min(count, remainingCount)
      distribution.push(actualCount)
      remainingCount -= actualCount
    }

    // 如果还有剩余，分配给比例最高的项目
    while (remainingCount > 0) {
      const maxRatioIndex = items.reduce(
        (maxIndex, item, index) => (item.ratio > items[maxIndex].ratio ? index : maxIndex),
        0
      )
      distribution[maxRatioIndex]++
      remainingCount--
    }

    return distribution
  }

  // 根据分布选择项目
  private static selectByDistribution<T extends { ratio: number }>(
    items: T[],
    distribution: number[],
    currentIndex: number
  ): T {
    let cumulativeCount = 0

    for (let i = 0; i < items.length; i++) {
      cumulativeCount += distribution[i]
      if (currentIndex < cumulativeCount) {
        return items[i]
      }
    }

    // 兜底返回第一个
    return items[0]
  }
}
