<script setup lang="ts">
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
  import { GameService } from './services/gameService'
  import { GAME_CONFIG } from './config/gameConfig'
  import type {
    GameState,
    Player,
    BoardCell,
    PunishmentConfig,
    PunishmentAction,
    PunishmentCombination,
    CellEffect,
    BoardConfig,
    TrapAction,
  } from './types/game'
  import IntroPage from './components/IntroPage.vue'
  import GameBoard from './components/GameBoard.vue'
  import PlayerPanel from './components/PlayerPanel.vue'
  import CoolDice from './components/CoolDice.vue'
  import BoardConfigPanel from './components/BoardConfig.vue'
  import PunishmentConfigPanel from './components/PunishmentConfig.vue'
  import TrapConfigPanel from './components/TrapConfig.vue'
  import PunishmentDisplay from './components/PunishmentDisplay.vue'
  import PunishmentConfirmation from './components/PunishmentConfirmation.vue'
  import EffectDisplay from './components/EffectDisplay.vue'
  import PunishmentStats from './components/PunishmentStats.vue'
  import TakeoffPunishmentDisplay from './components/TakeoffPunishmentDisplay.vue'
  import TrapDisplay from './components/TrapDisplay.vue'
  import VictoryScreen from './components/VictoryScreen.vue'
  import TakeoffReliefDisplay from './components/TakeoffReliefDisplay.vue'
  import BounceDisplay from './components/BounceDisplay.vue'
  import ConfigExport from './components/ConfigExport.vue'
  import { saveConfig, loadConfig, loadPlayerSettings } from './utils/cache'
  import { SecureRandom } from './utils/secureRandom'
  import { driver as createDriver } from 'driver.js'

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
  const punishmentCombinations = ref<PunishmentCombination[]>([])

  // 新增效果位置状态
  const effectFromPosition = ref<number | undefined>(undefined)
  const effectToPosition = ref<number | undefined>(undefined)

  // 惩罚统计状态
  const showPunishmentStats = ref(false)
  const confirmedCombinations = ref<PunishmentCombination[]>([])

  // 起飞惩罚显示状态
  const showTakeoffPunishmentDisplay = ref(false)
  const currentTakeoffPunishment = ref<PunishmentAction | null>(null)
  const currentTakeoffDiceValue = ref(0)
  const currentTakeoffExecutorIndex = ref(0)

  // 执行惩罚的玩家状态
  const currentPunishmentExecutor = ref<Player | null>(null)

  // 机关配置状态
  const trapConfig = ref<TrapAction[]>(GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS))

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

  // 反弹效果弹窗状态
  const showBounceDisplay = ref(false)
  const bounceFromPosition = ref<number>(0)
  const bounceTargetPosition = ref<number>(0)
  const bounceFinalPosition = ref<number>(0)
  const bounceOverflowSteps = ref<number>(0)

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

  // UI辅助方法
  const getStatusSeverity = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'info'
      case 'rolling':
        return 'warning'
      case 'moving':
        return 'warning'
      case 'finished':
        return 'success'
      case 'showing_effect':
        return 'warning'
      default:
        return 'info'
    }
  }

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
      if (cached.boardConfig) {
        gameState.boardConfig = cached.boardConfig
        console.log('已加载棋盘配置:', cached.boardConfig)
      }
      if (cached.punishmentConfig) {
        // 检查并转换旧格式的惩罚配置（数组格式 -> 对象格式）
        const punishmentConfig = cached.punishmentConfig

        // 检查是否为旧格式（数组格式）
        if (
          Array.isArray(punishmentConfig.tools) ||
          Array.isArray(punishmentConfig.bodyParts) ||
          Array.isArray(punishmentConfig.positions)
        ) {
          console.log('检测到旧格式的惩罚配置，正在转换为新格式...', punishmentConfig)

          // 转换工具配置
          if (Array.isArray(punishmentConfig.tools)) {
            const toolsObj: Record<string, any> = {}
            punishmentConfig.tools.forEach((tool: any) => {
              toolsObj[tool.name] = {
                name: tool.name,
                intensity: tool.intensity,
                ratio: tool.ratio,
              }
            })
            punishmentConfig.tools = toolsObj
          }

          // 转换部位配置
          if (Array.isArray(punishmentConfig.bodyParts)) {
            const bodyPartsObj: Record<string, any> = {}
            punishmentConfig.bodyParts.forEach((bodyPart: any) => {
              bodyPartsObj[bodyPart.name] = {
                name: bodyPart.name,
                sensitivity: bodyPart.sensitivity,
                ratio: bodyPart.ratio,
              }
            })
            punishmentConfig.bodyParts = bodyPartsObj
          }

          // 转换姿势配置
          if (Array.isArray(punishmentConfig.positions)) {
            const positionsObj: Record<string, any> = {}
            punishmentConfig.positions.forEach((position: any) => {
              positionsObj[position.name] = {
                name: position.name,
                ratio: position.ratio,
              }
            })
            punishmentConfig.positions = positionsObj
          }

          console.log('惩罚配置格式转换完成')
        }

        gameState.punishmentConfig = punishmentConfig
        console.log('已加载惩罚配置:', punishmentConfig)
      }
      if (cached.trapConfig) {
        trapConfig.value = cached.trapConfig
        console.log('已加载机关配置:', cached.trapConfig)
      }

      // 根据缓存重新生成棋盘
      gameState.board = GameService.createBoard(
        gameState.punishmentConfig,
        gameState.boardConfig,
        trapConfig.value
      )
    }

    // 加载玩家设置
    const cachedPlayerSettings = loadPlayerSettings()
    if (cachedPlayerSettings) {
      console.log('已加载玩家设置:', cachedPlayerSettings)
      // 更新玩家数量和姓名
      gameState.players = Array.from({ length: cachedPlayerSettings.playerCount }, (_, i) => ({
        id: i + 1,
        name: cachedPlayerSettings.playerNames[i] || `玩家${i + 1}`,
        color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][i] || '#999',
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      }))
    }

    // 将游戏状态暴露到全局作用域，方便调试
    if (import.meta.env.DEV) {
      const debugWindow = window as typeof window & {
        gameState: typeof gameState
        trapConfig: typeof trapConfig
        gameStarted: typeof gameStarted
        gameFinished: typeof gameFinished
        turnCount: typeof turnCount
        lastEffect: typeof lastEffect
        currentPunishment: typeof currentPunishment
        showPunishmentConfirmation: typeof showPunishmentConfirmation
        punishmentCombinations: typeof punishmentCombinations
        effectFromPosition: typeof effectFromPosition
        effectToPosition: typeof effectToPosition
        showPunishmentStats: typeof showPunishmentStats
        confirmedCombinations: typeof confirmedCombinations
        showTakeoffPunishmentDisplay: typeof showTakeoffPunishmentDisplay
        currentTakeoffPunishment: typeof currentTakeoffPunishment
        currentTakeoffDiceValue: typeof currentTakeoffDiceValue
        currentTakeoffExecutorIndex: typeof currentTakeoffExecutorIndex
        currentPunishmentExecutor: typeof currentPunishmentExecutor
        showTrapDisplay: typeof showTrapDisplay
        currentTrapPunishment: typeof currentTrapPunishment
        currentTrapDescription: typeof currentTrapDescription
      }

      debugWindow.gameState = gameState
      debugWindow.trapConfig = trapConfig
      debugWindow.gameStarted = gameStarted
      debugWindow.gameFinished = gameFinished
      debugWindow.turnCount = turnCount
      debugWindow.lastEffect = lastEffect
      debugWindow.currentPunishment = currentPunishment
      debugWindow.showPunishmentConfirmation = showPunishmentConfirmation
      debugWindow.punishmentCombinations = punishmentCombinations
      debugWindow.effectFromPosition = effectFromPosition
      debugWindow.effectToPosition = effectToPosition
      debugWindow.showPunishmentStats = showPunishmentStats
      debugWindow.confirmedCombinations = confirmedCombinations
      debugWindow.showTakeoffPunishmentDisplay = showTakeoffPunishmentDisplay
      debugWindow.currentTakeoffPunishment = currentTakeoffPunishment
      debugWindow.currentTakeoffDiceValue = currentTakeoffDiceValue
      debugWindow.currentTakeoffExecutorIndex = currentTakeoffExecutorIndex
      debugWindow.currentPunishmentExecutor = currentPunishmentExecutor
      debugWindow.showTrapDisplay = showTrapDisplay
      debugWindow.currentTrapPunishment = currentTrapPunishment
      debugWindow.currentTrapDescription = currentTrapDescription
    }

    // 从localStorage恢复设置
    const savedAutoGuide = localStorage.getItem('autoGuideEnabled')
    if (savedAutoGuide !== null) {
      autoGuideEnabled.value = savedAutoGuide === 'true'
    }

    const savedGuideStatus = localStorage.getItem('hasShownGuide')
    if (savedGuideStatus) {
      try {
        const guideStatus = JSON.parse(savedGuideStatus)
        hasShownGuide.value = new Set(guideStatus)
      } catch (e) {
        console.warn('无法解析引导状态:', e)
      }
    }

    // 页面加载完成后，检查是否需要显示当前页面的引导
    // 使用nextTick立即检查一次
    nextTick(() => {
      const currentStatus = gameState.gameStatus
      console.log(`nextTick检查，当前状态: ${currentStatus}`)
      if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
        console.log(`立即触发自动引导检查`)
        showAutoGuide(currentStatus)
      }
    })

    // 延迟检查作为备用
    setTimeout(() => {
      const currentStatus = gameState.gameStatus
      console.log(`页面加载完成，当前状态: ${currentStatus}`)
      if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
        console.log(`触发页面加载时的自动引导检查`)
        showAutoGuide(currentStatus)
      }
    }, 1200) // 延迟1.2秒确保页面完全渲染
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
    trapConfig.value = GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)

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

  // 强制开始游戏（用于侧边栏等控制按钮）
  const forceStartGame = () => {
    // 如果还没有惩罚组合，先生成并直接确认
    if (punishmentCombinations.value.length === 0) {
      // 计算需要的惩罚组合数量：基于实际棋盘中的惩罚格子数量
      const punishmentCells = gameState.board.filter(cell => cell.type === 'punishment')
      const totalPunishmentCells = punishmentCells.length

      // 生成惩罚组合
      const combinations = GameService.generateBalancedPunishmentCombinations(
        gameState.punishmentConfig,
        totalPunishmentCells
      )

      // 直接确认组合，不显示确认弹窗
      gameState.board = GameService.updateBoardWithConfirmedCombinations(
        gameState.board,
        combinations
      )

      punishmentCombinations.value = combinations
      confirmedCombinations.value = combinations
    }

    // 直接开始游戏
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
    gameState.punishmentConfig = GameService.createPunishmentConfig() // 新增：重置惩罚配置
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

    // 清除反弹效果状态
    showBounceDisplay.value = false
    bounceFromPosition.value = 0
    bounceTargetPosition.value = 0
    bounceFinalPosition.value = 0
    bounceOverflowSteps.value = 0

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
            currentPunishmentExecutor.value = SecureRandom.choice(otherPlayers)
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

      // 检查是否是反弹效果
      if (cellEffect && cellEffect.type === 'bounce') {
        // 设置反弹显示信息
        bounceFromPosition.value = fromPosition
        bounceTargetPosition.value = fromPosition + diceValue // 原始目标位置
        bounceFinalPosition.value = newPosition
        bounceOverflowSteps.value = cellEffect.value
        showBounceDisplay.value = true
        // 保持moving状态，等待用户确认反弹
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

      // 处理格子效果
      const currentBoardSize = gameState.board.length
      const { newPosition } = GameService.processCellEffect(
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
        effectType === 'rest' ||
        effectType === 'bounce'
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

    // 使用新的平衡生成方法，生成惩罚组合定义（不包含次数）
    punishmentCombinations.value = GameService.generateBalancedPunishmentCombinationDefinitions(
      gameState.punishmentConfig,
      totalPunishmentCells
    )
    showPunishmentConfirmation.value = true
  }

  // 确认惩罚组合
  const confirmPunishmentCombinations = (combinations: PunishmentCombination[]) => {
    showPunishmentConfirmation.value = false

    // 根据确认的组合定义更新棋盘（在分配时生成随机次数）
    gameState.board = GameService.updateBoardWithConfirmedCombinationDefinitions(
      gameState.board,
      combinations,
      gameState.punishmentConfig
    )

    // 显示惩罚统计信息
    confirmedCombinations.value = combinations
    showPunishmentStats.value = true
  }

  // 从统计页面开始游戏
  const startGameWithStats = () => {
    console.log('startGameWithStats called')
    console.log('Before: gameStarted =', gameStarted.value, 'gameStatus =', gameState.gameStatus)

    showPunishmentStats.value = false

    // 直接开始游戏流程
    gameState.gameStatus = 'waiting'
    gameStarted.value = true
    if (turnCount.value === 0) {
      turnCount.value = 1
    }

    console.log('After: gameStarted =', gameStarted.value, 'gameStatus =', gameState.gameStatus)
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
  const handleValidationFailed = (errorMessage: string) => {
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
    forceStartGame() // 强制开始游戏，跳过状态检查
  }

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

  // 确认反弹效果
  const confirmBounce = async () => {
    try {
      showBounceDisplay.value = false
      bounceFromPosition.value = 0
      bounceTargetPosition.value = 0
      bounceFinalPosition.value = 0
      bounceOverflowSteps.value = 0
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterMove()
    } catch (error) {
      console.error('确认反弹时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      showBounceDisplay.value = false
      bounceFromPosition.value = 0
      bounceTargetPosition.value = 0
      bounceFinalPosition.value = 0
      bounceOverflowSteps.value = 0
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

  // 用户指引
  const startGuide = () => {
    const currentStatus = gameState.gameStatus

    // 如果惩罚确认弹窗正在显示，优先显示确认页面引导
    if (showPunishmentConfirmation.value) {
      startPunishmentConfirmationGuide()
      return
    }

    // 根据当前页面状态选择对应的引导
    switch (currentStatus) {
      case 'intro':
        startIntroGuide()
        break
      case 'board_settings':
        startBoardSettingsGuide()
        break
      case 'settings':
        startPunishmentSettingsGuide()
        break
      case 'waiting':
      case 'rolling':
      case 'moving':
      case 'showing_effect':
        startGameGuide()
        break
      default:
        startDefaultGuide()
    }
  }

  // 开始页面引导
  const startIntroGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.game-title',
        popover: {
          title: '欢迎来到惩罚飞行棋！',
          description: '这是一个刺激有趣的飞行棋游戏，支持自定义惩罚机制',
          position: 'bottom',
        },
      },
      {
        element: '.player-settings',
        popover: {
          title: '玩家设置',
          description: '设置游戏的玩家数量和昵称',
          position: 'top',
        },
      },

      {
        element: '.start-btn',
        popover: {
          title: '开始游戏',
          description: '点击开始游戏，进入棋盘设置页面进行详细配置',
          position: 'top',
        },
      },
    ])
    driver.drive(0)
  }

  // 棋盘设置页面引导
  const startBoardSettingsGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.settings-header',
        popover: {
          title: '棋盘设置',
          description: '在这里配置游戏棋盘的基本参数',
          position: 'bottom',
        },
      },
      {
        element: '.board-config',
        popover: {
          title: '格子数量配置',
          description: '设置不同类型格子的数量：惩罚格、奖励格、特殊格子等',
          position: 'right',
        },
      },
      {
        element: '.trap-config',
        popover: {
          title: '机关陷阱配置',
          description: '配置棋盘上的机关陷阱，增加游戏的刺激性和随机性',
          position: 'right',
        },
      },

      {
        element: '.page-actions',
        popover: {
          title: '操作按钮',
          description: '可以返回上一页或进入下一步的惩罚设置',
          position: 'top',
        },
      },
    ])
    driver.drive(0)
  }

  // 惩罚设置页面引导
  const startPunishmentSettingsGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.settings-header',
        popover: {
          title: '惩罚设置',
          description: '在这里配置游戏中的惩罚内容',
          position: 'bottom',
        },
      },
      {
        element: '.config-section:nth-child(1)',
        popover: {
          title: '惩罚工具',
          description: '选择和配置惩罚中使用的工具，每种工具有不同的强度和比例',
          position: 'right',
        },
      },
      {
        element: '.config-section:nth-child(2)',
        popover: {
          title: '身体部位',
          description: '选择和配置惩罚的身体部位，每个部位有不同的敏感度',
          position: 'right',
        },
      },
      {
        element: '.config-section:nth-child(3)',
        popover: {
          title: '受罚姿势',
          description: '配置受罚时的姿势，不同姿势有不同的难度',
          position: 'right',
        },
      },
      {
        element: '.config-section:nth-child(4)',
        popover: {
          title: '惩罚次数',
          description: '设置惩罚的最小和最大次数范围，以及最大起飞失败次数',
          position: 'right',
        },
      },
    ])
    driver.drive(0)
  }

  // 游戏页面引导
  const startGameGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.dice-container',
        popover: {
          title: '骰子区域',
          description: '点击骰子开始掷骰子，看看能否起飞或移动多少步！',
          position: 'bottom',
        },
      },
      {
        element: '.player-status-section',
        popover: {
          title: '游戏状态',
          description: '查看当前回合数、游戏状态和当前玩家信息',
          position: 'left',
        },
      },
      {
        element: '.board-section',
        popover: {
          title: '游戏棋盘',
          description: '这里是主要的游戏区域，显示棋盘和玩家的飞机位置',
          position: 'top',
        },
      },
    ])
    driver.drive(0)
  }

  // 惩罚确认页面引导
  const startPunishmentConfirmationGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.modal-header',
        popover: {
          title: '惩罚组合确认',
          description: '系统已为你生成了惩罚组合，你可以在这里查看和管理所有组合',
          position: 'bottom',
        },
      },
      {
        element: '.combinations-list',
        popover: {
          title: '组合列表',
          description: '这里显示了所有生成的惩罚组合，每个组合包含工具、部位、姿势和描述',
          position: 'right',
        },
      },
      {
        element: '.combination-item:first-child .combination-details',
        popover: {
          title: '组合详情',
          description: '每个组合显示工具强度、部位耐受度和详细的惩罚描述',
          position: 'left',
        },
      },
      {
        element: '.combination-item:first-child .combination-actions',
        popover: {
          title: '删除或恢复',
          description: '点击🗑️可以删除不合适的组合，删除后可以点击🔄恢复',
          position: 'left',
        },
      },
      {
        element: '.combination-stats',
        popover: {
          title: '统计信息',
          description: '显示总组合数、删除数量和最终保留的组合数量',
          position: 'top',
        },
      },
      {
        element: '.modal-actions',
        popover: {
          title: '操作按钮',
          description: '可以重新生成组合、返回设置页面或确认当前组合开始游戏',
          position: 'top',
        },
      },
    ])
    driver.drive(0)
  }

  // 默认引导（兼容性）
  const startDefaultGuide = () => {
    const driver = createDriver({
      allowClose: true,
      overlayOpacity: 0.4,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
    })
    driver.setSteps([
      {
        element: '.app',
        popover: {
          title: '惩罚飞行棋',
          description: '欢迎使用惩罚飞行棋游戏！点击右下角的帮助按钮可以获取当前页面的详细引导。',
          position: 'center',
        },
      },
    ])
    driver.drive(0)
  }

  // 自动引导功能 - 当进入新页面时自动显示引导
  const hasShownGuide = ref(new Set<string>())
  const autoGuideEnabled = ref(true) // 可以控制是否启用自动引导
  const showGuideSettings = ref(false) // 控制引导设置菜单显示

  // 配置导出功能
  const showConfigExport = ref(false)

  const showAutoGuide = (pageType: string) => {
    console.log(
      `检查自动引导 - 页面类型: ${pageType}, 自动引导开启: ${autoGuideEnabled.value}, 已显示过: ${hasShownGuide.value.has(pageType)}`
    )

    if (autoGuideEnabled.value && !hasShownGuide.value.has(pageType)) {
      console.log(`准备显示自动引导 - 页面: ${pageType}`)
      // 延迟一下确保页面元素已经渲染
      setTimeout(() => {
        console.log(`执行自动引导 - 页面: ${pageType}`)
        // 针对特定页面，直接调用专门的引导函数
        if (pageType === 'punishment_confirmation') {
          startPunishmentConfirmationGuide()
        } else if (pageType === 'game') {
          startGameGuide()
        } else {
          startGuide()
        }
        hasShownGuide.value.add(pageType)
      }, 800) // 稍微减少延迟时间
    }
  }

  // 切换自动引导开关
  const toggleAutoGuide = () => {
    autoGuideEnabled.value = !autoGuideEnabled.value
    console.log(`自动引导开关切换为: ${autoGuideEnabled.value}`)
    // 保存到localStorage
    localStorage.setItem('autoGuideEnabled', autoGuideEnabled.value.toString())
  }

  // 重置引导状态
  const resetGuideStatus = () => {
    hasShownGuide.value.clear()
    localStorage.removeItem('hasShownGuide')
    console.log('引导状态已重置')
  }

  // 配置导出功能
  const openConfigExport = () => {
    showConfigExport.value = true
  }

  const closeConfigExport = () => {
    showConfigExport.value = false
  }

  const handleExportSuccess = (filename: string) => {
    console.log(`配置导出成功: ${filename}`)
    // 可以在这里添加成功提示
  }

  const handleExportError = (error: string) => {
    console.error(`配置导出失败: ${error}`)
    // 可以在这里添加错误提示
  }

  const handleImportSuccess = async (message: string) => {
    console.log(`配置导入成功: ${message}`)

    // 重新加载玩家设置
    const playerSettings = loadPlayerSettings()
    console.log('从localStorage加载的玩家设置:', playerSettings)

    if (playerSettings) {
      console.log('更新游戏状态中的玩家信息')

      // 使用nextTick确保响应式更新
      await nextTick()

      // 更新玩家数量和姓名
      gameState.players = Array.from({ length: playerSettings.playerCount }, (_, i) => ({
        id: i + 1,
        name: playerSettings.playerNames[i] || `玩家${i + 1}`,
        color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][i] || '#999',
        position: 0,
        isWinner: false,
        hasTakenOff: false,
        failedTakeoffAttempts: 0,
      }))

      // 重置游戏状态
      gameState.currentPlayerIndex = 0
      gameState.diceValue = null
      gameState.winner = null

      console.log('玩家设置已更新:', playerSettings)
      console.log('新的游戏玩家列表:', gameState.players)

      // 触发自定义事件通知其他组件
      window.dispatchEvent(
        new CustomEvent('playerSettingsUpdated', {
          detail: playerSettings,
        })
      )
    } else {
      console.log('没有找到玩家设置数据')
    }

    // 重新加载其他配置
    const config = loadConfig()
    let configUpdated = false

    if (config) {
      if (config.punishmentConfig) {
        // 检查并转换旧格式的惩罚配置（数组格式 -> 对象格式）
        const punishmentConfig = config.punishmentConfig

        // 检查是否为旧格式（数组格式）
        if (
          Array.isArray(punishmentConfig.tools) ||
          Array.isArray(punishmentConfig.bodyParts) ||
          Array.isArray(punishmentConfig.positions)
        ) {
          console.log('检测到旧格式的惩罚配置，正在转换为新格式...', punishmentConfig)

          // 转换工具配置
          if (Array.isArray(punishmentConfig.tools)) {
            const toolsObj: Record<string, any> = {}
            punishmentConfig.tools.forEach((tool: any) => {
              toolsObj[tool.name] = {
                name: tool.name,
                intensity: tool.intensity,
                ratio: tool.ratio,
              }
            })
            punishmentConfig.tools = toolsObj
          }

          // 转换部位配置
          if (Array.isArray(punishmentConfig.bodyParts)) {
            const bodyPartsObj: Record<string, any> = {}
            punishmentConfig.bodyParts.forEach((bodyPart: any) => {
              bodyPartsObj[bodyPart.name] = {
                name: bodyPart.name,
                sensitivity: bodyPart.sensitivity,
                ratio: bodyPart.ratio,
              }
            })
            punishmentConfig.bodyParts = bodyPartsObj
          }

          // 转换姿势配置
          if (Array.isArray(punishmentConfig.positions)) {
            const positionsObj: Record<string, any> = {}
            punishmentConfig.positions.forEach((position: any) => {
              positionsObj[position.name] = {
                name: position.name,
                ratio: position.ratio,
              }
            })
            punishmentConfig.positions = positionsObj
          }

          console.log('惩罚配置格式转换完成')
        }

        gameState.punishmentConfig = punishmentConfig
        console.log('惩罚配置已更新')
        configUpdated = true
      }
      if (config.boardConfig) {
        gameState.boardConfig = config.boardConfig
        console.log('棋盘配置已更新')
        configUpdated = true
      }
      if (config.trapConfig) {
        trapConfig.value = config.trapConfig
        console.log('机关配置已更新')
        configUpdated = true
      }
    }

    // 如果配置有更新，重新生成棋盘
    if (configUpdated || playerSettings) {
      console.log('重新生成棋盘...')

      // 使用nextTick确保所有响应式更新完成
      await nextTick()

      gameState.board = GameService.createBoard(
        gameState.punishmentConfig,
        gameState.boardConfig,
        trapConfig.value
      )
      console.log('棋盘已重新生成')

      // 重置游戏状态
      if (gameStarted.value) {
        gameState.currentPlayerIndex = 0
        gameState.diceValue = null
        gameState.winner = null
        gameStarted.value = false
        gameFinished.value = false
        turnCount.value = 0
        console.log('游戏状态已重置')
      }
    }

    // 再次使用nextTick确保所有DOM更新完成
    await nextTick()

    // 显示成功提示
    alert(
      `✅ ${message}\n配置已成功应用到游戏中！${configUpdated || playerSettings ? '\n棋盘已重新生成。' : ''}`
    )

    console.log('导入处理完成，所有更新已应用')
  }

  const handleImportError = (error: string) => {
    console.error(`配置导入失败: ${error}`)
    // 显示错误提示
    alert(`❌ 配置导入失败\n${error}`)
  }

  // 监听游戏状态变化，自动显示引导
  watch(
    () => gameState.gameStatus,
    (newStatus, oldStatus) => {
      console.log(`游戏状态变化: ${oldStatus} -> ${newStatus}`)
      if (oldStatus && newStatus !== oldStatus) {
        // 仅在特定页面自动显示引导
        if (['intro', 'board_settings', 'settings'].includes(newStatus)) {
          showAutoGuide(newStatus)
        }
        // 当进入游戏页面时（waiting状态），显示游戏引导
        else if (
          newStatus === 'waiting' &&
          !['waiting', 'rolling', 'moving', 'showing_effect'].includes(oldStatus)
        ) {
          // 只有从非游戏状态进入waiting状态时才显示引导（避免游戏过程中重复显示）
          showAutoGuide('game')
        }
      }
    }
  )

  // 监听惩罚确认弹窗显示，自动显示引导
  watch(
    () => showPunishmentConfirmation.value,
    newValue => {
      console.log(`惩罚确认弹窗显示状态变化: ${newValue}`)
      if (newValue) {
        // 延迟显示引导，确保弹窗已完全渲染
        setTimeout(() => {
          showAutoGuide('punishment_confirmation')
        }, 500)
      }
    }
  )

  // 保存引导状态
  watch(
    () => hasShownGuide.value,
    newValue => {
      localStorage.setItem('hasShownGuide', JSON.stringify(Array.from(newValue)))
    },
    { deep: true }
  )
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
          <button class="btn-primary" @click="startGameWithStats">
            <span class="btn-icon">🚀</span>
            <span class="btn-text">开始游戏</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏页面 -->
    <div v-else class="game-page">
      <!-- 移动端顶部栏 -->
      <header class="game-header">
        <div class="header-content">
          <h1>🎲 惩罚飞行棋</h1>
        </div>
        <p>环形棋盘游戏，支持自定义惩罚设置</p>
      </header>

      <!-- 主要内容区域 -->
      <main class="game-main">
        <!-- 左侧骰子区域 -->
        <div class="left-sidebar">
          <div class="sidebar-content">
            <!-- 骰子区域 -->
            <Card class="dice-card">
              <template #title>
                <div class="card-title">
                  <i class="pi pi-circle"></i>
                  <span>投掷骰子</span>
                </div>
              </template>
              <template #content>
                <div class="dice-section">
                  <CoolDice
                    :can-roll="canRollDice"
                    :value="gameState.diceValue"
                    @roll="handleDiceRoll"
                  />
                </div>
              </template>
            </Card>

            <!-- 控制按钮 -->
            <div class="control-buttons">
              <PButton
                v-if="!gameStarted"
                label="开始游戏"
                icon="pi pi-play"
                class="p-button-success w-full"
                @click="handleGameControlsStart"
              />
              <PButton
                v-if="gameFinished"
                label="再来一局"
                icon="pi pi-refresh"
                class="p-button-info w-full"
                @click="resetGame"
              />
            </div>
          </div>
        </div>

        <!-- 右侧游戏区域 -->
        <div class="game-area">
          <!-- 移动端控制面板 -->
          <div class="mobile-control-panel">
            <!-- 左侧骰子区域 -->
            <div class="mobile-dice-section">
              <CoolDice
                :can-roll="canRollDice"
                :value="gameState.diceValue"
                @roll="handleDiceRoll"
              />
            </div>

            <!-- 右侧玩家状态区域 -->
            <div class="mobile-status-section">
              <!-- 合并的回合数和游戏状态显示 -->
              <div class="mobile-combined-status">
                <div class="mobile-turn-display">
                  <div class="turn-number">{{ turnCount }}</div>
                  <div class="turn-label">回合</div>
                </div>
                <div class="mobile-game-status">
                  <Tag
                    :value="gameStatusText"
                    :severity="getStatusSeverity(gameState.gameStatus)"
                    class="status-tag-mobile"
                  />
                </div>
              </div>

              <!-- 玩家状态面板 (移动端) - 扩展显示区域 -->
              <div class="mobile-players-container">
                <PlayerPanel
                  :players="gameState.players"
                  :current-player-index="gameState.currentPlayerIndex"
                  class="mobile-player-panel"
                />
              </div>
            </div>
          </div>

          <!-- 棋盘上方状态区域（桌面端） -->
          <div class="top-status-area desktop-only">
            <!-- 游戏状态 -->
            <Card class="compact-status-card">
              <template #content>
                <div class="compact-status-info">
                  <div class="status-item">
                    <i class="pi pi-info-circle status-icon"></i>
                    <span class="status-label">回合:</span>
                    <Badge :value="turnCount" class="turn-badge" />
                  </div>
                  <div class="status-item">
                    <span class="status-label">状态:</span>
                    <Tag
                      :value="gameStatusText"
                      :severity="getStatusSeverity(gameState.gameStatus)"
                      class="status-tag"
                    />
                  </div>
                </div>
              </template>
            </Card>

            <!-- 当前玩家 -->
            <Card
              v-if="gameState.players[gameState.currentPlayerIndex]"
              class="compact-current-player-card"
            >
              <template #content>
                <div class="compact-current-player">
                  <div
                    class="current-avatar"
                    :style="{
                      backgroundColor: gameState.players[gameState.currentPlayerIndex].color,
                    }"
                  >
                    ✈️
                  </div>
                  <div class="current-info">
                    <div class="current-name">
                      {{ gameState.players[gameState.currentPlayerIndex].name }}
                    </div>
                    <div class="current-position">
                      {{
                        gameState.players[gameState.currentPlayerIndex].position === 0
                          ? '起点'
                          : `第${gameState.players[gameState.currentPlayerIndex].position}格`
                      }}
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <!-- 玩家状态面板 (桌面端紧凑版) -->
            <PlayerPanel
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
            />

            <!-- 获胜者信息 -->
            <Card v-if="gameState.winner" class="compact-winner-card">
              <template #content>
                <div class="compact-winner-display">
                  <i class="pi pi-trophy winner-icon"></i>
                  <div class="winner-avatar" :style="{ backgroundColor: gameState.winner.color }">
                    🏆
                  </div>
                  <div class="winner-name">{{ gameState.winner.name }} 获胜!</div>
                </div>
              </template>
            </Card>
          </div>

          <!-- 棋盘区域 -->
          <div class="board-section">
            <GameBoard
              :board="gameState.board"
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
              :last-effect="lastEffect"
              @cell-click="handleCellClick"
            />
          </div>
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

    <!-- 反弹效果弹窗 -->
    <BounceDisplay
      :visible="showBounceDisplay"
      :from-position="bounceFromPosition"
      :target-position="bounceTargetPosition"
      :final-position="bounceFinalPosition"
      :overflow-steps="bounceOverflowSteps"
      :end-point="gameState.board.length"
      @confirm="confirmBounce"
    />

    <!-- 胜利结算画面 -->
    <VictoryScreen
      :show="showVictoryScreen"
      :winner="gameState.winner"
      :all-players="gameState.players"
      @play-again="handleVictoryPlayAgain"
    />

    <!-- 起飞失败过多自动起飞弹窗 -->
    <TakeoffReliefDisplay
      :visible="showTakeoffReliefDisplay"
      :failed-count="failedTakeoffCountForMessage"
      @confirm="confirmTakeoffRelief"
    />

    <!-- 用户引导按钮和设置 -->
    <div class="guide-controls">
      <!-- 配置导出按钮 -->
      <button class="export-btn" title="导出配置" @click="openConfigExport">
        <span class="export-icon">📤</span>
        <span class="export-text">导出</span>
      </button>

      <!-- 主要引导按钮 -->
      <button class="guide-btn" title="查看当前页面引导" @click="startGuide">
        <span class="guide-icon">❓</span>
        <span class="guide-text">帮助</span>
      </button>

      <!-- 引导设置菜单 -->
      <div class="guide-settings">
        <button
          class="settings-toggle"
          title="引导设置"
          @click="showGuideSettings = !showGuideSettings"
        >
          <span class="settings-icon">⚙️</span>
        </button>

        <!-- 设置菜单 -->
        <div v-if="showGuideSettings" class="settings-menu">
          <div class="settings-item">
            <label class="setting-label">
              <input
                v-model="autoGuideEnabled"
                type="checkbox"
                class="setting-checkbox"
                @change="toggleAutoGuide"
              />
              <span class="checkbox-text">自动显示引导</span>
            </label>
          </div>

          <div class="settings-item">
            <button class="reset-btn" title="重置引导状态" @click="resetGuideStatus">
              <span class="reset-icon">🔄</span>
              <span class="reset-text">重置引导</span>
            </button>
          </div>

          <div class="settings-footer">
            <small>首次访问页面时显示引导</small>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置导出对话框 -->
    <ConfigExport
      :visible="showConfigExport"
      :current-board="gameState.board"
      @close="closeConfigExport"
      @export-success="handleExportSuccess"
      @export-error="handleExportError"
      @import-success="handleImportSuccess"
      @import-error="handleImportError"
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
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .game-header {
    text-align: center;
    color: white;
    padding: clamp(0.5rem, 2vw, 1rem);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .game-header h1 {
    margin: 0;
    font-size: clamp(1.2rem, 4vw, 1.8rem);
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .game-header p {
    margin: clamp(0.25rem, 1vw, 0.5rem) 0 0 0;
    font-size: clamp(0.7rem, 2vw, 0.9rem);
    opacity: 0.9;
  }

  .game-main {
    flex: 1;
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    gap: 1rem;
    padding: 1rem;
  }

  .left-sidebar {
    width: 280px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    overflow-y: auto;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
    padding: 1rem;
  }

  .game-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .top-status-area {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1rem 2rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    min-height: 80px;
  }

  .board-section {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 500px;
    padding: 1rem;
  }

  /* 卡片样式 */
  .card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: #333;
  }

  .dice-card,
  .status-card,
  .current-player-card,
  .players-card,
  .winner-card {
    margin-bottom: 1rem;
  }

  .dice-section {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
    min-height: 200px;
  }

  /* 紧凑状态卡片样式 */
  .compact-status-card,
  .compact-current-player-card,
  .compact-players-card,
  .compact-winner-card {
    margin: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .compact-status-card .p-card-content,
  .compact-current-player-card .p-card-content,
  .compact-players-card .p-card-content,
  .compact-winner-card .p-card-content {
    padding: 0.75rem 1rem;
  }

  .compact-status-info {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .compact-status-info .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .status-icon {
    color: #667eea;
    font-size: 1rem;
  }

  .compact-current-player {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .compact-current-player .current-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .compact-current-player .current-info {
    flex: 1;
  }

  .compact-current-player .current-name {
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
    margin-bottom: 0.1rem;
  }

  .compact-current-player .current-position {
    font-size: 0.8rem;
    color: #666;
  }

  .compact-players-list {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .compact-player-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    transition: all 0.3s ease;
    font-size: 0.85rem;
  }

  .compact-player-item.current-player {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    transform: scale(1.02);
  }

  .compact-player-item .player-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: white;
    font-weight: bold;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .compact-player-item .player-details {
    flex: 1;
  }

  .compact-player-item .player-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.1rem;
    font-size: 0.8rem;
  }

  .compact-player-item .player-position {
    font-size: 0.7rem;
    color: #666;
  }

  .compact-player-item .current-indicator {
    color: #22c55e;
    font-size: 0.8rem;
  }

  .compact-winner-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #f59e0b;
    font-weight: 600;
  }

  .winner-icon {
    font-size: 1.2rem;
    color: #f59e0b;
  }

  .compact-winner-display .winner-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .compact-winner-display .winner-name {
    font-size: 0.9rem;
  }

  /* 移动端控制面板 */
  .mobile-control-panel {
    display: none;
  }

  .mobile-dice-section {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-status-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.6rem;
    height: 100%;
  }

  /* 合并的回合数和游戏状态显示 */
  .mobile-combined-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  /* 移动端回合数显示 - 紧凑版 */
  .mobile-turn-display {
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    min-width: 60px;
    flex-shrink: 0;
  }

  .turn-number {
    font-size: 1.2rem;
    font-weight: bold;
    line-height: 1;
  }

  .turn-label {
    font-size: 0.7rem;
    opacity: 0.9;
    margin-top: 0.1rem;
  }

  /* 移动端游戏状态 - 紧凑版 */
  .mobile-game-status {
    display: flex;
    justify-content: flex-start;
    flex: 1;
  }

  .status-tag-mobile {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
    white-space: nowrap;
  }

  /* 桌面端专用类 */
  .desktop-only {
    display: block;
  }

  /* 状态信息样式 */
  .status-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-label {
    font-weight: 500;
    color: #666;
  }

  .turn-badge {
    background: #3b82f6;
  }

  .status-tag {
    font-size: 0.875rem;
  }

  /* 当前玩家样式 */
  .current-player-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 8px;
    border: 2px solid rgba(59, 130, 246, 0.2);
  }

  .current-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .current-info {
    flex: 1;
  }

  .current-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .current-position {
    font-size: 0.9rem;
    color: #666;
  }

  /* 玩家列表样式 */
  .players-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .player-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    transition: all 0.3s ease;
  }

  .player-item.current-player {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    transform: scale(1.02);
  }

  .player-item.player-moving {
    animation: pulse 1s infinite;
  }

  .player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .player-details {
    flex: 1;
  }

  .player-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .player-position {
    font-size: 0.85rem;
    color: #666;
  }

  .current-indicator {
    color: #22c55e;
    font-size: 1.2rem;
    animation: bounce 1s infinite;
  }

  /* 获胜者样式 */
  .winner-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border-radius: 12px;
    color: white;
    text-align: center;
  }

  .winner-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .winner-name {
    font-size: 1.3rem;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* 控制按钮样式 */
  .control-buttons {
    margin-top: auto;
    padding-top: 1rem;
  }

  /* 动画效果 */
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
    60% {
      transform: translateY(-3px);
    }
  }

  /* 平板端适配 */
  @media (max-width: 1024px) and (min-width: 769px) {
    .game-main {
      flex-direction: column;
      padding: 0.5rem;
    }

    .left-sidebar {
      width: 100%;
      min-width: unset;
      border-right: none;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      overflow-y: visible;
    }

    .sidebar-content {
      flex-direction: row;
      gap: 1rem;
      padding: 1rem;
      justify-content: center;
    }

    .dice-card {
      flex: 0 0 auto;
      min-width: 300px;
    }

    .game-area {
      flex: 1;
    }

    .mobile-dice-area {
      display: none;
    }

    .top-status-area {
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }

    .board-section {
      min-height: 400px;
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .game-main {
      flex-direction: column;
      padding: 0;
      height: 100vh;
    }

    .left-sidebar {
      display: none;
    }

    .game-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    /* 移动端控制面板 - 扩大玩家状态区域 */
    .mobile-control-panel {
      display: flex;
      height: 38vh; /* 增加到屏幕高度的38% */
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 2px solid rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    /* 左侧骰子区域 - 占据控制面板的30% */
    .mobile-dice-section {
      width: 30%;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
      background: rgba(248, 249, 250, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* 右侧状态区域 - 占据控制面板的70% */
    .mobile-status-section {
      width: 70%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* 移动端玩家面板容器 - 扩展显示区域 */
    .mobile-players-container {
      flex: 1;
      overflow: hidden;
      min-height: 0; /* 允许flex子项收缩 */
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-top: 0.3rem;
      padding: 0.2rem;
    }

    /* 移动端玩家面板样式调整 */
    .mobile-player-panel {
      height: 100%;
      margin-bottom: 0;
    }

    .mobile-player-panel .player-panel {
      height: 100%;
      margin-bottom: 0;
      padding: 0.5rem;
      background: transparent;
    }

    .mobile-player-panel .player-panel h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      font-weight: 600;
    }

    .mobile-player-panel .players-container {
      max-height: none;
      height: calc(100% - 2rem); /* 减去标题高度 */
      min-height: 0;
      overflow-y: auto;
    }

    .mobile-player-panel .players-grid {
      grid-template-columns: 1fr;
      gap: 0.4rem;
      padding: 0.2rem;
    }

    .mobile-player-panel .player-card {
      padding: 0.5rem;
      border-width: 1px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .mobile-player-panel .player-card.current {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 3px 8px rgba(59, 130, 246, 0.25);
      transform: translateY(-1px);
    }

    .mobile-player-panel .player-header {
      gap: 0.5rem;
      margin-bottom: 0.4rem;
      align-items: center;
    }

    .mobile-player-panel .player-color {
      width: 16px;
      height: 16px;
      border-width: 2px;
      flex-shrink: 0;
      border-radius: 50%;
    }

    .mobile-player-panel .player-name {
      font-size: 0.85rem;
      font-weight: 600;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #333;
    }

    .mobile-player-panel .player-stats {
      gap: 0.35rem;
    }

    .mobile-player-panel .stat {
      gap: 0.4rem;
      align-items: center;
    }

    .mobile-player-panel .label {
      font-size: 0.75rem;
      min-width: 35px;
      color: #666;
      font-weight: 500;
    }

    .mobile-player-panel .value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #333;
    }

    .mobile-player-panel .players-container::-webkit-scrollbar {
      width: 2px;
    }

    .mobile-player-panel .players-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1px;
    }

    .mobile-player-panel .players-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
    }

    /* 隐藏桌面端状态区域 */
    .desktop-only {
      display: none;
    }

    /* 棋盘区域 - 相应减少高度 */
    .board-section {
      height: 62vh; /* 减少到屏幕高度的62% */
      flex-shrink: 0;
      padding: 0.5rem;
      overflow: hidden;
    }

    /* 移动端骰子尺寸调整 - 更紧凑 */
    .mobile-dice-section .cool-dice-container {
      padding: 0.3rem;
      gap: 0.3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .mobile-dice-section .dice-cube {
      width: 45px;
      height: 45px;
      margin: 0.5rem;
    }

    .mobile-dice-section .face {
      width: 45px;
      height: 45px;
    }

    .mobile-dice-section .face-1 {
      transform: rotateY(0deg) translateZ(22.5px);
    }
    .mobile-dice-section .face-2 {
      transform: rotateY(90deg) translateZ(22.5px);
    }
    .mobile-dice-section .face-3 {
      transform: rotateY(180deg) translateZ(22.5px);
    }
    .mobile-dice-section .face-4 {
      transform: rotateY(-90deg) translateZ(22.5px);
    }
    .mobile-dice-section .face-5 {
      transform: rotateX(90deg) translateZ(22.5px);
    }
    .mobile-dice-section .face-6 {
      transform: rotateX(-90deg) translateZ(22.5px);
    }

    .mobile-dice-section .dot {
      width: 7px;
      height: 7px;
    }

    .mobile-dice-section .result-display {
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .mobile-dice-section .result-number {
      font-size: 1.1rem;
      font-weight: bold;
    }

    .mobile-dice-section .dice-status {
      font-size: 0.7rem;
      margin-top: 0.2rem;
    }

    .mobile-dice-section .status-rolling,
    .mobile-dice-section .status-result,
    .mobile-dice-section .status-prompt {
      padding: 0.25rem 0.5rem;
      font-size: 0.65rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.8);
      text-align: center;
    }
  }

  @media (max-width: 768px) {
    .game-header {
      padding: 0.75rem;
    }

    .game-header h1 {
      font-size: 1.3rem;
    }

    .game-header p {
      font-size: 0.8rem;
    }

    .current-player-display {
      flex-direction: column;
      text-align: center;
      gap: 0.5rem;
    }

    .current-avatar {
      width: 45px;
      height: 45px;
      font-size: 1.3rem;
    }

    .player-avatar {
      width: 35px;
      height: 35px;
      font-size: 1rem;
    }

    .winner-avatar {
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
    }

    .winner-name {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .game-main {
      padding: 0.25rem;
    }

    /* 小屏幕优化控制面板高度 */
    .mobile-control-panel {
      height: 35vh; /* 保持合理的高度给玩家状态 */
    }

    .board-section {
      height: 65vh; /* 相应调整棋盘高度 */
    }

    /* 更紧凑的合并状态显示 */
    .mobile-combined-status {
      gap: 0.5rem;
      padding: 0.4rem;
    }

    .mobile-turn-display {
      padding: 0.3rem 0.5rem;
      min-width: 50px;
    }

    .turn-number {
      font-size: 1.1rem;
    }

    .turn-label {
      font-size: 0.65rem;
    }

    .status-tag-mobile {
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
    }

    /* 小屏幕骰子调整 */
    .mobile-dice-section .dice-cube {
      width: 40px;
      height: 40px;
      margin: 0.4rem;
    }

    .mobile-dice-section .face {
      width: 40px;
      height: 40px;
    }

    .mobile-dice-section .face-1 {
      transform: rotateY(0deg) translateZ(20px);
    }
    .mobile-dice-section .face-2 {
      transform: rotateY(90deg) translateZ(20px);
    }
    .mobile-dice-section .face-3 {
      transform: rotateY(180deg) translateZ(20px);
    }
    .mobile-dice-section .face-4 {
      transform: rotateY(-90deg) translateZ(20px);
    }
    .mobile-dice-section .face-5 {
      transform: rotateX(90deg) translateZ(20px);
    }
    .mobile-dice-section .face-6 {
      transform: rotateX(-90deg) translateZ(20px);
    }

    .mobile-dice-section .dot {
      width: 6px;
      height: 6px;
    }

    .mobile-dice-section .result-number {
      font-size: 1rem;
    }

    .mobile-dice-section .dice-status {
      font-size: 0.65rem;
    }

    /* 小屏幕玩家面板优化 */
    .mobile-player-panel .player-panel h3 {
      font-size: 0.8rem;
      margin-bottom: 0.3rem;
    }

    .mobile-player-panel .player-card {
      padding: 0.3rem;
    }

    .mobile-player-panel .player-name {
      font-size: 0.75rem;
    }

    .mobile-player-panel .label {
      font-size: 0.65rem;
      min-width: 28px;
    }

    .mobile-player-panel .value {
      font-size: 0.65rem;
    }

    .card-title {
      font-size: 0.9rem;
    }

    .current-name {
      font-size: 1rem;
    }

    .player-name {
      font-size: 0.9rem;
    }

    .status-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }

  /* 触摸优化 */
  @media (hover: none) and (pointer: coarse) {
    .dice:hover {
      transform: none;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
    }

    .dice:active {
      transform: scale(0.95);
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }

    .player-item:hover {
      background: #f8f9fa;
      transform: none;
    }

    .player-item:active {
      background: rgba(59, 130, 246, 0.1);
      transform: scale(0.98);
    }

    /* 增大触摸目标 */

    .control-buttons .p-button {
      min-height: 48px;
      padding: 0.75rem 1.5rem;
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 1024px) and (orientation: landscape) {
    .game-header {
      padding: 0.5rem;
    }

    .game-header h1 {
      font-size: 1.2rem;
    }

    .game-header p {
      font-size: 0.75rem;
    }

    .game-main {
      padding: 0.25rem;
    }

    .board-section {
      min-height: 300px;
    }

    .sidebar-content {
      gap: 0.75rem;
    }

    .dice-card .dice-section {
      padding: 0.5rem 0;
    }

    /* 横屏模式下的移动端控制面板优化 */
    .mobile-control-panel {
      height: 35vh; /* 横屏时稍微增加高度 */
    }

    .board-section {
      height: 65vh;
    }

    .mobile-combined-status {
      flex-direction: row;
      align-items: center;
    }

    .mobile-dice-section {
      width: 25%; /* 横屏时减少骰子区域宽度 */
    }

    .mobile-status-section {
      width: 75%; /* 横屏时增加状态区域宽度 */
    }
  }

  /* 高分辨率屏幕优化 */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .dice-face {
      border-width: 2px;
    }

    .dot {
      width: 13px;
      height: 13px;
    }

    .player-avatar,
    .current-avatar,
    .winner-avatar {
      border-width: 1px;
    }
  }

  /* 减少动画偏好 */
  @media (prefers-reduced-motion: reduce) {
    .dice.rolling {
      animation: none;
      transform: rotateX(360deg) rotateY(360deg);
    }

    .dice.can-roll {
      animation: none;
    }

    .dice.rolled {
      animation: none;
    }

    .current-indicator {
      animation: none;
    }

    .player-item.player-moving {
      animation: none;
    }

    * {
      transition-duration: 0.1s !important;
    }
  }

  /* 顶部信息区域 */
  /* 旧样式已被新的PrimeVue布局替代 */

  /* 旧的响应式样式已被新的PrimeVue响应式设计替代 */

  /* 旧的移动端样式已被新的响应式设计替代 */

  /* 旧的超小屏幕样式已被新的响应式设计替代 */

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

  /* 用户指引按钮 */
  .guide-btn {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 1.8rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .guide-btn:hover {
    transform: translateY(-2px);
  }

  .guide-icon {
    font-size: 1.5rem;
  }

  .guide-text {
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* 用户引导设置 */
  .guide-controls {
    position: fixed;
    bottom: 1.5rem;
    left: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    z-index: 1100;
  }

  .export-btn {
    background: rgba(59, 130, 246, 0.9);
    color: white;
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .export-btn:hover {
    transform: translateY(-2px);
    background: rgba(59, 130, 246, 1);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  .export-icon {
    font-size: 1.2rem;
  }

  .export-text {
    display: none;
    margin-left: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .guide-settings {
    position: relative;
  }

  .settings-toggle {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    border: 2px solid #ddd;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .settings-toggle:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 1);
    border-color: #ff6b6b;
  }

  .settings-menu {
    position: absolute;
    bottom: 60px;
    left: 0;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    min-width: 200px;
    animation: fadeInUp 0.3s ease;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .settings-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .settings-item:last-child {
    margin-bottom: 0;
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #333;
    cursor: pointer;
  }

  .setting-checkbox {
    width: 16px;
    height: 16px;
    accent-color: #ff6b6b;
  }

  .checkbox-text {
    font-weight: 500;
  }

  .reset-btn {
    background: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }

  .reset-btn:hover {
    background: #e55a5a;
    transform: translateY(-1px);
  }

  .reset-icon {
    font-size: 1rem;
  }

  .reset-text {
    font-weight: 500;
  }

  .settings-footer {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 0.75rem;
    color: #666;
    text-align: center;
    line-height: 1.3;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .guide-btn {
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
      bottom: 1rem;
      right: 1rem;
    }

    .guide-text {
      display: none;
    }

    .guide-controls {
      bottom: 1rem;
      left: 1rem;
    }

    .export-btn {
      width: 50px;
      height: 50px;
      font-size: 1rem;
    }

    .export-text {
      display: none;
    }

    .settings-toggle {
      width: 40px;
      height: 40px;
      font-size: 1rem;
    }

    .settings-menu {
      min-width: 180px;
      padding: 0.75rem;
    }
  }
</style>
