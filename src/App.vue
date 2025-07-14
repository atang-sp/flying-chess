<script setup lang="ts">
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  import { ref, reactive, computed, onMounted, watch } from 'vue'
  import { GameService } from './services/gameService'
  import { GAME_CONFIG } from './config/gameConfig'
  import type {
    GameState,
    Player,
    BoardCell,
    PunishmentConfig,
    PunishmentAction,
    CellEffect,
    BoardConfig,
    TrapAction,
  } from './types/game'
  import IntroPage from './components/IntroPage.vue'
  import GameControls from './components/GameControls.vue'
  import GameBoard from './components/GameBoard.vue'
  import Dice from './components/Dice.vue'
  import BoardConfigPanel from './components/BoardConfig.vue'
  import PunishmentConfigPanel from './components/PunishmentConfig.vue'
  import TrapConfigPanel from './components/TrapConfig.vue'
  import PunishmentDisplay from './components/PunishmentDisplay.vue'
  import PunishmentConfirmation from './components/PunishmentConfirmation.vue'
  import EffectDisplay from './components/EffectDisplay.vue'
  import PunishmentStats from './components/PunishmentStats.vue'
  import TakeoffPunishmentDisplay from './components/TakeoffPunishmentDisplay.vue'
  import VersionDisplay from './components/VersionDisplay.vue'
  import TrapDisplay from './components/TrapDisplay.vue'
  import VictoryScreen from './components/VictoryScreen.vue'
  import TakeoffReliefDisplay from './components/TakeoffReliefDisplay.vue'
  import { saveConfig, loadConfig } from './utils/cache'

  // 游戏状态
  const gameState = reactive<GameState>({
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    gameStatus: 'intro', // 从开始页面开始
    winner: null,
    board: [],
    punishmentConfig: GameService.createPunishmentConfig(),
    boardConfig: GameService.createBoardConfig(),
    pendingEffect: null,
  })

  // 游戏控制状态
  const gameStarted = ref(false)
  const gameFinished = ref(false)
  const turnCount = ref(0)
  const lastEffect = ref<string>('')
  const currentPunishment = ref<PunishmentAction | null>(null)

  // 惩罚组合确认状态
  const showPunishmentConfirmation = ref(false)
  const punishmentCombinations = ref<PunishmentAction[]>([])

  // 新增效果位置状态
  const effectFromPosition = ref<number | undefined>(undefined)
  const effectToPosition = ref<number | undefined>(undefined)

  // 惩罚统计状态
  const showPunishmentStats = ref(false)
  const confirmedCombinations = ref<PunishmentAction[]>([])

  // 起飞惩罚显示状态
  const showTakeoffPunishmentDisplay = ref(false)
  const currentTakeoffPunishment = ref<PunishmentAction | null>(null)
  const currentTakeoffDiceValue = ref(0)
  const currentTakeoffExecutorIndex = ref(0)

  // 执行惩罚的玩家状态
  const currentPunishmentExecutor = ref<Player | null>(null)

  // 机关配置状态
  const trapConfig = ref<TrapAction[]>([...GAME_CONFIG.DEFAULT_TRAPS])

  // 持久化：监听配置变化并保存到 localStorage（12 个月过期）
  watch(
    () => [gameState.boardConfig, gameState.punishmentConfig, trapConfig.value],
    () => {
      // 直接从响应式状态读取，避免类型推断问题
      saveConfig({
        boardConfig: gameState.boardConfig,
        punishmentConfig: gameState.punishmentConfig,
        trapConfig: trapConfig.value,
      })
    },
    { deep: true }
  )

  // 机关陷阱弹窗状态
  const showTrapDisplay = ref(false)
  const currentTrapPunishment = ref<PunishmentAction | null>(null)
  const currentTrapDescription = ref<string>('')

  // 胜利结算画面状态
  const showVictoryScreen = ref(false)

  // 计算属性
  const canRollDice = computed(() => {
    return (
      gameStarted.value &&
      !gameFinished.value &&
      gameState.gameStatus === 'waiting' &&
      !currentPunishment.value &&
      !showTakeoffPunishmentDisplay.value &&
      !showTrapDisplay.value
    )
  })

  const isConfigValid = computed(() => {
    return GameService.validatePunishmentConfig(gameState.punishmentConfig).isValid
  })

  const isBoardConfigValid = computed(() => {
    return GameService.validateBoardConfig(gameState.boardConfig)
  })

  // 页面导航
  const showBoardSettings = () => {
    gameState.gameStatus = 'board_settings'
  }

  const showSettings = () => {
    gameState.gameStatus = 'settings'
  }

  const showIntro = () => {
    gameState.gameStatus = 'intro'
  }

  // 全局错误恢复函数
  const resetGameStateOnError = () => {
    console.warn('检测到游戏状态异常，正在重置状态...')

    // 重置游戏状态
    gameState.gameStatus = 'waiting'
    gameState.diceValue = null
    gameState.pendingEffect = null

    // 清除所有玩家移动状态
    gameState.players.forEach(player => {
      player.isMoving = false
    })

    // 清除其他状态
    currentPunishment.value = null
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    effectFromPosition.value = undefined
    effectToPosition.value = undefined

    console.log('游戏状态已重置')
  }

  // 状态检查机制
  const checkGameStateHealth = () => {
    // 检查是否卡在moving状态超过5秒
    // 但是如果有起飞惩罚弹窗显示，则不触发自动重置
    if (gameState.gameStatus === 'moving' && !showTakeoffPunishmentDisplay.value) {
      const movingStartTime = Date.now()

      // 设置一个检查定时器
      const checkTimer = setInterval(() => {
        if (gameState.gameStatus === 'moving' && !showTakeoffPunishmentDisplay.value) {
          const elapsed = Date.now() - movingStartTime
          if (elapsed > 5000) {
            // 5秒后仍然在moving状态
            console.warn('检测到游戏卡在moving状态超过5秒，正在重置...')
            clearInterval(checkTimer)
            resetGameStateOnError()
          }
        } else {
          // 状态已恢复正常，清除检查定时器
          clearInterval(checkTimer)
        }
      }, 1000) // 每秒检查一次
    }

    // 检查玩家移动状态是否异常
    const stuckPlayers = gameState.players.filter(player => player.isMoving)
    if (stuckPlayers.length > 0) {
      // 如果玩家移动状态持续超过3秒，清除移动状态
      setTimeout(() => {
        stuckPlayers.forEach(player => {
          if (player.isMoving) {
            console.warn(`玩家 ${player.name} 的移动状态异常，正在清除...`)
            player.isMoving = false
          }
        })
      }, 3000)
    }
  }

  // 添加全局错误监听
  onMounted(() => {
    // 监听未捕获的Promise错误
    window.addEventListener('unhandledrejection', event => {
      console.error('未处理的Promise错误:', event.reason)
      resetGameStateOnError()
    })

    // 监听全局错误
    window.addEventListener('error', event => {
      console.error('全局错误:', event.error)
      resetGameStateOnError()
    })

    // 定期检查游戏状态健康度
    setInterval(checkGameStateHealth, 2000) // 每2秒检查一次

    // 组件挂载时初始化游戏
    initializeGame()

    // 初始化后尝试读取本地缓存配置并应用
    const cached = loadConfig()
    if (cached) {
      gameState.boardConfig = cached.boardConfig
      gameState.punishmentConfig = cached.punishmentConfig
      trapConfig.value = cached.trapConfig

      // 根据缓存重新生成棋盘
      gameState.board = GameService.createBoard(
        gameState.punishmentConfig,
        gameState.boardConfig,
        trapConfig.value
      )
    }

    // 将游戏状态暴露到全局作用域，方便调试
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).gameState = gameState
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).trapConfig = trapConfig
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).gameStarted = gameStarted
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).gameFinished = gameFinished
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).turnCount = turnCount
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).lastEffect = lastEffect
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentPunishment = currentPunishment
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).showPunishmentConfirmation = showPunishmentConfirmation
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).punishmentCombinations = punishmentCombinations
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).effectFromPosition = effectFromPosition
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).effectToPosition = effectToPosition
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).showPunishmentStats = showPunishmentStats
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).confirmedCombinations = confirmedCombinations
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).showTakeoffPunishmentDisplay = showTakeoffPunishmentDisplay
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentTakeoffPunishment = currentTakeoffPunishment
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentTakeoffDiceValue = currentTakeoffDiceValue
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentTakeoffExecutorIndex = currentTakeoffExecutorIndex
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentPunishmentExecutor = currentPunishmentExecutor
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).showTrapDisplay = showTrapDisplay
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentTrapPunishment = currentTrapPunishment
    // @ts-ignore - 扩展window对象用于调试
    ;(window as any).currentTrapDescription = currentTrapDescription
  })

  // 初始化游戏
  const initializeGame = () => {
    gameState.players = GameService.createPlayers()
    gameState.currentPlayerIndex = 0
    gameState.diceValue = null
    gameState.gameStatus = 'intro'
    gameState.winner = null
    gameState.punishmentConfig = GameService.createPunishmentConfig()
    gameState.boardConfig = GameService.createBoardConfig()
    gameState.pendingEffect = null
    trapConfig.value = [...GAME_CONFIG.DEFAULT_TRAPS]

    // 在配置设置后创建棋盘
    gameState.board = GameService.createBoard(
      gameState.punishmentConfig,
      gameState.boardConfig,
      trapConfig.value
    )

    gameStarted.value = false
    gameFinished.value = false
    turnCount.value = 0
    lastEffect.value = ''
    currentPunishment.value = null
    currentPunishmentExecutor.value = null // 清除执行惩罚的玩家

    // 清除惩罚组合确认状态
    showPunishmentConfirmation.value = false
    punishmentCombinations.value = []
  }

  // 更新惩罚配置
  const updatePunishmentConfig = (config: PunishmentConfig) => {
    gameState.punishmentConfig = config
    // 重新创建棋盘以应用新的惩罚配置
    gameState.board = GameService.createBoard(config, gameState.boardConfig, trapConfig.value)
  }

  // 更新棋盘配置
  const updateBoardConfig = (config: BoardConfig) => {
    gameState.boardConfig = config
    // 重新创建棋盘以应用新的棋盘配置
    gameState.board = GameService.createBoard(gameState.punishmentConfig, config, trapConfig.value)
  }

  // 更新机关配置
  const updateTrapConfig = (traps: TrapAction[]) => {
    trapConfig.value = traps
    // 重新创建棋盘以应用新的机关配置
    gameState.board = GameService.createBoard(
      gameState.punishmentConfig,
      gameState.boardConfig,
      traps
    )
  }

  // 开始游戏
  const startGame = (playerConfig?: { count: number; names: string[] }) => {
    // 如果提供了玩家配置，创建自定义玩家
    if (playerConfig) {
      const { count, names } = playerConfig
      gameState.players = GameService.createCustomPlayers(count, names)
    } else {
      // 使用默认玩家配置
      gameState.players = GameService.createPlayers()
    }

    // 检查当前游戏状态
    if (gameState.gameStatus === 'intro') {
      // 如果从开始页面开始，先跳转到棋盘设置页面
      gameState.gameStatus = 'board_settings'
      return
    }

    // 检查是否已生成惩罚组合
    if (gameState.gameStatus === 'settings') {
      // 如果还在设置页面，先生成惩罚组合
      generatePunishmentCombinations()
      return
    }

    // 直接开始游戏（从其他入口进入）
    gameState.gameStatus = 'waiting'
    gameStarted.value = true
    if (turnCount.value === 0) {
      turnCount.value = 1
    }
  }

  // 重置游戏
  const resetGame = () => {
    // 重置游戏状态但保持配置
    gameState.players = GameService.createPlayers()
    gameState.board = GameService.createBoard(
      gameState.punishmentConfig,
      gameState.boardConfig,
      trapConfig.value
    )
    gameState.currentPlayerIndex = 0
    gameState.diceValue = null
    gameState.winner = null
    gameState.pendingEffect = null
    gameStarted.value = false
    gameFinished.value = false
    turnCount.value = 0
    lastEffect.value = ''
    currentPunishment.value = null
    currentPunishmentExecutor.value = null // 清除执行惩罚的玩家

    // 清除惩罚组合确认状态
    showPunishmentConfirmation.value = false
    punishmentCombinations.value = []
    showPunishmentStats.value = false
    confirmedCombinations.value = []
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null

    // 清除胜利结算画面状态
    showVictoryScreen.value = false

    // 直接跳转到棋盘设置页面
    gameState.gameStatus = 'board_settings'
  }

  // 处理骰子滚动
  const handleDiceRoll = async () => {
    if (!canRollDice.value) return

    gameState.gameStatus = 'rolling'
    gameState.diceValue = GameService.rollDice()

    // 等待骰子动画完成
    await new Promise(resolve => setTimeout(resolve, 1000))

    gameState.gameStatus = 'moving'

    // 移动玩家
    await moveCurrentPlayer()
  }

  // 移动当前玩家（第一步：基本移动）
  const moveCurrentPlayer = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      const diceValue = gameState.diceValue
      if (!diceValue) {
        // 如果没有骰子值，重置状态并返回
        gameState.gameStatus = 'waiting'
        return
      }

      const fromPosition = currentPlayer.position

      const {
        newPosition,
        effect,
        punishment,
        targetPlayerIndex,
        cellEffect,
        canTakeOff,
        executorIndex,
        forcedTakeoffDueToFailure,
      } = GameService.movePlayer(
        currentPlayer,
        diceValue,
        gameState.board,
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.punishmentConfig
      )

      // 更新玩家位置
      currentPlayer.position = newPosition

      // 显示移动路径信息或起飞信息
      if (canTakeOff) {
        lastEffect.value = '起飞成功！移动到第1格'
      } else if (effect) {
        lastEffect.value = effect
      } else {
        const fromText = fromPosition === 0 ? '起点' : `第${fromPosition}格`
        const toText = newPosition === 0 ? '起点' : `第${newPosition}格`
        lastEffect.value = `${fromText} → ${toText}`
      }

      // 等待移动动画完成
      await new Promise(resolve => setTimeout(resolve, 600))

      // 检查是否到达终点
      const boardSize = gameState.board.length
      if (newPosition === boardSize) {
        currentPlayer.isWinner = true
        gameState.winner = currentPlayer
        gameState.gameStatus = 'finished'
        gameFinished.value = true
        showVictoryScreen.value = true
        return
      }

      // 检查是否触发连续失败自动起飞
      if (forcedTakeoffDueToFailure) {
        failedTakeoffCountForMessage.value = gameState.punishmentConfig.maxTakeoffFailures || 5
        showTakeoffReliefDisplay.value = true
        // 保持moving状态，等待用户确认
        return
      }

      // 检查是否有起飞惩罚
      // 条件：当玩家尚未起飞(仍停留在起点)且出现惩罚时，无论是否存在执行者索引，都视为未起飞惩罚
      if (punishment && !currentPlayer.hasTakenOff) {
        currentTakeoffPunishment.value = punishment
        currentTakeoffDiceValue.value = diceValue
        // 如果有指定执行者索引，则使用；否则设为-1 表示无执行者
        currentTakeoffExecutorIndex.value = executorIndex !== undefined ? executorIndex : -1
        showTakeoffPunishmentDisplay.value = true
        // 处理起飞惩罚显示逻辑（等待玩家确认）
        handleTakeoffPunishmentDisplay()
        // 保持moving状态，等待用户处理起飞惩罚
        return
      }

      // 检查是否有普通惩罚
      if (punishment) {
        currentPunishment.value = punishment
        // 设置执行惩罚的玩家（如果有executorIndex）
        if (
          executorIndex !== undefined &&
          executorIndex >= 0 &&
          executorIndex < gameState.players.length
        ) {
          currentPunishmentExecutor.value = gameState.players[executorIndex]
        } else {
          // 如果没有指定执行者，随机选择一个其他玩家
          const otherPlayers = gameState.players.filter(
            (_, index) => index !== gameState.currentPlayerIndex
          )
          if (otherPlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherPlayers.length)
            currentPunishmentExecutor.value = otherPlayers[randomIndex]
          } else {
            currentPunishmentExecutor.value = null
          }
        }
        gameState.gameStatus = 'configuring'
        return // 等待用户处理惩罚
      }

      // 检查是否是机关陷阱（机关格子没有punishment，但有cellEffect）
      if (cellEffect && cellEffect.type === 'trap') {
        // 显示机关陷阱弹窗，机关不再有复杂的惩罚对象
        currentTrapDescription.value = cellEffect.description || '未知机关'
        showTrapDisplay.value = true
        // 保持moving状态，等待用户处理机关陷阱
        return
      }

      // 检查是否有需要显示效果的非惩罚格子
      if (
        cellEffect &&
        cellEffect.type !== 'punishment' &&
        (cellEffect.type === 'move' ||
          cellEffect.type === 'reverse' ||
          cellEffect.type === 'restart')
      ) {
        // 如果到达第1格（飞机场），不显示效果确认弹窗
        if (newPosition === 1) {
          // 直接继续游戏流程
          await continueAfterMove()
          return
        }

        // 创建符合CellEffect类型的对象
        const cellEffectForPending: CellEffect = {
          type: cellEffect.type as 'move' | 'reverse' | 'restart',
          value: cellEffect.value,
          description: cellEffect.description,
        }

        gameState.pendingEffect = cellEffectForPending
        // 设置效果显示的起始和结束位置
        effectFromPosition.value = fromPosition // 原始位置（骰子移动前）
        effectToPosition.value = newPosition // 骰子移动后的位置

        // 计算最终位置用于显示三段路径
        const finalPosition =
          newPosition +
          (cellEffect.type === 'move'
            ? cellEffect.value
            : cellEffect.type === 'reverse'
              ? -cellEffect.value
              : cellEffect.type === 'restart'
                ? -newPosition
                : 0)

        // 创建包含三段路径信息的effect对象
        const effectWithPath: CellEffect = {
          type: cellEffect.type as 'move' | 'reverse' | 'restart',
          value: cellEffect.value,
          description: getThreeStepMoveDescription(
            fromPosition,
            newPosition,
            finalPosition,
            cellEffect.type
          ),
        }
        gameState.pendingEffect = effectWithPath

        gameState.gameStatus = 'showing_effect'
        return // 等待用户确认效果
      }

      // 如果没有特殊效果，直接继续
      await continueAfterMove()
    } catch (error) {
      console.error('移动玩家时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      // 清除玩家移动状态
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      if (currentPlayer) {
        currentPlayer.isMoving = false
      }
    }
  }

  // 确认效果（第二步：处理格子效果）
  const confirmEffect = async () => {
    try {
      if (!gameState.pendingEffect) {
        // 如果没有待处理效果，重置状态并返回
        gameState.gameStatus = 'waiting'
        return
      }

      const currentPlayer = gameState.players[gameState.currentPlayerIndex]

      // 保存效果类型，因为后面会清除pendingEffect
      const effectType = gameState.pendingEffect.type

      // 记录三段路径的位置
      const originalPosition = effectFromPosition.value // 原始位置（骰子移动前）
      const diceMovePosition = effectToPosition.value // 骰子移动后的位置
      const finalPosition =
        currentPlayer.position +
        (effectType === 'move'
          ? gameState.pendingEffect.value
          : effectType === 'reverse'
            ? -gameState.pendingEffect.value
            : effectType === 'restart'
              ? -currentPlayer.position
              : 0)

      // 处理格子效果
      const currentBoardSize = gameState.board.length
      const { newPosition, effect, fromPosition, toPosition } = GameService.processCellEffect(
        currentPlayer,
        gameState.pendingEffect,
        currentBoardSize
      )

      // 更新玩家位置
      currentPlayer.position = newPosition

      // 立即清除待处理效果和状态，避免显示多余的弹窗
      gameState.pendingEffect = null
      effectFromPosition.value = undefined
      effectToPosition.value = undefined
      gameState.gameStatus = 'waiting'

      // 显示三段移动路径信息
      if (
        effectType === 'move' ||
        effectType === 'reverse' ||
        effectType === 'restart' ||
        effectType === 'rest'
      ) {
        const moveDescription = getThreeStepMoveDescription(
          originalPosition,
          diceMovePosition,
          newPosition,
          effectType
        )
        lastEffect.value = moveDescription
      }

      // 等待移动动画完成
      await new Promise(resolve => setTimeout(resolve, 600))

      // 检查是否到达终点
      const boardSize = gameState.board.length
      if (newPosition === boardSize) {
        currentPlayer.isWinner = true
        gameState.winner = currentPlayer
        gameState.gameStatus = 'finished'
        gameFinished.value = true
        showVictoryScreen.value = true
        return
      }

      // 继续游戏流程
      await continueAfterMove()
    } catch (error) {
      console.error('确认效果时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      gameState.pendingEffect = null
      effectFromPosition.value = undefined
      effectToPosition.value = undefined
      // 清除玩家移动状态
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      if (currentPlayer) {
        currentPlayer.isMoving = false
      }
    }
  }

  // 生成移动路径描述
  const getMoveDescription = (
    fromPosition: number,
    toPosition: number,
    effectType: string
  ): string => {
    const fromText = fromPosition === 0 ? '起点' : `第${fromPosition}格`
    const toText = toPosition === 0 ? '起点' : `第${toPosition}格`

    switch (effectType) {
      case 'move':
        return `${fromText} → ${toText}`
      case 'reverse':
        return `${fromText} → ${toText}`
      case 'restart':
        return `${fromText} → 起点`
      case 'rest':
        return `在${fromText}休息一回合`
      default:
        return `${fromText} → ${toText}`
    }
  }

  // 生成三段移动路径描述
  const getThreeStepMoveDescription = (
    originalPosition: number | undefined,
    diceMovePosition: number | undefined,
    finalPosition: number,
    effectType: string
  ): string => {
    if (originalPosition === undefined || diceMovePosition === undefined) {
      return getMoveDescription(originalPosition || 0, finalPosition, effectType)
    }

    const originalText = originalPosition === 0 ? '起点' : `第${originalPosition}格`
    const diceMoveText = diceMovePosition === 0 ? '起点' : `第${diceMovePosition}格`
    const finalText = finalPosition === 0 ? '起点' : `第${finalPosition}格`

    switch (effectType) {
      case 'move':
        return `${originalText} → ${diceMoveText} → ${finalText}`
      case 'reverse':
        return `${originalText} → ${diceMoveText} → ${finalText}`
      case 'restart':
        return `${originalText} → ${diceMoveText} → 起点`
      case 'rest':
        return `${originalText} → ${diceMoveText} (休息一回合)`
      default:
        return `${originalText} → ${diceMoveText} → ${finalText}`
    }
  }

  // 移动后的继续流程
  const continueAfterMove = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]

      // 检查是否获胜
      if (GameService.checkWinner(currentPlayer, gameState.board.length)) {
        currentPlayer.isWinner = true
        gameState.winner = currentPlayer
        gameState.gameStatus = 'finished'
        gameFinished.value = true
        showVictoryScreen.value = true
        return
      }

      // 等待移动动画完成
      await new Promise(resolve => setTimeout(resolve, 500))

      // 切换到下一个玩家
      gameState.currentPlayerIndex = GameService.getNextPlayer(
        gameState.currentPlayerIndex,
        gameState.players.length
      )

      turnCount.value++
      gameState.diceValue = null
      gameState.gameStatus = 'waiting'

      // 清除上一步效果
      setTimeout(() => {
        lastEffect.value = ''
      }, 2000)
    } catch (error) {
      console.error('继续游戏流程时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      gameState.diceValue = null
      // 清除玩家移动状态
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      if (currentPlayer) {
        currentPlayer.isMoving = false
      }
    }
  }

  // 确认惩罚
  const confirmPunishment = async () => {
    try {
      currentPunishment.value = null
      currentPunishmentExecutor.value = null // 清除执行惩罚的玩家
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterPunishment()
    } catch (error) {
      console.error('确认惩罚时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
    }
  }

  // 跳过惩罚
  const skipPunishment = async () => {
    try {
      currentPunishment.value = null
      currentPunishmentExecutor.value = null // 清除执行惩罚的玩家
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterPunishment()
    } catch (error) {
      console.error('跳过惩罚时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
    }
  }

  // 惩罚后的继续流程
  const continueAfterPunishment = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]

      // 检查是否获胜
      if (GameService.checkWinner(currentPlayer, gameState.board.length)) {
        currentPlayer.isWinner = true
        gameState.winner = currentPlayer
        gameState.gameStatus = 'finished'
        gameFinished.value = true
        showVictoryScreen.value = true
        return
      }

      // 等待移动动画完成
      await new Promise(resolve => setTimeout(resolve, 500))

      // 切换到下一个玩家
      gameState.currentPlayerIndex = GameService.getNextPlayer(
        gameState.currentPlayerIndex,
        gameState.players.length
      )

      turnCount.value++
      gameState.diceValue = null
      gameState.gameStatus = 'waiting'

      // 清除上一步效果
      setTimeout(() => {
        lastEffect.value = ''
      }, 2000)
    } catch (error) {
      console.error('惩罚后继续游戏流程时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      gameState.diceValue = null
      // 清除玩家移动状态
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      if (currentPlayer) {
        currentPlayer.isMoving = false
      }
    }
  }

  // 处理格子点击（可选功能）
  const handleCellClick = (cell: BoardCell) => {
    console.log('点击格子:', cell)
    // 可以在这里添加查看格子详情的功能
  }

  // 生成惩罚组合
  const generatePunishmentCombinations = () => {
    // 计算需要的惩罚组合数量：基于实际棋盘中的惩罚格子数量
    const punishmentCells = gameState.board.filter(cell => cell.type === 'punishment')
    const totalPunishmentCells = punishmentCells.length

    // 使用新的平衡生成方法，确保符合用户设置的比例
    punishmentCombinations.value = GameService.generateBalancedPunishmentCombinations(
      gameState.punishmentConfig,
      totalPunishmentCells
    )
    showPunishmentConfirmation.value = true
  }

  // 确认惩罚组合
  const confirmPunishmentCombinations = (combinations: PunishmentAction[]) => {
    showPunishmentConfirmation.value = false

    // 根据确认的组合更新棋盘
    gameState.board = GameService.updateBoardWithConfirmedCombinations(
      gameState.board,
      combinations
    )

    // 显示惩罚统计信息
    confirmedCombinations.value = combinations
    showPunishmentStats.value = true
  }

  // 从统计页面开始游戏
  const startGameWithStats = () => {
    showPunishmentStats.value = false

    // 直接开始游戏流程
    gameState.gameStatus = 'waiting'
    gameStarted.value = true
    if (turnCount.value === 0) {
      turnCount.value = 1
    }
  }

  // 从统计页面重新生成组合
  const handleStatsRegenerate = () => {
    showPunishmentStats.value = false
    generatePunishmentCombinations()
  }

  // 确认起飞惩罚
  const confirmTakeoffPunishment = async () => {
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    gameState.gameStatus = 'waiting'

    // 继续游戏流程
    await continueAfterPunishment()
  }

  // 处理起飞惩罚显示逻辑
  const handleTakeoffPunishmentDisplay = () => {
    // 所有情况下都等待玩家手动确认，不自动消失
    // 单人游戏和多人游戏都需要玩家点击确认按钮
  }

  // 在setup中添加handleBackToPunishmentSettings方法
  const handleBackToPunishmentSettings = () => {
    showPunishmentConfirmation.value = false
    gameState.gameStatus = 'settings'
  }

  // 添加validation-failed事件处理
  const handleValidationFailed = (errorMessage: string, requiredSensitivity?: number) => {
    console.log('惩罚配置验证失败:', errorMessage)
    // 不需要重置游戏状态，只需要显示错误提示即可
    // 错误提示已经在PunishmentConfig组件中处理了
  }

  // 修改IntroPage组件的调用，使其能够接收玩家配置信息并传递给startGame方法
  const handleIntroStart = (playerConfig?: { count: number; names: string[] }) => {
    startGame(playerConfig)
  }

  // 为GameControls组件创建包装方法
  const handleGameControlsStart = () => {
    startGame() // 不传递参数，使用默认配置
  }

  // 计算游戏状态样式类
  const gameStatusClass = computed(() => {
    return `status-${gameState.gameStatus}`
  })

  // 计算游戏状态文本
  const gameStatusText = computed(() => {
    switch (gameState.gameStatus) {
      case 'waiting':
        return '等待玩家操作'
      case 'rolling':
        return '骰子滚动中'
      case 'moving':
        return '棋子移动中'
      case 'showing_effect':
        return '显示效果中'
      case 'finished':
        return '游戏结束'
      case 'configuring':
        return '配置中'
      case 'intro':
        return '开始页面'
      case 'board_settings':
        return '棋盘设置'
      case 'settings':
        return '惩罚设置'
      default:
        return '未知状态'
    }
  })

  // 确认机关陷阱
  const confirmTrap = async () => {
    try {
      showTrapDisplay.value = false
      currentTrapPunishment.value = null
      currentTrapDescription.value = ''
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterMove()
    } catch (error) {
      console.error('确认机关陷阱时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      showTrapDisplay.value = false
      currentTrapPunishment.value = null
      currentTrapDescription.value = ''
    }
  }

  // 处理胜利结算画面的"再来一局"按钮
  const handleVictoryPlayAgain = () => {
    showVictoryScreen.value = false
    resetGame()
  }

  const showTakeoffReliefDisplay = ref(false)
  const failedTakeoffCountForMessage = ref(0)

  const confirmTakeoffRelief = async () => {
    showTakeoffReliefDisplay.value = false
    gameState.gameStatus = 'waiting'
    await continueAfterMove()
  }
</script>

<template>
  <div class="app">
    <!-- 开始页面 -->
    <IntroPage v-if="gameState.gameStatus === 'intro'" @start="handleIntroStart" />

    <!-- 棋盘设置页面 -->
    <div v-else-if="gameState.gameStatus === 'board_settings'" class="settings-page">
      <div class="page-container">
        <div class="settings-header">
          <h2>🎯 棋盘设置</h2>
          <p>配置游戏中各种类型格子的数量</p>
        </div>

        <BoardConfigPanel :config="gameState.boardConfig" @update="updateBoardConfig" />

        <TrapConfigPanel :traps="trapConfig" @update="updateTrapConfig" />

        <!-- 起飞失败次数配置 -->
        <div class="failure-config">
          <label class="failure-label">
            <span class="label-icon">✈️</span>
            最大起飞失败次数
          </label>
          <div class="input-group">
            <input
              v-model.number="gameState.punishmentConfig.maxTakeoffFailures"
              type="number"
              min="1"
              max="20"
              class="config-input"
            />
            <span class="input-unit">次</span>
          </div>
          <p class="failure-description">达到该次数后将自动起飞，不再受未起飞惩罚</p>
        </div>

        <div class="page-actions">
          <button class="btn-secondary" @click="showIntro">
            <span class="btn-icon">⬅️</span>
            <span class="btn-text">返回开始</span>
          </button>
          <button class="btn-primary" :disabled="!isBoardConfigValid" @click="showSettings">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">下一步：惩罚设置</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 设置页面 -->
    <div v-else-if="gameState.gameStatus === 'settings'" class="settings-page">
      <div class="page-container">
        <div class="settings-header">
          <h2>⚙️ 惩罚设置</h2>
          <p>配置游戏中的工具、部位、姿势和比例</p>
        </div>

        <PunishmentConfigPanel
          :config="gameState.punishmentConfig"
          @update="updatePunishmentConfig"
          @validation-failed="handleValidationFailed"
        />

        <div class="page-actions">
          <button class="btn-secondary" @click="showBoardSettings">
            <span class="btn-icon">⬅️</span>
            <span class="btn-text">返回棋盘设置</span>
          </button>
          <button
            class="btn-primary"
            :disabled="!isConfigValid"
            @click="generatePunishmentCombinations"
          >
            <span class="btn-icon">🎯</span>
            <span class="btn-text">生成惩罚组合</span>
          </button>
        </div>

        <div v-if="punishmentCombinations.length > 0" class="page-actions">
          <p class="combinations-info">
            已生成 {{ punishmentCombinations.length }} 个惩罚组合，点击开始游戏继续
          </p>
          <button class="btn-primary" @click="handleGameControlsStart">
            <span class="btn-icon">🚀</span>
            <span class="btn-text">开始游戏</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏页面 -->
    <div v-else class="game-page">
      <header class="game-header">
        <h1>🎲 惩罚飞行棋</h1>
        <p>环形棋盘游戏，支持自定义惩罚设置</p>
      </header>

      <main class="game-main">
        <!-- 顶部信息区域 -->
        <div class="top-info-section">
          <!-- 骰子区域 -->
          <div class="dice-section">
            <Dice :can-roll="canRollDice" :value="gameState.diceValue" @roll="handleDiceRoll" />
          </div>

          <!-- 玩家状态面板 -->
          <div class="player-status-section">
            <div class="status-panel">
              <div class="status-header">
                <h3>🎮 游戏状态</h3>
              </div>

              <!-- 游戏状态信息 -->
              <div class="game-status-info">
                <div class="status-item">
                  <span class="status-label">回合数:</span>
                  <span class="status-value">{{ turnCount }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">状态:</span>
                  <span class="status-value" :class="gameStatusClass">{{ gameStatusText }}</span>
                </div>
              </div>

              <!-- 当前玩家信息 -->
              <div
                v-if="gameState.players[gameState.currentPlayerIndex]"
                class="current-player-info"
              >
                <span class="current-label">当前玩家:</span>
                <div class="current-player">
                  <div
                    class="current-avatar"
                    :style="{
                      backgroundColor: gameState.players[gameState.currentPlayerIndex].color,
                    }"
                  ></div>
                  <span class="current-name">
                    {{ gameState.players[gameState.currentPlayerIndex].name }}
                  </span>
                </div>
              </div>

              <!-- 玩家列表 -->
              <div class="player-list">
                <div
                  v-for="(player, index) in gameState.players"
                  :key="player.id"
                  class="player-item"
                  :class="{
                    'current-player': index === gameState.currentPlayerIndex,
                    'player-moving': player.isMoving,
                  }"
                >
                  <div class="player-info">
                    <div class="player-avatar" :style="{ backgroundColor: player.color }"></div>
                    <div class="player-details">
                      <div class="player-name">{{ player.name }}</div>
                      <div class="player-position">
                        <span class="position-label">位置:</span>
                        <span class="position-value">
                          {{ player.position === 0 ? '起点' : `第${player.position}格` }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="player-plane">✈️</div>
                </div>
              </div>

              <!-- 游戏结束信息 -->
              <div v-if="gameState.winner" class="winner-info">
                <span class="winner-label">🎉 获胜者:</span>
                <div class="winner-player">
                  <div
                    class="winner-avatar"
                    :style="{ backgroundColor: gameState.winner.color }"
                  ></div>
                  <span class="winner-name">{{ gameState.winner.name }}</span>
                </div>
              </div>

              <!-- 游戏控制按钮 -->
              <div class="control-buttons">
                <button
                  v-if="!gameStarted"
                  class="btn btn-primary"
                  @click="handleGameControlsStart"
                >
                  🎮 开始游戏
                </button>
                <button v-if="gameFinished" class="btn btn-primary" @click="resetGame">
                  🎮 再来一局
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 棋盘区域 - 占据主要空间 -->
        <div class="board-section">
          <GameBoard
            :board="gameState.board"
            :players="gameState.players"
            :current-player-index="gameState.currentPlayerIndex"
            :last-effect="lastEffect"
            @cell-click="handleCellClick"
          />
        </div>
      </main>

      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
        :executor-player="currentPunishmentExecutor"
        @confirm="confirmPunishment"
        @skip="skipPunishment"
      />

      <!-- 效果显示弹窗 -->
      <EffectDisplay
        :visible="gameState.gameStatus === 'showing_effect'"
        :effect="gameState.pendingEffect"
        :from-position="effectFromPosition"
        :to-position="effectToPosition"
        @confirm="confirmEffect"
      />
    </div>

    <!-- 惩罚组合确认弹窗 -->
    <PunishmentConfirmation
      :show="showPunishmentConfirmation"
      :combinations="punishmentCombinations"
      @confirm="confirmPunishmentCombinations"
      @regenerate="generatePunishmentCombinations"
      @back-to-settings="handleBackToPunishmentSettings"
    />

    <!-- 惩罚统计弹窗 -->
    <PunishmentStats
      :show="showPunishmentStats"
      :combinations="confirmedCombinations"
      @confirm="startGameWithStats"
      @regenerate="handleStatsRegenerate"
    />

    <!-- 起飞惩罚显示弹窗 -->
    <TakeoffPunishmentDisplay
      :visible="showTakeoffPunishmentDisplay"
      :punishment="currentTakeoffPunishment"
      :dice-value="currentTakeoffDiceValue"
      :executor-name="
        currentTakeoffExecutorIndex !== undefined && currentTakeoffExecutorIndex >= 0
          ? gameState.players[currentTakeoffExecutorIndex]?.name || ''
          : ''
      "
      @confirm="confirmTakeoffPunishment"
    />

    <!-- 机关陷阱弹窗 -->
    <TrapDisplay
      :show="showTrapDisplay"
      :trap-description="currentTrapDescription"
      @confirm="confirmTrap"
    />

    <!-- 胜利结算画面 -->
    <VictoryScreen
      :show="showVictoryScreen"
      :winner="gameState.winner"
      :all-players="gameState.players"
      @play-again="handleVictoryPlayAgain"
    />

    <!-- 版本显示组件 -->
    <VersionDisplay />

    <!-- 起飞失败过多自动起飞弹窗 -->
    <TakeoffReliefDisplay
      :visible="showTakeoffReliefDisplay"
      :failed-count="failedTakeoffCountForMessage"
      @confirm="confirmTakeoffRelief"
    />
  </div>
</template>

<style scoped>
  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .page-container {
    max-width: min(800px, 90vw);
    width: 100%;
  }

  .page-actions {
    display: flex;
    justify-content: center;
    margin-top: clamp(1rem, 4vw, 2rem);
    gap: clamp(0.5rem, 2vw, 1rem);
    flex-wrap: wrap;
  }

  .combinations-info {
    text-align: center;
    color: white;
    margin: clamp(0.5rem, 2vw, 1rem) 0;
    padding: clamp(0.5rem, 2vw, 1rem);
    background: rgba(255, 255, 255, 0.1);
    border-radius: clamp(4px, 1vw, 8px);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: clamp(0.8rem, 2.5vw, 1rem);
  }

  /* 设置页面样式 */
  .settings-page {
    min-height: 100vh;
    padding: clamp(0.5rem, 3vw, 1rem);
    width: 100%;
  }

  .settings-header {
    text-align: center;
    color: white;
    margin-bottom: clamp(1rem, 4vw, 1.5rem);
  }

  .settings-header h2 {
    margin: 0 0 clamp(0.25rem, 1vw, 0.5rem) 0;
    font-size: clamp(1.5rem, 6vw, 2rem);
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .settings-header p {
    margin: 0;
    font-size: clamp(0.8rem, 2.5vw, 1rem);
    opacity: 0.9;
  }

  /* 游戏页面样式 */
  .game-page {
    min-height: 100vh;
    padding: clamp(0.15rem, 1vw, 0.25rem);
    width: 100%;
  }

  .game-header {
    text-align: center;
    color: white;
    margin-bottom: clamp(0.25rem, 1vw, 0.5rem);
  }

  .game-header h1 {
    margin: 0 0 clamp(0.15rem, 0.5vw, 0.25rem) 0;
    font-size: clamp(1.1rem, 4vw, 1.5rem);
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .game-header p {
    margin: 0;
    font-size: clamp(0.65rem, 2vw, 0.8rem);
    opacity: 0.9;
  }

  .game-main {
    max-width: min(1200px, 95vw);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(0.5rem, 2vw, 1rem);
    width: 100%;
    /* 确保游戏主容器有足够的高度 */
    min-height: calc(100vh - 120px);
  }

  /* 顶部信息区域 */
  .top-info-section {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: clamp(0.5rem, 2vw, 1rem);
    padding: clamp(0.5rem, 2vw, 1rem);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin-bottom: clamp(0.5rem, 2vw, 1rem);
    /* 限制最大高度，为棋盘留出空间 */
    max-height: 45vh;
  }

  .dice-section {
    order: 1;
    flex: 0 0 auto;
    min-width: 80px;
    max-width: 120px;
  }

  .player-status-section {
    order: 2;
    flex: 1;
    min-width: 0;
  }

  .status-panel {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: clamp(0.4rem, 2vw, 0.6rem);
    width: 100%;
    max-height: none;
    overflow: visible;
  }

  .status-header {
    text-align: center;
    color: white;
    margin-bottom: clamp(0.25rem, 1vw, 0.5rem);
  }

  .status-header h3 {
    margin: 0 0 clamp(0.1rem, 0.25vw, 0.1rem) 0;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .game-status-info {
    flex-direction: row;
    gap: clamp(0.3rem, 1vw, 0.5rem);
    justify-content: space-between;
  }

  .status-item {
    flex-direction: column;
    align-items: center;
    flex: 1;
  }

  .status-label,
  .status-value {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
  }

  .status-label {
    opacity: 0.9;
  }

  .status-value {
    font-weight: bold;
  }

  .current-player-info,
  .winner-info {
    margin-bottom: clamp(0.3rem, 1vw, 0.5rem);
    text-align: center;
  }

  .current-label,
  .winner-label {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    opacity: 0.9;
  }

  .current-name,
  .winner-name {
    font-size: clamp(0.75rem, 2vw, 0.85rem);
  }

  .current-avatar,
  .winner-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #ccc;
  }

  .current-player {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.3rem, 1vw, 0.5rem);
  }

  .winner-player {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.3rem, 1vw, 0.5rem);
  }

  /* 玩家列表样式 */
  .player-list {
    gap: 0.3rem;
    margin-bottom: clamp(0.3rem, 1vw, 0.5rem);
    display: flex;
    flex-direction: column;
  }

  .player-item {
    padding: 0.3rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .player-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .player-item.current-player {
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(69, 183, 209, 0.2));
    border: 2px solid rgba(78, 205, 196, 0.5);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
  }

  .player-item.player-moving {
    animation: playerMove 0.6s ease-in-out;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
  }

  .player-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
  }

  .player-details {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }

  .player-name {
    font-size: 0.7rem;
    font-weight: bold;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-position {
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.1rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .position-label {
    font-weight: 500;
  }

  .position-value {
    font-weight: bold;
    color: #4ecdc4;
  }

  .player-plane {
    font-size: 0.75rem;
    margin-left: 0.2rem;
    flex-shrink: 0;
  }

  .player-item.current-player .player-plane {
    animation: planeFloat 2s ease-in-out infinite;
  }

  .control-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.8rem, 2.5vw, 1.2rem);
    border: none;
    border-radius: clamp(4px, 1vw, 6px);
    font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1vw, 0.4rem);
    min-height: clamp(32px, 7vw, 36px);
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-primary {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
    color: white;
  }

  /* 玩家移动动画 */
  @keyframes playerMove {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  /* 飞机浮动动画 */
  @keyframes planeFloat {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  /* 棋盘区域 */
  .board-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    /* 确保棋盘区域有最小高度 */
    min-height: 300px;
  }

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .page-actions {
      flex-direction: column;
      align-items: center;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
    }

    /* 移动端顶部信息区域布局 */
    .top-info-section {
      flex-direction: row;
      gap: clamp(0.5rem, 2vw, 1rem);
      padding: clamp(0.5rem, 2vw, 1rem);
      align-items: flex-start;
      /* 限制最大高度，避免占用过多空间 */
      max-height: 35vh;
    }

    .dice-section {
      order: 1;
      flex: 0 0 auto;
      min-width: 80px;
      max-width: 120px;
    }

    .player-status-section {
      order: 2;
      flex: 1;
      min-width: 0;
      /* 确保状态区域不会过度扩展 */
      max-height: 100%;
    }

    .status-panel {
      padding: clamp(0.4rem, 2vw, 0.6rem);
      /* 限制状态面板最大高度，添加滚动 */
      max-height: 30vh;
      overflow-y: auto;
      /* 添加滚动条样式 */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    /* Webkit浏览器的滚动条样式 */
    .status-panel::-webkit-scrollbar {
      width: 4px;
    }

    .status-panel::-webkit-scrollbar-track {
      background: transparent;
    }

    .status-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .status-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    .status-header h3 {
      font-size: clamp(0.8rem, 2.5vw, 0.9rem);
      /* 固定头部，不随滚动 */
      position: sticky;
      top: 0;
      background: rgba(255, 255, 255, 0.1);
      margin: -0.4rem -0.4rem 0.4rem -0.4rem;
      padding: 0.4rem;
      border-radius: 8px 8px 0 0;
      z-index: 10;
    }

    .game-status-info {
      flex-direction: column;
      gap: clamp(0.3rem, 1vw, 0.5rem);
    }

    .status-item {
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
    }

    .status-label,
    .status-value {
      font-size: clamp(0.75rem, 2.2vw, 0.85rem);
    }

    .current-player-info,
    .winner-info {
      margin-bottom: clamp(0.3rem, 1vw, 0.5rem);
    }

    .current-label,
    .winner-label {
      font-size: clamp(0.75rem, 2.2vw, 0.85rem);
    }

    .current-name,
    .winner-name {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .current-avatar,
    .winner-avatar {
      width: 20px;
      height: 20px;
    }

    .player-list {
      gap: 0.4rem;
      margin-bottom: clamp(0.3rem, 1vw, 0.5rem);
    }

    .player-item {
      padding: 0.4rem;
    }

    .player-avatar {
      width: 18px;
      height: 18px;
    }

    .player-name {
      font-size: 0.75rem;
    }

    .player-position {
      font-size: 0.65rem;
    }

    .player-plane {
      font-size: 0.8rem;
    }

    .control-buttons {
      gap: 0.4rem;
    }

    .btn {
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      border-radius: 4px;
      min-height: clamp(28px, 6vw, 32px);
      gap: clamp(0.2rem, 0.6vw, 0.25rem);
    }
  }

  /* 小屏幕手机优化 */
  @media (max-width: 767px) {
    .game-header h1 {
      font-size: clamp(1rem, 5vw, 1.3rem);
    }

    .game-header p {
      font-size: clamp(0.6rem, 2.5vw, 0.75rem);
    }

    .top-info-section {
      padding: clamp(0.4rem, 2vw, 0.8rem);
      gap: clamp(0.4rem, 2vw, 0.8rem);
      /* 进一步限制高度 */
      max-height: 30vh;
    }

    .game-main {
      gap: clamp(0.3rem, 1.5vw, 0.8rem);
      /* 确保有足够的最小高度 */
      min-height: calc(100vh - 100px);
    }

    .status-panel {
      padding: clamp(0.3rem, 1.5vw, 0.5rem);
      /* 更严格的高度限制 */
      max-height: 25vh;
    }

    .status-header h3 {
      font-size: clamp(0.75rem, 2.2vw, 0.8rem);
      margin: -0.3rem -0.3rem 0.3rem -0.3rem;
      padding: 0.3rem;
    }

    .status-label,
    .status-value {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .current-label,
    .winner-label {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .current-name,
    .winner-name {
      font-size: clamp(0.75rem, 2vw, 0.85rem);
    }

    .current-avatar,
    .winner-avatar {
      width: 18px;
      height: 18px;
    }

    .player-list {
      gap: 0.3rem;
      margin-bottom: clamp(0.25rem, 1vw, 0.4rem);
    }

    .player-item {
      padding: 0.3rem;
    }

    .player-avatar {
      width: 16px;
      height: 16px;
    }

    .player-name {
      font-size: 0.7rem;
    }

    .player-position {
      font-size: 0.6rem;
    }

    .player-plane {
      font-size: 0.75rem;
    }

    .control-buttons {
      gap: 0.3rem;
    }

    .btn {
      padding: clamp(0.3rem, 1.2vw, 0.35rem) clamp(0.6rem, 1.8vw, 0.7rem);
      font-size: clamp(0.65rem, 1.6vw, 0.7rem);
      min-height: clamp(24px, 5vw, 28px);
      gap: clamp(0.15rem, 0.5vw, 0.2rem);
    }
  }

  /* 超小屏幕手机优化 */
  @media (max-width: 480px) {
    .game-header h1 {
      font-size: clamp(0.9rem, 6vw, 1.2rem);
    }

    .game-header p {
      font-size: clamp(0.55rem, 3vw, 0.7rem);
    }

    .top-info-section {
      padding: clamp(0.3rem, 2vw, 0.6rem);
      gap: clamp(0.3rem, 2vw, 0.6rem);
      /* 超小屏幕更严格的高度限制 */
      max-height: 25vh;
    }

    .game-main {
      gap: clamp(0.2rem, 1vw, 0.6rem);
      /* 超小屏幕的最小高度 */
      min-height: calc(100vh - 80px);
    }

    .status-panel {
      padding: clamp(0.25rem, 1.2vw, 0.4rem);
      /* 超小屏幕更严格的高度限制 */
      max-height: 20vh;
    }

    .status-header h3 {
      font-size: clamp(0.7rem, 2vw, 0.75rem);
      margin: -0.25rem -0.25rem 0.25rem -0.25rem;
      padding: 0.25rem;
    }

    .status-label,
    .status-value {
      font-size: clamp(0.65rem, 1.8vw, 0.75rem);
    }

    .current-label,
    .winner-label {
      font-size: clamp(0.65rem, 1.8vw, 0.75rem);
    }

    .current-name,
    .winner-name {
      font-size: clamp(0.7rem, 1.8vw, 0.8rem);
    }

    .current-avatar,
    .winner-avatar {
      width: 16px;
      height: 16px;
    }

    .player-list {
      gap: 0.25rem;
      margin-bottom: clamp(0.2rem, 0.8vw, 0.3rem);
    }

    .player-item {
      padding: 0.25rem;
    }

    .player-avatar {
      width: 14px;
      height: 14px;
    }

    .player-name {
      font-size: 0.65rem;
    }

    .player-position {
      font-size: 0.55rem;
    }

    .player-plane {
      font-size: 0.7rem;
    }

    .control-buttons {
      gap: 0.25rem;
    }

    .btn {
      padding: clamp(0.25rem, 1vw, 0.3rem) clamp(0.5rem, 1.5vw, 0.6rem);
      font-size: clamp(0.6rem, 1.4vw, 0.65rem);
      min-height: clamp(20px, 4vw, 24px);
      gap: clamp(0.1rem, 0.4vw, 0.15rem);
    }
  }

  /* 游戏状态样式 */
  .status-waiting {
    color: #4ecdc4;
  }

  .status-rolling {
    color: #ff6b6b;
    animation: pulse 1s infinite;
  }

  .status-moving {
    color: #45b7d1;
  }

  .status-showing_effect {
    color: #ab47bc;
    animation: pulse 1s infinite;
  }

  .status-finished {
    color: #96ceb4;
  }

  .status-configuring {
    color: #ffa726;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
