import type {
  Player,
  BoardCell,
  PunishmentConfig,
  PunishmentAction,
  PunishmentCombination,
  PunishmentBodyPart,
  PunishmentTool,
  PunishmentPosition,
  BoardConfig,
  TrapAction,
} from '../types/game'
import { GAME_CONFIG } from '../config/gameConfig'

export class GameService {
  static createBoard(
    punishmentConfig?: PunishmentConfig,
    boardConfig?: BoardConfig,
    customTraps?: TrapAction[]
  ): BoardCell[] {
    // 1. 读取配置
    const config = punishmentConfig || this.createPunishmentConfig()
    const boardConf = boardConfig || GAME_CONFIG.DEFAULT_BOARD_CONFIG
    const traps = customTraps || this.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)

    // 始终使用随机分配逻辑，确保所有格子都严格按照棋盘配置来生成
    return this.createBoardRandom(config, boardConf, traps)
  }

  // 随机分配棋盘（自定义配置）
  private static createBoardRandom(
    config: PunishmentConfig,
    boardConf: BoardConfig,
    traps: TrapAction[]
  ): BoardCell[] {
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

    // 机关格子
    const trapCount = Math.min(boardConf.trapCells, availableCount - currentIndex)
    const trapPositions = availablePositions.slice(currentIndex, currentIndex + trapCount)
    currentIndex += trapCount

    // 填充惩罚格子
    punishmentPositions.forEach(pos => {
      const tool = this.selectByRatio(this.configToArray(config.tools))
      const bodyPart = this.selectByRatio(this.configToArray(config.bodyParts))
      const position = this.selectByRatio(this.configToArray(config.positions))

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

    // 机关格子
    trapPositions.forEach(pos => {
      // 从机关中随机选择一个
      const randomTrap = traps[Math.floor(Math.random() * traps.length)]

      cellMap.set(pos, {
        id: pos,
        type: 'trap',
        position: pos,
        effect: {
          type: 'trap',
          value: 0,
          description: randomTrap.description,
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
    const trapCount = board.filter(c => c.type === 'trap').length

    console.log(title, {
      totalCells: board.length,
      punishmentCount,
      bonusCount,
      reverseCount,
      restCount,
      restartCount,
      trapCount,
      totalAssigned:
        punishmentCount + bonusCount + reverseCount + restCount + restartCount + trapCount,
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
        failedTakeoffAttempts: 0,
      })
    }

    return players
  }

  static createCustomPlayers(count: number, names: string[]): Player[] {
    const players: Player[] = []
    const colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#feca57',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
    ]

    for (let i = 0; i < count; i++) {
      players.push({
        id: i + 1,
        name: names[i] || `玩家${i + 1}`,
        color: colors[i % colors.length],
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      })
    }

    return players
  }

  static createPunishmentConfig(): PunishmentConfig {
    // 将配置对象转换为包含 name 属性的格式
    const tools: Record<string, PunishmentTool> = {}
    Object.entries(GAME_CONFIG.DEFAULT_TOOLS).forEach(([name, tool]) => {
      tools[name] = { ...tool, name }
    })

    const bodyParts: Record<string, PunishmentBodyPart> = {}
    Object.entries(GAME_CONFIG.DEFAULT_BODY_PARTS).forEach(([name, bodyPart]) => {
      bodyParts[name] = { ...bodyPart, name }
    })

    const positions: Record<string, PunishmentPosition> = {}
    Object.entries(GAME_CONFIG.DEFAULT_POSITIONS).forEach(([name, position]) => {
      positions[name] = { ...position, name }
    })

    return {
      tools,
      bodyParts,
      positions,
      minStrikes: GAME_CONFIG.DEFAULT_PUNISHMENT_STRIKES.min,
      maxStrikes: GAME_CONFIG.DEFAULT_PUNISHMENT_STRIKES.max,
      step: GAME_CONFIG.DEFAULT_PUNISHMENT_STRIKES.step,
      maxTakeoffFailures: 5,
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
      config.restartCells +
      config.trapCells

    return (
      totalUsed <= config.totalCells &&
      config.punishmentCells >= 0 &&
      config.bonusCells >= 0 &&
      config.reverseCells >= 0 &&
      config.restCells >= 0 &&
      config.restartCells >= 0 &&
      config.trapCells >= 0 &&
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
    forcedTakeoffDueToFailure?: boolean
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
        player.failedTakeoffAttempts = 0 // 重置失败计数
        newPosition = 1 // 移动到第一个格子
        effect = '起飞成功！移动到第1格'
        canTakeOff = true
      } else {
        // 未起飞，触发惩罚或强制起飞判断

        // 记录起飞失败次数
        player.failedTakeoffAttempts = (player.failedTakeoffAttempts || 0) + 1

        // 判断是否达到最大失败次数，直接起飞
        if (
          punishmentConfig.maxTakeoffFailures !== undefined &&
          player.failedTakeoffAttempts >= punishmentConfig.maxTakeoffFailures
        ) {
          player.hasTakenOff = true
          player.failedTakeoffAttempts = 0
          newPosition = 1
          effect = `运气太差，连续${punishmentConfig.maxTakeoffFailures}次未起飞，自动起飞！移动到第1格`
          canTakeOff = true

          // 返回特殊标记 forcedTakeoffDueToFailure
          clearTimeout(movingTimer)
          clearMovingState()

          return {
            newPosition,
            effect,
            punishment: undefined,
            targetPlayerIndex,
            cellEffect,
            canTakeOff,
            executorIndex,
            forcedTakeoffDueToFailure: true,
          }
        }

        // 未达到上限，继续惩罚流程
        const tool = this.selectByRatio(this.configToArray(punishmentConfig.tools))
        const bodyPart = this.selectByRatio(this.configToArray(punishmentConfig.bodyParts))
        const position = this.selectByRatio(this.configToArray(punishmentConfig.positions))

        // 生成惩罚次数，确保是步长的倍数
        const minStrikes = Math.max(1, punishmentConfig.minStrikes || 10)
        const maxStrikes = Math.max(minStrikes, punishmentConfig.maxStrikes || 30)
        const step = punishmentConfig.step || 5

        // 确保最小值和最大值都是步长的倍数
        const minMultiple = Math.ceil(minStrikes / step)
        const maxMultiple = Math.floor(maxStrikes / step)

        // 在有效的倍数范围内随机选择
        const randomMultiple =
          Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple
        const strikes = randomMultiple * step

        // 计算惩罚执行者 - 等概率随机选择其他玩家
        const otherPlayersCount = totalPlayers - 1
        if (otherPlayersCount > 0) {
          // 创建其他玩家的索引数组（排除当前玩家）
          const otherPlayerIndices = []
          for (let i = 0; i < totalPlayers; i++) {
            if (i !== currentPlayerIndex) {
              otherPlayerIndices.push(i)
            }
          }
          // 等概率随机选择一个其他玩家
          const randomIndex = Math.floor(Math.random() * otherPlayerIndices.length)
          executorIndex = otherPlayerIndices[randomIndex]
        }

        punishment = {
          tool,
          bodyPart,
          position,
          strikes,
          description: `未起飞，被惩罚：用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
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

        case 'trap':
          // 机关格子直接使用描述内容，不再生成随机惩罚
          effect = `💀 触发机关陷阱！${targetCell.effect.description}`
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
      case 'trap':
        newPosition = player.position
        effect = cellEffect.description || '触发机关'
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
  static getCellType(position: number): 'punishment' | 'bonus' | 'special' | 'restart' | 'trap' {
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

  // 将配置对象转换为数组（添加 name 属性）
  static configToArray<T extends { ratio: number }>(
    config: Record<string, T>
  ): Array<T & { name: string }> {
    return Object.entries(config).map(([name, item]) => ({
      ...item,
      name,
    }))
  }

  // 将 trap 配置对象转换为数组
  static trapsToArray(config: Record<string, { description: string }>): TrapAction[] {
    return Object.entries(config).map(([name, item]) => ({
      name,
      description: item.description,
    }))
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

  // 创建惩罚组合定义（不包含次数）
  private static createPunishmentCombinationDefinition(
    tool: PunishmentTool,
    bodyPart: PunishmentBodyPart,
    position: PunishmentPosition
  ): PunishmentCombination {
    return {
      tool,
      bodyPart,
      position,
      description: `用${tool.name}打${bodyPart.name}，姿势：${position.name}`,
    }
  }

  // 生成带随机惩罚次数的组合（保留原有方法用于兼容性）
  private static createPunishmentCombination(
    tool: PunishmentTool,
    bodyPart: PunishmentBodyPart,
    position: PunishmentPosition,
    config: PunishmentConfig
  ): PunishmentAction {
    // 在配置的范围内随机生成惩罚次数，确保是步长的倍数
    const minStrikes = Math.max(1, config.minStrikes || 10)
    const maxStrikes = Math.max(minStrikes, config.maxStrikes || 30)
    const step = config.step || 5

    // 确保最小值和最大值都是步长的倍数
    const minMultiple = Math.ceil(minStrikes / step)
    const maxMultiple = Math.floor(maxStrikes / step)

    // 在有效的倍数范围内随机选择
    const randomMultiple = Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple
    const strikes = randomMultiple * step

    return {
      tool,
      bodyPart,
      position,
      strikes,
      description: `用${tool.name}打${bodyPart.name}${strikes}下，姿势：${position.name}`,
    }
  }

  // 从惩罚组合定义生成带次数的惩罚动作
  private static createPunishmentActionFromCombination(
    combination: PunishmentCombination,
    config: PunishmentConfig
  ): PunishmentAction {
    // 在配置的范围内随机生成惩罚次数，确保是步长的倍数
    const minStrikes = Math.max(1, config.minStrikes || 10)
    const maxStrikes = Math.max(minStrikes, config.maxStrikes || 30)
    const step = config.step || 5

    // 确保最小值和最大值都是步长的倍数
    const minMultiple = Math.ceil(minStrikes / step)
    const maxMultiple = Math.floor(maxStrikes / step)

    // 在有效的倍数范围内随机选择
    const randomMultiple = Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple
    const strikes = randomMultiple * step

    return {
      tool: combination.tool,
      bodyPart: combination.bodyPart,
      position: combination.position,
      strikes,
      description: `用${combination.tool.name}打${combination.bodyPart.name}${strikes}下，姿势：${combination.position.name}`,
    }
  }

  // 生成随机惩罚组合
  static generateRandomPunishment(config: PunishmentConfig): PunishmentAction {
    // 随机选择工具
    const toolsArray = this.configToArray(config.tools)
    const tool = this.selectByRatio(toolsArray)

    // 根据工具强度选择合适的部位
    const bodyPartsArray = this.configToArray(config.bodyParts)
    const validBodyParts = bodyPartsArray.filter(b => b.sensitivity >= tool.intensity)
    let bodyPart: PunishmentBodyPart & { name: string }
    if (validBodyParts.length > 0) {
      bodyPart = this.selectByRatio(validBodyParts)
    } else {
      // 如果没有合适的部位，选择耐受度最高的部位
      bodyPart = bodyPartsArray.reduce((max, current) =>
        current.sensitivity > max.sensitivity ? current : max
      )
    }

    // 随机选择姿势
    const positionsArray = this.configToArray(config.positions)
    const position = this.selectByRatio(positionsArray)

    // 在配置的范围内随机生成惩罚次数，确保是步长的倍数
    const minStrikes = Math.max(1, config.minStrikes || 10)
    const maxStrikes = Math.max(minStrikes, config.maxStrikes || 30)
    const step = config.step || 5

    // 确保最小值和最大值都是步长的倍数
    const minMultiple = Math.ceil(minStrikes / step)
    const maxMultiple = Math.floor(maxStrikes / step)

    // 在有效的倍数范围内随机选择
    const randomMultiple = Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple
    const strikes = randomMultiple * step

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
    const toolsArray = this.configToArray(config.tools)
    const bodyPartsArray = this.configToArray(config.bodyParts)

    for (const tool of toolsArray) {
      const hasValidBodyPart = bodyPartsArray.some(b => b.sensitivity >= tool.intensity)
      if (!hasValidBodyPart) {
        return {
          isValid: false,
          errorMessage: `工具"${tool.name}"的强度(${tool.intensity})过高，没有部位可以承受。需要耐受度至少为${tool.intensity}的部位。`,
          requiredSensitivity: tool.intensity,
        }
      }
    }

    for (const bodyPart of bodyPartsArray) {
      const hasValidTool = toolsArray.some(t => t.intensity <= bodyPart.sensitivity)
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
    const toolsArray = Object.keys(config.tools)
    const bodyPartsArray = Object.keys(config.bodyParts)
    const positionsArray = Object.keys(config.positions)

    const toolRatio = 100 / toolsArray.length
    const bodyPartRatio = 100 / bodyPartsArray.length
    const positionRatio = 100 / positionsArray.length

    Object.values(config.tools).forEach(tool => (tool.ratio = toolRatio))
    Object.values(config.bodyParts).forEach(bodyPart => (bodyPart.ratio = bodyPartRatio))
    Object.values(config.positions).forEach(position => (position.ratio = positionRatio))
  }

  // 生成多个惩罚组合定义供玩家确认（不包含次数）
  static generatePunishmentCombinationDefinitions(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentCombination[] {
    const combinations: PunishmentCombination[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = this.configToArray(config.tools).filter(tool => tool.ratio > 0)
    const validBodyParts = this.configToArray(config.bodyParts).filter(
      bodyPart => bodyPart.ratio > 0
    )
    const validPositions = this.configToArray(config.positions).filter(
      position => position.ratio > 0
    )

    // 如果任何一类没有有效配置，返回空数组
    if (validTools.length === 0 || validBodyParts.length === 0 || validPositions.length === 0) {
      return []
    }

    // 生成所有可能的有效组合（优先考虑强度限制）
    const allPossibleCombinations: PunishmentCombination[] = []

    for (const tool of validTools) {
      for (const bodyPart of validBodyParts) {
        // 检查工具强度是否适合部位耐受度
        if (tool.intensity <= bodyPart.sensitivity) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombinationDefinition(tool, bodyPart, position)
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
            const combination = this.createPunishmentCombinationDefinition(tool, bodyPart, position)
            allPossibleCombinations.push(combination)
          }
        }
      }
    }

    // 如果组合数量仍然不足，直接返回所有可能的组合
    if (allPossibleCombinations.length <= count) {
      return allPossibleCombinations
    }

    // 随机选择指定数量的组合，确保不重复
    const shuffled = [...allPossibleCombinations].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const combination = shuffled[i]
      const key = `${combination.tool.name}-${combination.bodyPart.name}-${combination.position.name}`
      if (!usedCombinations.has(key)) {
        combinations.push(combination)
        usedCombinations.add(key)
      }
    }

    return combinations
  }

  // 生成多个惩罚组合供玩家确认（保留原有方法用于兼容性）
  static generatePunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    const combinations: PunishmentAction[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = this.configToArray(config.tools).filter(tool => tool.ratio > 0)
    const validBodyParts = this.configToArray(config.bodyParts).filter(
      bodyPart => bodyPart.ratio > 0
    )
    const validPositions = this.configToArray(config.positions).filter(
      position => position.ratio > 0
    )

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

      const combinationKey = `${combination.tool.name}-${combination.bodyPart.name}-${combination.position.name}`

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

  // 获取指定位置周围窗口内的惩罚组合
  private static getWindowCombinations(
    board: BoardCell[],
    currentPosition: number,
    windowSize: number = 6
  ): PunishmentCombination[] {
    const windowCombinations: PunishmentCombination[] = []
    const halfWindow = Math.floor(windowSize / 2)

    // 获取所有惩罚格子，按位置排序
    const punishmentCells = board
      .filter(cell => cell.type === 'punishment' && cell.effect?.punishment)
      .sort((a, b) => a.position - b.position)

    // 找到当前位置在排序后数组中的索引
    const currentIndex = punishmentCells.findIndex(cell => cell.position === currentPosition)
    if (currentIndex === -1) return windowCombinations

    // 获取窗口范围内的组合
    const startIndex = Math.max(0, currentIndex - halfWindow)
    const endIndex = Math.min(punishmentCells.length - 1, currentIndex + halfWindow)

    for (let i = startIndex; i <= endIndex; i++) {
      if (i !== currentIndex) {
        // 排除当前位置
        const cell = punishmentCells[i]
        if (cell.effect?.punishment) {
          const punishment = cell.effect.punishment
          windowCombinations.push({
            tool: punishment.tool,
            bodyPart: punishment.bodyPart,
            position: punishment.position,
            description: punishment.description,
          })
        }
      }
    }

    return windowCombinations
  }

  // 计算组合在窗口内的多样性评分
  private static calculateDiversityScore(
    candidate: PunishmentCombination,
    windowCombinations: PunishmentCombination[]
  ): number {
    if (windowCombinations.length === 0) return 100 // 如果窗口为空，所有组合都是最优的

    let score = 100

    // 检查工具重复（权重最高）
    const toolRepeats = windowCombinations.filter(
      combo => combo.tool.name === candidate.tool.name
    ).length
    score -= toolRepeats * 30 // 工具重复扣30分

    // 检查部位重复（权重中等）
    const bodyPartRepeats = windowCombinations.filter(
      combo => combo.bodyPart.name === candidate.bodyPart.name
    ).length
    score -= bodyPartRepeats * 20 // 部位重复扣20分

    // 检查姿势重复（权重最低）
    const positionRepeats = windowCombinations.filter(
      combo => combo.position.name === candidate.position.name
    ).length
    score -= positionRepeats * 10 // 姿势重复扣10分

    return Math.max(0, score) // 确保评分不为负数
  }

  // 检查组合是否满足最低多样性要求
  private static meetsDiversityRequirement(
    candidate: PunishmentCombination,
    windowCombinations: PunishmentCombination[]
  ): boolean {
    if (windowCombinations.length === 0) return true

    // 计算各维度的重复数量
    const toolRepeats = windowCombinations.filter(
      combo => combo.tool.name === candidate.tool.name
    ).length
    const bodyPartRepeats = windowCombinations.filter(
      combo => combo.bodyPart.name === candidate.bodyPart.name
    ).length
    const positionRepeats = windowCombinations.filter(
      combo => combo.position.name === candidate.position.name
    ).length

    // 计算不同维度的数量
    let differentDimensions = 0
    if (toolRepeats === 0) differentDimensions++
    if (bodyPartRepeats === 0) differentDimensions++
    if (positionRepeats === 0) differentDimensions++

    // 最低要求：至少有2个维度不同，或者窗口内组合数量少于3个
    return differentDimensions >= 2 || windowCombinations.length < 3
  }

  // 智能选择最优组合（考虑多样性）
  private static selectOptimalCombination(
    availableCombinations: PunishmentCombination[],
    windowCombinations: PunishmentCombination[]
  ): PunishmentCombination {
    if (availableCombinations.length === 0) {
      throw new Error('没有可用的惩罚组合')
    }

    if (availableCombinations.length === 1) {
      return availableCombinations[0]
    }

    // 为每个组合计算多样性评分
    const scoredCombinations = availableCombinations.map(combo => ({
      combination: combo,
      score: this.calculateDiversityScore(combo, windowCombinations),
      meetsDiversity: this.meetsDiversityRequirement(combo, windowCombinations),
    }))

    // 首先尝试选择满足多样性要求的组合
    const diverseCombinations = scoredCombinations.filter(item => item.meetsDiversity)

    let candidatePool: typeof scoredCombinations
    if (diverseCombinations.length > 0) {
      candidatePool = diverseCombinations
    } else {
      // 如果没有组合满足多样性要求，选择评分最高的组合
      candidatePool = scoredCombinations
    }

    // 找到最高评分
    const maxScore = Math.max(...candidatePool.map(item => item.score))

    // 获取所有最高评分的组合
    const topCombinations = candidatePool.filter(item => item.score === maxScore)

    // 在最高评分的组合中进行加权随机选择
    if (topCombinations.length === 1) {
      return topCombinations[0].combination
    }

    // 如果有多个最高评分的组合，进行随机选择
    const randomIndex = Math.floor(Math.random() * topCombinations.length)
    return topCombinations[randomIndex].combination
  }

  // 智能分配组合到惩罚格子（考虑连续6格的多样性）
  private static assignCombinationsWithDiversity(
    punishmentPositions: number[],
    combinations: PunishmentCombination[],
    board: BoardCell[]
  ): Map<number, PunishmentCombination> {
    const assignmentMap = new Map<number, PunishmentCombination>()

    // 按位置排序，确保按顺序分配
    const sortedPositions = [...punishmentPositions].sort((a, b) => a - b)

    for (const position of sortedPositions) {
      // 获取当前位置窗口内的已分配组合
      const windowCombinations = this.getWindowCombinations(board, position, 6)

      // 添加已分配但还未更新到board中的组合
      for (const [assignedPos, assignedCombo] of assignmentMap.entries()) {
        // 检查已分配的位置是否在当前位置的窗口内
        const distance = Math.abs(assignedPos - position)
        if (distance <= 3 && assignedPos !== position) {
          // 窗口半径为3
          windowCombinations.push(assignedCombo)
        }
      }

      // 智能选择最优组合
      const selectedCombination = this.selectOptimalCombination(combinations, windowCombinations)
      assignmentMap.set(position, selectedCombination)
    }

    return assignmentMap
  }

  // 根据确认的组合定义更新棋盘（在分配时生成随机次数）
  static updateBoardWithConfirmedCombinationDefinitions(
    board: BoardCell[],
    combinations: PunishmentCombination[],
    config: PunishmentConfig
  ): BoardCell[] {
    const updatedBoard = [...board]

    // 获取所有惩罚格子的位置（基于实际棋盘）
    const punishmentCells = updatedBoard.filter(cell => cell.type === 'punishment')
    const punishmentPositions = punishmentCells.map(cell => cell.position)

    if (combinations.length === 0) {
      console.warn('没有可用的惩罚组合定义')
      return updatedBoard
    }

    // 使用智能分配算法，考虑连续6格的多样性
    const assignmentMap = this.assignCombinationsWithDiversity(
      punishmentPositions,
      combinations,
      updatedBoard
    )

    // 为每个惩罚格子应用分配的组合，并生成随机次数
    punishmentPositions.forEach(position => {
      const cell = updatedBoard.find(c => c.position === position)
      const combinationDefinition = assignmentMap.get(position)

      if (cell && combinationDefinition) {
        // 从组合定义生成带随机次数的惩罚动作
        const punishmentAction = this.createPunishmentActionFromCombination(
          combinationDefinition,
          config
        )

        // 检查是否为动态惩罚格子（基于预定义配置）
        if (position in GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS) {
          const dynamicConfig =
            GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS[
              position as keyof typeof GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS
            ]
          punishmentAction.dynamicType = dynamicConfig.type as
            | 'dice_multiplier'
            | 'previous_player'
            | 'next_player'
            | 'other_player_choice'
          punishmentAction.multiplier =
            'multiplier' in dynamicConfig ? dynamicConfig.multiplier : undefined

          // 更新描述
          switch (punishmentAction.dynamicType) {
            case 'dice_multiplier':
              if (punishmentAction.multiplier) {
                punishmentAction.description = `用${punishmentAction.tool.name}打${punishmentAction.bodyPart.name}，姿势：${punishmentAction.position.name}（骰子点数×${punishmentAction.multiplier}）`
              }
              break
            case 'previous_player':
              punishmentAction.description = `上一个玩家：用${punishmentAction.tool.name}打${punishmentAction.bodyPart.name}，姿势：${punishmentAction.position.name}`
              break
            case 'next_player':
              punishmentAction.description = `下一个玩家：用${punishmentAction.tool.name}打${punishmentAction.bodyPart.name}，姿势：${punishmentAction.position.name}`
              break
            case 'other_player_choice':
              punishmentAction.description = `用${punishmentAction.tool.name}打${punishmentAction.bodyPart.name}，姿势：${punishmentAction.position.name}（数量由其他玩家决定）`
              break
          }
        }

        cell.effect = {
          type: 'punishment',
          value: 0,
          description: punishmentAction.description,
          punishment: punishmentAction,
          dynamicType: punishmentAction.dynamicType,
          multiplier: punishmentAction.multiplier,
        }
      }
    })

    return updatedBoard
  }

  // 根据确认的组合更新棋盘（保留原有方法用于兼容性）
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

  // 生成更符合用户偏好的惩罚组合定义（不包含次数）
  static generateBalancedPunishmentCombinationDefinitions(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentCombination[] {
    const combinations: PunishmentCombination[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = this.configToArray(config.tools).filter(tool => tool.ratio > 0)
    const validBodyParts = this.configToArray(config.bodyParts).filter(
      bodyPart => bodyPart.ratio > 0
    )
    const validPositions = this.configToArray(config.positions).filter(
      position => position.ratio > 0
    )

    // 如果任何一类没有有效配置，返回空数组
    if (validTools.length === 0 || validBodyParts.length === 0 || validPositions.length === 0) {
      return []
    }

    // 生成所有可能的有效组合（优先考虑强度限制）
    const allPossibleCombinations: PunishmentCombination[] = []

    for (const tool of validTools) {
      for (const bodyPart of validBodyParts) {
        // 检查工具强度是否适合部位耐受度
        if (tool.intensity <= bodyPart.sensitivity) {
          for (const position of validPositions) {
            const combination = this.createPunishmentCombinationDefinition(tool, bodyPart, position)
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
            const combination = this.createPunishmentCombinationDefinition(tool, bodyPart, position)
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

      // 创建组合定义
      const combination = this.createPunishmentCombinationDefinition(tool, bodyPart, position)
      const key = `${tool.name}-${bodyPart.name}-${position.name}`

      // 检查是否已存在相同组合
      if (!usedCombinations.has(key)) {
        combinations.push(combination)
        usedCombinations.add(key)
      }

      attempts++
    }

    // 如果仍然没有达到目标数量，用随机选择填充剩余位置
    while (combinations.length < count && allPossibleCombinations.length > 0) {
      const randomCombination =
        allPossibleCombinations[Math.floor(Math.random() * allPossibleCombinations.length)]
      const key = `${randomCombination.tool.name}-${randomCombination.bodyPart.name}-${randomCombination.position.name}`

      if (!usedCombinations.has(key)) {
        combinations.push(randomCombination)
        usedCombinations.add(key)
      }
    }

    return combinations
  }

  // 生成更符合用户偏好的惩罚组合（保留原有方法用于兼容性）
  static generateBalancedPunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    const combinations: PunishmentAction[] = []
    const usedCombinations = new Set<string>() // 用于去重的集合

    // 获取有效的配置项（ratio > 0）
    const validTools = this.configToArray(config.tools).filter(tool => tool.ratio > 0)
    const validBodyParts = this.configToArray(config.bodyParts).filter(
      bodyPart => bodyPart.ratio > 0
    )
    const validPositions = this.configToArray(config.positions).filter(
      position => position.ratio > 0
    )

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
      const combinationKey = `${tool.name}-${bodyPart.name}-${position.name}`

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

        const combinationKey = `${combination.tool.name}-${combination.bodyPart.name}-${combination.position.name}`

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
