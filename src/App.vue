<script setup lang="ts">
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
  import { GameService } from './services/gameService'
  import {
    applyTurnConsequence,
    consumePendingSkippedTurn,
    finalizePunishmentCount,
    resolveRule,
    scaleResolvedPunishmentCount,
  } from './services/ruleResolution'
  import { GAME_CONFIG } from './config/gameConfig'
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    Settings,
    Target,
    Dices,
    Upload,
    HelpCircle,
    RotateCcw,
    Volume2,
    VolumeX,
    AlertCircle,
    Pause,
  } from '@lucide/vue'
  import type {
    GameState,
    Player,
    BoardCell,
    PunishmentConfig,
    PunishmentAction,
    PunishmentCombination,
    BoardConfig,
    TrapAction,
    ResolvedPunishmentAction,
    ResolvedRuleResult,
  } from './types/game'
  import IntroPage from './components/IntroPage.vue'
  import GameBoard from './components/GameBoard.vue'
  import PlayerPanel from './components/PlayerPanel.vue'
  import BoardConfigPanel from './components/BoardConfig.vue'
  import PunishmentConfigPanel from './components/PunishmentConfig.vue'
  import TrapConfigPanel from './components/TrapConfig.vue'
  import PunishmentDisplay from './components/PunishmentDisplay.vue'
  import PunishmentConfirmation from './components/PunishmentConfirmation.vue'
  import EffectDisplay from './components/EffectDisplay.vue'
  import TakeoffPunishmentDisplay from './components/TakeoffPunishmentDisplay.vue'
  import TrapDisplay from './components/TrapDisplay.vue'
  import VictoryScreen from './components/VictoryScreen.vue'
  import TakeoffReliefDisplay from './components/TakeoffReliefDisplay.vue'
  import BounceDisplay from './components/BounceDisplay.vue'
  import DoublePunishmentReveal from './components/DoublePunishmentReveal.vue'
  import ChainPunishmentRoll from './components/ChainPunishmentRoll.vue'
  import MercyDecision from './components/MercyDecision.vue'
  import SessionPauseOverlay from './components/SessionPauseOverlay.vue'
  import ConfigExport from './components/ConfigExport.vue'
  import { saveConfig, loadConfig, loadPlayerSettings } from './utils/cache'
  import { SecureRandom } from './utils/secureRandom'
  import { devLog } from './utils/logger'
  import {
    hasBlockingOverlay,
    shouldRecoverMovingState,
    type BlockingOverlayState,
  } from './services/gameStateHealth'
  import { audioService } from './services/audioService'
  import { usePlayerState } from './composables/usePlayerState'
  import { usePunishmentConfigNormalizer } from './composables/usePunishmentConfigNormalizer'
  import { useImportFeedbackDialog } from './composables/useImportFeedbackDialog'
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
  const sessionPaused = ref(false)

  // 移动端 PlayerPanel 折叠状态
  const playerPanelCollapsed = ref(true)
  const windowWidth = ref(window.innerWidth)

  const isMobileView = computed(() => windowWidth.value <= 768)

  const onWindowResize = () => {
    windowWidth.value = window.innerWidth
    if (!isMobileView.value) {
      playerPanelCollapsed.value = false
    }
  }

  const togglePlayerPanel = () => {
    playerPanelCollapsed.value = !playerPanelCollapsed.value
  }

  // 设置页 Tab 状态
  const settingsTab = ref<'board' | 'punishment' | 'trap'>('board')
  const tabOrder = ['board', 'punishment', 'trap'] as const

  function nextStep() {
    const idx = tabOrder.indexOf(settingsTab.value)
    if (idx < tabOrder.length - 1) settingsTab.value = tabOrder[idx + 1]
  }

  function prevStep() {
    const idx = tabOrder.indexOf(settingsTab.value)
    if (idx > 0) settingsTab.value = tabOrder[idx - 1]
  }

  // 音效状态
  const audioEnabled = ref(true)

  const turnCount = ref(0)
  const lastEffect = ref<string>('')
  const currentPunishment = ref<PunishmentAction | null>(null)
  const currentPunishmentTarget = ref<Player | null>(null)
  const pendingRuleResolution = ref<ResolvedRuleResult | null>(null)

  // 惩罚组合确认状态
  const punishmentCombinations = ref<PunishmentCombination[]>([])
  const punishmentStep = ref<'config' | 'confirm'>('config')

  watch([settingsTab, punishmentStep], () => {
    if (!isMobileView.value) return
    void nextTick(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  })

  // 新增效果位置状态
  const effectFromPosition = ref<number | undefined>(undefined)
  const effectToPosition = ref<number | undefined>(undefined)

  // 起飞惩罚显示状态
  const showTakeoffPunishmentDisplay = ref(false)
  const currentTakeoffPunishment = ref<PunishmentAction | null>(null)
  const currentTakeoffDiceValue = ref(0)
  const currentTakeoffExecutorIndex = ref(0)

  // 执行惩罚的玩家状态
  const currentPunishmentExecutor = ref<Player | null>(null)

  // 机关配置状态
  const trapConfig = ref<TrapAction[]>(GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS))

  const { createPlayersFromSettings, createPlayersForReset } = usePlayerState()
  const { normalizePunishmentConfig } = usePunishmentConfigNormalizer()
  const {
    importFeedbackVisible,
    importFeedbackTitle,
    importFeedbackMessage,
    importFeedbackType,
    showImportSuccess,
    showImportError,
    closeImportFeedback,
  } = useImportFeedbackDialog()

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
  const MAX_EFFECT_CHAIN_COUNT = 5
  const effectChainCount = ref(0)

  // 翻倍惩罚状态
  const showDoublePunishmentReveal = ref(false)
  const isDoublePunishment = ref(false)
  const pendingDoublePunishment = ref<PunishmentAction | null>(null)

  // 连锁惩罚状态
  const isChainPunishment = ref(false)
  const showChainPunishmentRoll = ref(false)

  // 求饶状态
  const MERCY_MULTIPLIER = 1.5
  const showMercyDecision = ref(false)
  const mercyHalvedStrikes = ref(0)
  const mercySource = ref<'board' | 'takeoff'>('board')
  const mercyRequested = ref(false)
  const mercyExecutorPlayer = ref<Player | null>(null)
  const mercyTargetPlayer = ref<Player | null>(null)

  // 胜利结算画面状态
  const showVictoryScreen = ref(false)

  const currentPunishmentCountSelection = computed(() => {
    const resolution = pendingRuleResolution.value
    const count = resolution?.kind === 'punishment' ? resolution.count : null
    return count?.kind === 'awaiting_external_count' ? count : null
  })
  const currentPunishmentCountMultiplier = computed(() => {
    const resolution = pendingRuleResolution.value
    return resolution?.kind === 'punishment' ? (resolution.countMultiplier ?? 1) : 1
  })
  const canRequestBoardMercy = computed(
    () =>
      !isDoublePunishment.value &&
      !mercyRequested.value &&
      currentPunishmentCountSelection.value === null
  )
  const canRequestTakeoffMercy = computed(() => !mercyRequested.value)

  const toMutablePunishmentAction = (punishment: ResolvedPunishmentAction): PunishmentAction => ({
    ...punishment,
    tool: { ...punishment.tool },
    bodyPart: { ...punishment.bodyPart },
    position: {
      ...punishment.position,
      compatibleBodyParts: [...punishment.position.compatibleBodyParts],
    },
  })

  const handleMercyRequest = (source: 'board' | 'takeoff') => {
    const punishment = source === 'board' ? currentPunishment.value : currentTakeoffPunishment.value
    if (!punishment || punishment.strikes == null) return

    mercySource.value = source
    mercyHalvedStrikes.value = Math.ceil(punishment.strikes / 2)
    mercyTargetPlayer.value =
      source === 'board'
        ? currentPunishmentTarget.value
        : (gameState.players[gameState.currentPlayerIndex] ?? null)
    if (source === 'board') {
      mercyExecutorPlayer.value = currentPunishmentExecutor.value
    } else {
      const idx = currentTakeoffExecutorIndex.value
      mercyExecutorPlayer.value =
        idx >= 0 && idx < gameState.players.length ? gameState.players[idx] : null
    }
    showMercyDecision.value = true
  }

  const handleMercyResult = (accepted: boolean) => {
    showMercyDecision.value = false
    mercyRequested.value = true

    if (!accepted) return

    const targetPlayer =
      mercySource.value === 'board'
        ? currentPunishmentTarget.value
        : gameState.players[gameState.currentPlayerIndex]
    if (!targetPlayer) return

    const punishmentResolution = pendingRuleResolution.value
    if (
      punishmentResolution?.kind !== 'punishment' ||
      punishmentResolution.count.kind !== 'fixed'
    ) {
      return
    }
    const halvedResolution = scaleResolvedPunishmentCount(punishmentResolution, 0.5)
    pendingRuleResolution.value = halvedResolution
    const halvedAction = toMutablePunishmentAction(halvedResolution.action)

    if (mercySource.value === 'board') {
      currentPunishment.value = halvedAction
    } else {
      currentTakeoffPunishment.value = halvedAction
    }

    targetPlayer.pendingMercyMultiplier = MERCY_MULTIPLIER
  }

  const resetEffectChainCount = () => {
    effectChainCount.value = 0
  }

  const getCellEffectByPosition = (position: number) => {
    const targetCell = gameState.board.find(cell => cell.position === position)
    return targetCell?.effect
  }

  interface LandingEffectPayload {
    currentPlayer: Player
    fromPosition: number
    newPosition: number
    punishment?: PunishmentAction
    cellEffect?: BoardCell['effect']
    diceValue?: number
  }

  const handleLandingCellEffect = async ({
    currentPlayer,
    fromPosition,
    newPosition,
    punishment,
    cellEffect,
    diceValue,
  }: LandingEffectPayload) => {
    const resolvedCellEffect = cellEffect ?? getCellEffectByPosition(newPosition)
    const resolvedPunishment =
      punishment ||
      (resolvedCellEffect?.type === 'punishment' || resolvedCellEffect?.type === 'chain_punishment'
        ? resolvedCellEffect.punishment
        : undefined)

    // 标记连锁惩罚格
    if (resolvedCellEffect?.type === 'chain_punishment') {
      isChainPunishment.value = true
    } else {
      isChainPunishment.value = false
    }

    const hasLandingTrigger =
      Boolean(resolvedPunishment) ||
      Boolean(resolvedCellEffect && resolvedCellEffect.type !== 'bounce')

    if (hasLandingTrigger) {
      if (effectChainCount.value >= MAX_EFFECT_CHAIN_COUNT) {
        lastEffect.value = `连锁效果超过${MAX_EFFECT_CHAIN_COUNT}次，已强制结束本回合`
        await continueAfterMove()
        return
      }
      effectChainCount.value++
    }

    if (resolvedPunishment) {
      const actorIndex = gameState.currentPlayerIndex
      const punishmentResolution = !currentPlayer.hasTakenOff
        ? resolveRule({
            source: 'takeoff_failure',
            actorIndex,
            players: gameState.players,
            punishmentConfig: gameState.punishmentConfig,
            diceValue: diceValue ?? gameState.diceValue ?? undefined,
            punishmentAction: resolvedPunishment,
          })
        : resolveRule({
            source: 'board_punishment',
            actorIndex,
            players: gameState.players,
            punishmentConfig: gameState.punishmentConfig,
            diceValue: diceValue ?? gameState.diceValue ?? undefined,
            boardAction: resolvedPunishment,
          })
      const targetPlayer = gameState.players[punishmentResolution.targetPlayerIndex]
      const executorPlayer =
        punishmentResolution.executorIndex === undefined
          ? null
          : (gameState.players[punishmentResolution.executorIndex] ?? null)
      const displayAction = toMutablePunishmentAction(punishmentResolution.action)
      if (punishmentResolution.countMultiplier) {
        targetPlayer.pendingMercyMultiplier = undefined
      }
      pendingRuleResolution.value = punishmentResolution

      // 当玩家尚未起飞(仍停留在起点)且出现惩罚时，视为未起飞惩罚
      if (!currentPlayer.hasTakenOff) {
        currentTakeoffPunishment.value = displayAction
        currentTakeoffDiceValue.value = diceValue ?? gameState.diceValue ?? 0
        currentTakeoffExecutorIndex.value = punishmentResolution.executorIndex ?? -1
        mercyRequested.value = false
        showTakeoffPunishmentDisplay.value = true
        audioService.play('punishment')
        handleTakeoffPunishmentDisplay()
        return
      }

      currentPunishment.value = displayAction
      currentPunishmentTarget.value = targetPlayer
      currentPunishmentExecutor.value = executorPlayer
      mercyRequested.value = false
      audioService.play('punishment')
      gameState.gameStatus = 'configuring'
      return
    }

    if (resolvedCellEffect && resolvedCellEffect.type === 'trap') {
      const trapResolution = resolveRule({
        source: 'trap',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        effect: resolvedCellEffect,
      })
      pendingRuleResolution.value = trapResolution
      currentTrapDescription.value = trapResolution.description || '未知机关'
      showTrapDisplay.value = true
      audioService.play('trap')
      return
    }

    if (resolvedCellEffect && resolvedCellEffect.type === 'bounce') {
      pendingRuleResolution.value = resolveRule({
        source: 'cell_effect',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        effect: resolvedCellEffect,
      })
      bounceFromPosition.value = fromPosition
      bounceTargetPosition.value = fromPosition + (diceValue ?? gameState.diceValue ?? 0)
      bounceFinalPosition.value = newPosition
      bounceOverflowSteps.value = resolvedCellEffect.value
      showBounceDisplay.value = true
      return
    }

    if (
      resolvedCellEffect &&
      resolvedCellEffect.type !== 'punishment' &&
      (resolvedCellEffect.type === 'move' ||
        resolvedCellEffect.type === 'reverse' ||
        resolvedCellEffect.type === 'restart' ||
        resolvedCellEffect.type === 'rest')
    ) {
      if (resolvedCellEffect.type === 'move' && resolvedCellEffect.value > 0) {
        audioService.play('bonus')
      }
      // 到达第1格（飞机场）时，不显示效果确认弹窗
      if (newPosition === 1) {
        pendingRuleResolution.value = null
        await continueAfterMove()
        return
      }

      const effectType = resolvedCellEffect.type as 'move' | 'reverse' | 'restart' | 'rest'
      const finalPosition =
        newPosition +
        (effectType === 'move'
          ? resolvedCellEffect.value
          : effectType === 'reverse'
            ? -resolvedCellEffect.value
            : effectType === 'restart'
              ? -newPosition
              : 0)

      const effectResolution = resolveRule({
        source: 'cell_effect',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        effect: {
          type: effectType,
          value: resolvedCellEffect.value,
          description: getThreeStepMoveDescription(
            fromPosition,
            newPosition,
            finalPosition,
            effectType
          ),
        },
      })
      pendingRuleResolution.value = effectResolution
      gameState.pendingEffect = {
        type: effectType,
        value: resolvedCellEffect.value,
        description: effectResolution.effect.description,
      }
      effectFromPosition.value = fromPosition
      effectToPosition.value = newPosition
      gameState.gameStatus = 'showing_effect'
      return
    }

    pendingRuleResolution.value = null
    await continueAfterMove()
  }

  // 计算属性
  const canRollDice = computed(() => {
    return (
      gameStarted.value &&
      !gameFinished.value &&
      gameState.gameStatus === 'waiting' &&
      !sessionPaused.value &&
      !currentPunishment.value &&
      !showTakeoffPunishmentDisplay.value &&
      !showTrapDisplay.value &&
      !showDoublePunishmentReveal.value &&
      !showChainPunishmentRoll.value
    )
  })

  const hasActiveForcedOverlay = computed(
    () =>
      Boolean(currentPunishment.value) ||
      showTakeoffPunishmentDisplay.value ||
      showTrapDisplay.value ||
      showBounceDisplay.value ||
      showDoublePunishmentReveal.value ||
      showChainPunishmentRoll.value ||
      showMercyDecision.value ||
      showTakeoffReliefDisplay.value ||
      gameState.gameStatus === 'showing_effect'
  )

  const canPauseSession = computed(
    () =>
      gameStarted.value &&
      !gameFinished.value &&
      (gameState.gameStatus === 'waiting' ||
        gameState.gameStatus === 'configuring' ||
        hasActiveForcedOverlay.value)
  )

  const isConfigValid = computed(() => {
    return GameService.validatePunishmentConfig(gameState.punishmentConfig).isValid
  })

  const isBoardConfigValid = computed(() => {
    return GameService.validateBoardConfig(gameState.boardConfig)
  })

  const isTrapConfigValid = computed(() => {
    return trapConfig.value.length > 0
  })

  const stepCompleted = computed(() => ({
    board: isBoardConfigValid.value,
    punishment: isConfigValid.value,
    trap: isTrapConfigValid.value,
  }))

  const allConfigValid = computed(() => {
    return isBoardConfigValid.value && isConfigValid.value && isTrapConfigValid.value
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
    currentPunishmentTarget.value = null
    pendingRuleResolution.value = null
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    effectFromPosition.value = undefined
    effectToPosition.value = undefined
    isDoublePunishment.value = false
    isChainPunishment.value = false
    showDoublePunishmentReveal.value = false
    showChainPunishmentRoll.value = false
    pendingDoublePunishment.value = null
    showMercyDecision.value = false
    mercyRequested.value = false
    mercyExecutorPlayer.value = null
    mercyTargetPlayer.value = null
    sessionPaused.value = false
    resetEffectChainCount()

    devLog('游戏状态已重置')
  }

  const healthCheckIntervalId = ref<number | null>(null)
  const movingStateEnteredAt = ref<number | null>(null)
  const playerMovingTimeoutMap = new Map<number, number>()

  const clearAllPlayerMovingTimeouts = () => {
    playerMovingTimeoutMap.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    playerMovingTimeoutMap.clear()
  }

  // 状态检查机制
  const checkGameStateHealth = () => {
    const blockingOverlays: BlockingOverlayState = {
      takeoffPunishment: showTakeoffPunishmentDisplay.value,
      trap: showTrapDisplay.value,
      bounce: showBounceDisplay.value,
      takeoffRelief: showTakeoffReliefDisplay.value,
      doublePunishmentReveal: showDoublePunishmentReveal.value,
      chainPunishmentRoll: showChainPunishmentRoll.value,
      mercyDecision: showMercyDecision.value,
      sessionPaused: sessionPaused.value,
    }

    // 检查是否卡在 moving 状态超过 5 秒
    if (gameState.gameStatus === 'moving' && !hasBlockingOverlay(blockingOverlays)) {
      if (movingStateEnteredAt.value === null) {
        movingStateEnteredAt.value = Date.now()
      } else if (
        shouldRecoverMovingState(
          gameState.gameStatus,
          Date.now() - movingStateEnteredAt.value,
          blockingOverlays
        )
      ) {
        console.warn('检测到游戏卡在moving状态超过5秒，正在重置...')
        movingStateEnteredAt.value = null
        resetGameStateOnError()
      }
    } else {
      movingStateEnteredAt.value = null
    }

    // 检查玩家移动状态是否异常
    gameState.players.forEach(player => {
      if (player.isMoving) {
        if (!playerMovingTimeoutMap.has(player.id)) {
          const timeoutId = window.setTimeout(() => {
            playerMovingTimeoutMap.delete(player.id)
            if (player.isMoving) {
              console.warn(`玩家 ${player.name} 的移动状态异常，正在清除...`)
              player.isMoving = false
            }
          }, 3000)
          playerMovingTimeoutMap.set(player.id, timeoutId)
        }
      } else {
        const timeoutId = playerMovingTimeoutMap.get(player.id)
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
          playerMovingTimeoutMap.delete(player.id)
        }
      }
    })
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('未处理的Promise错误:', event.reason)
    resetGameStateOnError()
  }

  const handleGlobalError = (event: ErrorEvent) => {
    console.error('全局错误:', event.error)
    resetGameStateOnError()
  }

  // 添加全局错误监听
  const toggleAudio = () => {
    audioEnabled.value = audioService.toggle()
  }

  onMounted(() => {
    audioService.init()
    audioEnabled.value = audioService.enabled

    window.addEventListener('resize', onWindowResize)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // 监听全局错误
    window.addEventListener('error', handleGlobalError)

    // 定期检查游戏状态健康度
    healthCheckIntervalId.value = window.setInterval(checkGameStateHealth, 2000) // 每2秒检查一次

    // 组件挂载时初始化游戏
    initializeGame()

    // 初始化后尝试读取本地缓存配置并应用
    const cached = loadConfig()
    if (cached) {
      let shouldRepairCachedConfig = false
      if (cached.boardConfig) {
        // 向后兼容：旧配置可能缺少 chainPunishmentCells
        if (cached.boardConfig.chainPunishmentCells === undefined) {
          cached.boardConfig.chainPunishmentCells = 0
        }
        if (GameService.validateBoardConfig(cached.boardConfig)) {
          gameState.boardConfig = cached.boardConfig
          devLog('已加载棋盘配置:', cached.boardConfig)
        } else {
          shouldRepairCachedConfig = true
          console.warn('忽略不兼容的旧棋盘配置，已恢复默认棋盘')
        }
      }
      if (cached.punishmentConfig) {
        gameState.punishmentConfig = normalizePunishmentConfig(cached.punishmentConfig)
        devLog('已加载惩罚配置:', gameState.punishmentConfig)
      }
      if (cached.trapConfig) {
        trapConfig.value = cached.trapConfig
        devLog('已加载机关配置:', cached.trapConfig)
      }

      if (shouldRepairCachedConfig) {
        saveConfig({
          boardConfig: gameState.boardConfig,
          punishmentConfig: gameState.punishmentConfig,
          trapConfig: trapConfig.value,
        })
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
      devLog('已加载玩家设置:', cachedPlayerSettings)
      gameState.players = createPlayersFromSettings(cachedPlayerSettings)
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
        punishmentCombinations: typeof punishmentCombinations
        punishmentStep: typeof punishmentStep
        effectFromPosition: typeof effectFromPosition
        effectToPosition: typeof effectToPosition
        showTakeoffPunishmentDisplay: typeof showTakeoffPunishmentDisplay
        currentTakeoffPunishment: typeof currentTakeoffPunishment
        currentTakeoffDiceValue: typeof currentTakeoffDiceValue
        currentTakeoffExecutorIndex: typeof currentTakeoffExecutorIndex
        currentPunishmentExecutor: typeof currentPunishmentExecutor
        currentPunishmentTarget: typeof currentPunishmentTarget
        pendingRuleResolution: typeof pendingRuleResolution
        sessionPaused: typeof sessionPaused
        showTrapDisplay: typeof showTrapDisplay
        currentTrapPunishment: typeof currentTrapPunishment
        currentTrapDescription: typeof currentTrapDescription
        checkGameStateHealth: typeof checkGameStateHealth
      }

      debugWindow.gameState = gameState
      debugWindow.trapConfig = trapConfig
      debugWindow.gameStarted = gameStarted
      debugWindow.gameFinished = gameFinished
      debugWindow.turnCount = turnCount
      debugWindow.lastEffect = lastEffect
      debugWindow.currentPunishment = currentPunishment
      debugWindow.punishmentCombinations = punishmentCombinations
      debugWindow.punishmentStep = punishmentStep
      debugWindow.effectFromPosition = effectFromPosition
      debugWindow.effectToPosition = effectToPosition
      debugWindow.showTakeoffPunishmentDisplay = showTakeoffPunishmentDisplay
      debugWindow.currentTakeoffPunishment = currentTakeoffPunishment
      debugWindow.currentTakeoffDiceValue = currentTakeoffDiceValue
      debugWindow.currentTakeoffExecutorIndex = currentTakeoffExecutorIndex
      debugWindow.currentPunishmentExecutor = currentPunishmentExecutor
      debugWindow.currentPunishmentTarget = currentPunishmentTarget
      debugWindow.pendingRuleResolution = pendingRuleResolution
      debugWindow.sessionPaused = sessionPaused
      debugWindow.showTrapDisplay = showTrapDisplay
      debugWindow.currentTrapPunishment = currentTrapPunishment
      debugWindow.currentTrapDescription = currentTrapDescription
      debugWindow.checkGameStateHealth = checkGameStateHealth
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
      devLog(`nextTick检查，当前状态: ${currentStatus}`)
      if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
        devLog(`立即触发自动引导检查`)
        showAutoGuide(currentStatus)
      }
    })

    // 延迟检查作为备用
    setTimeout(() => {
      const currentStatus = gameState.gameStatus
      devLog(`页面加载完成，当前状态: ${currentStatus}`)
      if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
        devLog(`触发页面加载时的自动引导检查`)
        showAutoGuide(currentStatus)
      }
    }, 1200) // 延迟1.2秒确保页面完全渲染
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    window.removeEventListener('error', handleGlobalError)

    if (healthCheckIntervalId.value !== null) {
      clearInterval(healthCheckIntervalId.value)
      healthCheckIntervalId.value = null
    }
    clearAllPlayerMovingTimeouts()
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
    sessionPaused.value = false
    turnCount.value = 0
    lastEffect.value = ''
    currentPunishment.value = null
    currentPunishmentExecutor.value = null // 清除执行惩罚的玩家
    currentPunishmentTarget.value = null
    pendingRuleResolution.value = null

    // 清除惩罚组合确认状态
    punishmentCombinations.value = []
    punishmentStep.value = 'config'
    resetEffectChainCount()
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

    if (gameState.gameStatus === 'settings' || gameState.gameStatus === 'board_settings') {
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
    const cachedPlayerSettings = loadPlayerSettings()
    gameState.players = createPlayersForReset(gameState.players, cachedPlayerSettings)
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
    currentPunishmentTarget.value = null
    pendingRuleResolution.value = null
    sessionPaused.value = false

    // 清除惩罚组合确认状态
    punishmentCombinations.value = []
    punishmentStep.value = 'config'
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    currentTakeoffExecutorIndex.value = -1

    // 清除所有强制结算弹层，结束本局后不残留旧流程
    showTrapDisplay.value = false
    currentTrapPunishment.value = null
    currentTrapDescription.value = ''
    showDoublePunishmentReveal.value = false
    isDoublePunishment.value = false
    pendingDoublePunishment.value = null
    showChainPunishmentRoll.value = false
    isChainPunishment.value = false
    showTakeoffReliefDisplay.value = false

    // 清除反弹效果状态
    showBounceDisplay.value = false
    bounceFromPosition.value = 0
    bounceTargetPosition.value = 0
    bounceFinalPosition.value = 0
    bounceOverflowSteps.value = 0

    // 清除胜利结算画面状态
    showVictoryScreen.value = false
    resetEffectChainCount()

    // 清除求饶状态
    showMercyDecision.value = false
    mercyRequested.value = false
    mercyExecutorPlayer.value = null
    mercyTargetPlayer.value = null

    // 直接跳转到棋盘设置页面
    gameState.gameStatus = 'board_settings'
  }

  const pauseSession = () => {
    if (!canPauseSession.value) return
    sessionPaused.value = true
  }

  const resumeSession = () => {
    sessionPaused.value = false
  }

  const endPausedSession = () => {
    sessionPaused.value = false
    resetGame()
  }

  // 处理骰子滚动
  const handleDiceRoll = async () => {
    if (!canRollDice.value) return

    const currentPlayerIndex = gameState.currentPlayerIndex
    const currentPlayer = gameState.players[currentPlayerIndex]
    const pendingTurn = consumePendingSkippedTurn(currentPlayer)
    if (pendingTurn.shouldSkip) {
      gameState.players[currentPlayerIndex] = pendingTurn.player
      lastEffect.value = `${currentPlayer.name}休息一回合，本回合已跳过`
      advanceToNextPlayablePlayer()
      return
    }

    audioService.play('diceRoll')
    resetEffectChainCount()
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

      const { newPosition, effect, punishment, cellEffect, canTakeOff, forcedTakeoffDueToFailure } =
        GameService.movePlayer(
          currentPlayer,
          diceValue,
          gameState.board,
          gameState.currentPlayerIndex,
          gameState.players.length,
          gameState.punishmentConfig
        )

      // 更新玩家位置
      currentPlayer.position = newPosition
      audioService.play('pieceStep')

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
        audioService.play('victory')
        resetEffectChainCount()
        return
      }

      // 检查是否触发连续失败自动起飞
      if (forcedTakeoffDueToFailure) {
        failedTakeoffCountForMessage.value = gameState.punishmentConfig.maxTakeoffFailures || 5
        showTakeoffReliefDisplay.value = true
        // 保持moving状态，等待用户确认
        return
      }

      await handleLandingCellEffect({
        currentPlayer,
        fromPosition,
        newPosition,
        punishment,
        cellEffect,
        diceValue,
      })
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

      let currentPlayer = gameState.players[gameState.currentPlayerIndex]
      const landingPositionBeforeEffect = currentPlayer.position

      // 保存效果类型，因为后面会清除pendingEffect
      const pendingEffect = gameState.pendingEffect
      const effectType = pendingEffect.type
      const effectResolution = pendingRuleResolution.value
      if (effectResolution?.kind !== 'cell_effect') {
        throw new Error('缺少已解析的格子效果')
      }

      // 记录三段路径的位置
      const originalPosition = effectFromPosition.value // 原始位置（骰子移动前）
      const diceMovePosition = effectToPosition.value // 骰子移动后的位置

      // 处理格子效果
      const currentBoardSize = gameState.board.length
      const { newPosition } = GameService.processCellEffect(
        currentPlayer,
        pendingEffect,
        currentBoardSize
      )

      // 更新玩家位置与回合后果
      currentPlayer = applyTurnConsequence(currentPlayer, effectResolution.turnConsequence)
      currentPlayer.position = newPosition
      gameState.players[gameState.currentPlayerIndex] = currentPlayer

      // 立即清除待处理效果和状态，避免显示多余的弹窗
      gameState.pendingEffect = null
      pendingRuleResolution.value = null
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
        resetEffectChainCount()
        return
      }

      // 连锁结算：继续检查当前落点是否还有效果
      if (landingPositionBeforeEffect === newPosition) {
        await continueAfterMove()
        return
      }

      await handleLandingCellEffect({
        currentPlayer,
        fromPosition: landingPositionBeforeEffect,
        newPosition,
      })
    } catch (error) {
      console.error('确认效果时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      gameState.pendingEffect = null
      pendingRuleResolution.value = null
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

  function advanceToNextPlayablePlayer() {
    if (gameState.players.length === 0) return

    gameState.currentPlayerIndex = GameService.getNextPlayer(
      gameState.currentPlayerIndex,
      gameState.players.length
    )
    turnCount.value++

    const pendingTurnBudget =
      gameState.players.reduce(
        (total, player) => total + Math.max(0, player.pendingSkippedTurns ?? 0),
        0
      ) + gameState.players.length
    let remainingChecks = pendingTurnBudget

    while (remainingChecks > 0) {
      const playerIndex = gameState.currentPlayerIndex
      const player = gameState.players[playerIndex]
      const consumedTurn = consumePendingSkippedTurn(player)
      if (!consumedTurn.shouldSkip) break

      gameState.players[playerIndex] = consumedTurn.player
      lastEffect.value = `${player.name}休息一回合，本回合已跳过`
      gameState.currentPlayerIndex = GameService.getNextPlayer(
        playerIndex,
        gameState.players.length
      )
      turnCount.value++
      remainingChecks--
    }

    gameState.diceValue = null
    gameState.gameStatus = 'waiting'
  }

  // 移动后的继续流程
  const continueAfterMove = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      resetEffectChainCount()

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

      advanceToNextPlayablePlayer()

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
  const confirmPunishment = async (selectedCount?: number) => {
    try {
      const punishmentResolution = pendingRuleResolution.value
      if (
        punishmentResolution?.kind === 'punishment' &&
        punishmentResolution.count.kind === 'awaiting_external_count'
      ) {
        if (selectedCount === undefined || !currentPunishmentTarget.value) {
          throw new Error('需要先选择本次惩罚次数')
        }
        const finalizedResolution = finalizePunishmentCount(punishmentResolution, selectedCount)
        currentPunishment.value = toMutablePunishmentAction(finalizedResolution.action)
        pendingRuleResolution.value = finalizedResolution
      }

      // 连锁惩罚：确认后进入连锁掷骰阶段
      if (isChainPunishment.value) {
        currentPunishment.value = null
        showChainPunishmentRoll.value = true
        return
      }

      // 翻倍陷阱：如果当前不是翻倍状态，检查是否触发翻倍
      if (!isDoublePunishment.value && currentPunishment.value) {
        const chance = gameState.punishmentConfig.doublePunishmentChance ?? 0
        if (chance > 0 && SecureRandom.randomInt(1, 100) <= chance) {
          pendingDoublePunishment.value = { ...currentPunishment.value }
          currentPunishment.value = null
          showDoublePunishmentReveal.value = true
          return
        }
      }

      // 正常结束惩罚
      isDoublePunishment.value = false
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
      currentPunishmentTarget.value = null
      pendingRuleResolution.value = null
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterPunishment()
    } catch (error) {
      console.error('确认惩罚时发生错误:', error)
      gameState.gameStatus = 'waiting'
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
      currentPunishmentTarget.value = null
      pendingRuleResolution.value = null
      isDoublePunishment.value = false
      isChainPunishment.value = false
    }
  }

  // 翻倍揭示确认：显示相同惩罚再来一次
  const confirmDoubleReveal = () => {
    showDoublePunishmentReveal.value = false
    isDoublePunishment.value = true
    currentPunishment.value = pendingDoublePunishment.value
    pendingDoublePunishment.value = null
    mercyRequested.value = true // 翻倍惩罚不可求饶
    gameState.gameStatus = 'configuring'
  }

  // 连锁掷骰结果处理
  const handleChainRollResult = (continueChain: boolean) => {
    showChainPunishmentRoll.value = false
    if (continueChain) {
      const newPunishment = GameService.generateRandomPunishment(gameState.punishmentConfig)
      const chainResolution = resolveRule({
        source: 'board_punishment',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        punishmentConfig: gameState.punishmentConfig,
        diceValue: gameState.diceValue ?? undefined,
        boardAction: newPunishment,
      })
      const targetPlayer = gameState.players[chainResolution.targetPlayerIndex]
      pendingRuleResolution.value = chainResolution
      currentPunishmentTarget.value = targetPlayer
      currentPunishmentExecutor.value =
        chainResolution.executorIndex === undefined
          ? null
          : (gameState.players[chainResolution.executorIndex] ?? null)
      currentPunishment.value = toMutablePunishmentAction(chainResolution.action)
      if (chainResolution.countMultiplier) {
        targetPlayer.pendingMercyMultiplier = undefined
      }
      mercyRequested.value = false
      gameState.gameStatus = 'configuring'
    } else {
      isChainPunishment.value = false
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
      currentPunishmentTarget.value = null
      pendingRuleResolution.value = null
      gameState.gameStatus = 'waiting'
      continueAfterPunishment()
    }
  }

  // 跳过惩罚
  const skipPunishment = async () => {
    try {
      // 跳过时同样处理连锁惩罚的后续掷骰
      if (isChainPunishment.value) {
        currentPunishment.value = null
        showChainPunishmentRoll.value = true
        return
      }

      isDoublePunishment.value = false
      isChainPunishment.value = false
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
      currentPunishmentTarget.value = null
      pendingRuleResolution.value = null
      gameState.gameStatus = 'waiting'

      // 继续游戏流程
      await continueAfterPunishment()
    } catch (error) {
      console.error('跳过惩罚时发生错误:', error)
      gameState.gameStatus = 'waiting'
      currentPunishment.value = null
      currentPunishmentExecutor.value = null
      currentPunishmentTarget.value = null
      pendingRuleResolution.value = null
      isDoublePunishment.value = false
      isChainPunishment.value = false
    }
  }

  // 惩罚后的继续流程
  const continueAfterPunishment = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      resetEffectChainCount()

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

      advanceToNextPlayablePlayer()

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
    devLog('点击格子:', cell)
    // 可以在这里添加查看格子详情的功能
  }

  // 生成惩罚组合
  const generatePunishmentCombinations = () => {
    const punishmentCells = gameState.board.filter(cell => cell.type === 'punishment')
    const totalPunishmentCells = punishmentCells.length

    punishmentCombinations.value = GameService.generateBalancedPunishmentCombinationDefinitions(
      gameState.punishmentConfig,
      totalPunishmentCells
    )
    punishmentStep.value = 'confirm'
  }

  // 确认惩罚组合并开始游戏
  const confirmPunishmentCombinations = (combinations: PunishmentCombination[]) => {
    devLog('confirmPunishmentCombinations called, starting game')

    gameState.board = GameService.updateBoardWithConfirmedCombinationDefinitions(
      gameState.board,
      combinations,
      gameState.punishmentConfig
    )

    punishmentStep.value = 'config'
    gameState.gameStatus = 'waiting'
    gameStarted.value = true
    if (turnCount.value === 0) {
      turnCount.value = 1
    }
  }

  // 确认起飞惩罚
  const confirmTakeoffPunishment = async () => {
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    pendingRuleResolution.value = null
    gameState.gameStatus = 'waiting'

    // 继续游戏流程
    await continueAfterPunishment()
  }

  // 处理起飞惩罚显示逻辑
  const handleTakeoffPunishmentDisplay = () => {
    // 所有情况下都等待玩家手动确认，不自动消失
    // 单人游戏和多人游戏都需要玩家点击确认按钮
  }

  const handleBackToPunishmentSettings = () => {
    punishmentStep.value = 'config'
    settingsTab.value = 'trap'
  }

  // 添加validation-failed事件处理
  const handleValidationFailed = (errorMessage: string) => {
    devLog('惩罚配置验证失败:', errorMessage)
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
      const trapResolution = pendingRuleResolution.value
      if (trapResolution?.kind !== 'trap' || !trapResolution.acknowledgementRequired) {
        throw new Error('缺少已解析的机关确认')
      }

      showTrapDisplay.value = false
      currentTrapPunishment.value = null
      currentTrapDescription.value = ''
      pendingRuleResolution.value = null
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
      pendingRuleResolution.value = null
    }
  }

  // 确认反弹效果
  const confirmBounce = async () => {
    try {
      if (pendingRuleResolution.value?.kind !== 'cell_effect') {
        throw new Error('缺少已解析的反弹效果')
      }

      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      const landingPosition = currentPlayer.position
      const bounceStartPosition = bounceFromPosition.value || landingPosition

      showBounceDisplay.value = false
      bounceFromPosition.value = 0
      bounceTargetPosition.value = 0
      bounceFinalPosition.value = 0
      bounceOverflowSteps.value = 0
      pendingRuleResolution.value = null
      gameState.gameStatus = 'waiting'

      // 反弹确认后继续结算反弹落点格子的效果
      await handleLandingCellEffect({
        currentPlayer,
        fromPosition: bounceStartPosition,
        newPosition: landingPosition,
      })
    } catch (error) {
      console.error('确认反弹时发生错误:', error)
      // 确保在发生错误时重置游戏状态
      gameState.gameStatus = 'waiting'
      showBounceDisplay.value = false
      bounceFromPosition.value = 0
      bounceTargetPosition.value = 0
      bounceFinalPosition.value = 0
      bounceOverflowSteps.value = 0
      pendingRuleResolution.value = null
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

    // 如果惩罚确认步骤正在显示，优先显示确认页面引导
    if (punishmentStep.value === 'confirm') {
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
        element: '.step-indicator',
        popover: {
          title: '惩罚组合确认',
          description: '系统已为你生成了惩罚组合，可以点击"配置"返回修改设置',
          position: 'bottom',
        },
      },
      {
        element: '.stats-summary',
        popover: {
          title: '分布统计',
          description: '环形图实时显示工具、部位和姿势的分布情况，删除组合时会自动更新',
          position: 'bottom',
        },
      },
      {
        element: '.combinations-list',
        popover: {
          title: '组合列表',
          description: '点击任意组合查看详情，在详情中可以删除或恢复组合',
          position: 'right',
        },
      },
      {
        element: '.confirm-actions',
        popover: {
          title: '操作按钮',
          description: '可以重新生成组合或确认当前组合开始游戏',
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
    devLog(
      `检查自动引导 - 页面类型: ${pageType}, 自动引导开启: ${autoGuideEnabled.value}, 已显示过: ${hasShownGuide.value.has(pageType)}`
    )

    if (autoGuideEnabled.value && !hasShownGuide.value.has(pageType)) {
      devLog(`准备显示自动引导 - 页面: ${pageType}`)
      // 延迟一下确保页面元素已经渲染
      setTimeout(() => {
        devLog(`执行自动引导 - 页面: ${pageType}`)
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
    devLog(`自动引导开关切换为: ${autoGuideEnabled.value}`)
    // 保存到localStorage
    localStorage.setItem('autoGuideEnabled', autoGuideEnabled.value.toString())
  }

  // 重置引导状态
  const resetGuideStatus = () => {
    hasShownGuide.value.clear()
    localStorage.removeItem('hasShownGuide')
    devLog('引导状态已重置')
  }

  // 配置导出功能
  const openConfigExport = () => {
    showConfigExport.value = true
  }

  const closeConfigExport = () => {
    showConfigExport.value = false
  }

  const handleExportSuccess = (filename: string) => {
    devLog(`配置导出成功: ${filename}`)
    // 可以在这里添加成功提示
  }

  const handleExportError = (error: string) => {
    console.error(`配置导出失败: ${error}`)
    // 可以在这里添加错误提示
  }

  const handleImportSuccess = async (message: string) => {
    devLog(`配置导入成功: ${message}`)

    // 重新加载玩家设置
    const playerSettings = loadPlayerSettings()
    devLog('从localStorage加载的玩家设置:', playerSettings)

    if (playerSettings) {
      devLog('更新游戏状态中的玩家信息')

      // 使用nextTick确保响应式更新
      await nextTick()

      gameState.players = createPlayersFromSettings(playerSettings)

      // 重置游戏状态
      gameState.currentPlayerIndex = 0
      gameState.diceValue = null
      gameState.winner = null

      devLog('玩家设置已更新:', playerSettings)
      devLog('新的游戏玩家列表:', gameState.players)

      // 触发自定义事件通知其他组件
      window.dispatchEvent(
        new CustomEvent('playerSettingsUpdated', {
          detail: playerSettings,
        })
      )
    } else {
      devLog('没有找到玩家设置数据')
    }

    // 重新加载其他配置
    const config = loadConfig()
    let configUpdated = false

    if (config) {
      if (config.punishmentConfig) {
        gameState.punishmentConfig = normalizePunishmentConfig(config.punishmentConfig)
        devLog('惩罚配置已更新')
        configUpdated = true
      }
      if (config.boardConfig) {
        if (config.boardConfig.chainPunishmentCells === undefined) {
          config.boardConfig.chainPunishmentCells = 0
        }
        gameState.boardConfig = config.boardConfig
        devLog('棋盘配置已更新')
        configUpdated = true
      }
      if (config.trapConfig) {
        trapConfig.value = config.trapConfig
        devLog('机关配置已更新')
        configUpdated = true
      }
    }

    const boardRegenerated = configUpdated || Boolean(playerSettings)

    // 如果配置有更新，重新生成棋盘
    if (boardRegenerated) {
      devLog('重新生成棋盘...')

      // 使用nextTick确保所有响应式更新完成
      await nextTick()

      gameState.board = GameService.createBoard(
        gameState.punishmentConfig,
        gameState.boardConfig,
        trapConfig.value
      )
      devLog('棋盘已重新生成')

      // 重置游戏状态
      if (gameStarted.value) {
        gameState.currentPlayerIndex = 0
        gameState.diceValue = null
        gameState.winner = null
        gameStarted.value = false
        gameFinished.value = false
        turnCount.value = 0
        devLog('游戏状态已重置')
      }
    }

    // 再次使用nextTick确保所有DOM更新完成
    await nextTick()

    showImportSuccess(message, boardRegenerated)

    devLog('导入处理完成，所有更新已应用')
  }

  const handleImportError = (error: string) => {
    console.error(`配置导入失败: ${error}`)
    showImportError(error)
  }

  // 监听游戏状态变化，自动显示引导
  watch(
    () => gameState.gameStatus,
    (newStatus, oldStatus) => {
      devLog(`游戏状态变化: ${oldStatus} -> ${newStatus}`)
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

  // 监听惩罚确认步骤，自动显示引导
  watch(
    () => punishmentStep.value,
    newValue => {
      devLog(`惩罚步骤变化: ${newValue}`)
      if (newValue === 'confirm') {
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
  <div
    class="app"
    :class="{
      'app--settings':
        gameState.gameStatus === 'board_settings' || gameState.gameStatus === 'settings',
    }"
  >
    <!-- 开始页面 -->
    <IntroPage v-if="gameState.gameStatus === 'intro'" @start="handleIntroStart" />

    <!-- 统一设置页面（Stepper 引导布局） -->
    <div
      v-else-if="gameState.gameStatus === 'board_settings' || gameState.gameStatus === 'settings'"
      class="settings-page"
    >
      <div class="page-container">
        <div class="settings-header">
          <h2>
            <Settings :size="24" />
            游戏设置
          </h2>
          <p>配置棋盘、惩罚和陷阱</p>
        </div>

        <!-- Stepper 步骤指示器 -->
        <div v-if="punishmentStep === 'config'" class="settings-stepper">
          <button
            class="stepper-item"
            :class="{
              'stepper-item--active': settingsTab === 'board',
              'stepper-item--completed': stepCompleted.board && settingsTab !== 'board',
              'stepper-item--invalid': !stepCompleted.board && settingsTab !== 'board',
            }"
            @click="settingsTab = 'board'"
          >
            <span class="stepper-number">
              <Check v-if="stepCompleted.board && settingsTab !== 'board'" :size="14" />
              <AlertCircle v-else-if="!stepCompleted.board && settingsTab !== 'board'" :size="14" />
              <span v-else>1</span>
            </span>
            <span class="stepper-label">棋盘</span>
          </button>

          <span
            class="stepper-connector"
            :class="{ 'stepper-connector--done': stepCompleted.board }"
          ></span>

          <button
            class="stepper-item"
            :class="{
              'stepper-item--active': settingsTab === 'punishment',
              'stepper-item--completed': stepCompleted.punishment && settingsTab !== 'punishment',
              'stepper-item--invalid': !stepCompleted.punishment && settingsTab !== 'punishment',
            }"
            @click="settingsTab = 'punishment'"
          >
            <span class="stepper-number">
              <Check v-if="stepCompleted.punishment && settingsTab !== 'punishment'" :size="14" />
              <AlertCircle
                v-else-if="!stepCompleted.punishment && settingsTab !== 'punishment'"
                :size="14"
              />
              <span v-else>2</span>
            </span>
            <span class="stepper-label">惩罚</span>
          </button>

          <span
            class="stepper-connector"
            :class="{ 'stepper-connector--done': stepCompleted.punishment }"
          ></span>

          <button
            class="stepper-item"
            :class="{
              'stepper-item--active': settingsTab === 'trap',
              'stepper-item--completed': stepCompleted.trap && settingsTab !== 'trap',
              'stepper-item--invalid': !stepCompleted.trap && settingsTab !== 'trap',
            }"
            @click="settingsTab = 'trap'"
          >
            <span class="stepper-number">
              <Check v-if="stepCompleted.trap && settingsTab !== 'trap'" :size="14" />
              <AlertCircle v-else-if="!stepCompleted.trap && settingsTab !== 'trap'" :size="14" />
              <span v-else>3</span>
            </span>
            <span class="stepper-label">陷阱</span>
          </button>
        </div>

        <!-- 确认页面（独立于 Tab 内容） -->
        <PunishmentConfirmation
          v-if="punishmentStep === 'confirm'"
          :combinations="punishmentCombinations"
          @confirm="confirmPunishmentCombinations"
          @regenerate="generatePunishmentCombinations"
          @back-to-settings="handleBackToPunishmentSettings"
        />

        <!-- Tab 内容（仅在配置阶段显示） -->
        <div v-else class="settings-tab-content">
          <BoardConfigPanel
            v-show="settingsTab === 'board'"
            :config="gameState.boardConfig"
            @update="updateBoardConfig"
          />

          <PunishmentConfigPanel
            v-show="settingsTab === 'punishment'"
            :config="gameState.punishmentConfig"
            @update="updatePunishmentConfig"
            @validation-failed="handleValidationFailed"
          />

          <TrapConfigPanel
            v-show="settingsTab === 'trap'"
            :traps="trapConfig"
            @update="updateTrapConfig"
          />
        </div>

        <!-- 上下文操作按钮 -->
        <div v-if="punishmentStep === 'config'" class="page-actions">
          <button v-if="settingsTab !== 'board'" class="btn btn-secondary" @click="prevStep">
            <ArrowLeft :size="16" />
            <span class="btn-text">上一步</span>
          </button>
          <button v-else class="btn btn-secondary" @click="showIntro">
            <ArrowLeft :size="16" />
            <span class="btn-text">返回首页</span>
          </button>

          <button
            v-if="settingsTab === 'trap'"
            class="btn btn-primary"
            :disabled="!allConfigValid"
            @click="generatePunishmentCombinations"
          >
            <Target :size="16" />
            <span class="btn-text">生成惩罚组合</span>
          </button>
          <button v-else class="btn btn-primary" @click="nextStep">
            <span class="btn-text">下一步</span>
            <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏页面 -->
    <div v-else class="game-page">
      <header class="game-header">
        <div class="header-content">
          <h1>
            <Dices :size="20" />
            惩罚飞行棋
          </h1>

          <div v-if="gameStarted" class="header-status">
            <Badge :value="turnCount" class="turn-badge" />
            <Tag
              :value="gameStatusText"
              :severity="getStatusSeverity(gameState.gameStatus)"
              class="status-tag"
            />
          </div>

          <PlayerPanel
            v-if="gameState.players.length > 0"
            :players="gameState.players"
            :current-player-index="gameState.currentPlayerIndex"
            :collapsed="isMobileView && playerPanelCollapsed"
            class="header-players"
            @toggle="togglePlayerPanel"
          />

          <!-- Mobile player panel dropdown -->
          <Transition name="panel-dropdown">
            <div
              v-if="isMobileView && !playerPanelCollapsed && gameState.players.length > 0"
              class="mobile-panel-dropdown"
            >
              <div class="mobile-panel-backdrop" @click="playerPanelCollapsed = true"></div>
              <div class="mobile-panel-content">
                <PlayerPanel
                  :players="gameState.players"
                  :current-player-index="gameState.currentPlayerIndex"
                  :collapsed="false"
                  @toggle="togglePlayerPanel"
                />
              </div>
            </div>
          </Transition>

          <div class="header-actions">
            <PButton
              v-if="!gameStarted"
              label="开始游戏"
              icon="pi pi-play"
              class="p-button-success p-button-sm"
              @click="handleGameControlsStart"
            />
            <PButton
              v-if="gameFinished"
              label="再来一局"
              icon="pi pi-refresh"
              class="p-button-info p-button-sm"
              @click="resetGame"
            />
            <button
              class="audio-toggle-btn"
              :title="audioEnabled ? '静音' : '开启声音'"
              @click="toggleAudio"
            >
              <Volume2 v-if="audioEnabled" :size="18" />
              <VolumeX v-else :size="18" />
            </button>
          </div>
        </div>
      </header>

      <main class="game-main">
        <div class="board-section">
          <GameBoard
            :board="gameState.board"
            :players="gameState.players"
            :current-player-index="gameState.currentPlayerIndex"
            :last-effect="lastEffect"
            :can-roll="canRollDice"
            :dice-value="gameState.diceValue"
            :turn-count="turnCount"
            @cell-click="handleCellClick"
            @roll="handleDiceRoll"
          />
        </div>
      </main>

      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
        :executor-player="currentPunishmentExecutor"
        :target-player="currentPunishmentTarget"
        :count-selection="currentPunishmentCountSelection"
        :count-multiplier="currentPunishmentCountMultiplier"
        :can-request-mercy="canRequestBoardMercy"
        @confirm="confirmPunishment"
        @skip="skipPunishment"
        @request-mercy="handleMercyRequest('board')"
      />

      <!-- 求饶决策弹窗 -->
      <MercyDecision
        :visible="showMercyDecision"
        :punishment="mercySource === 'board' ? currentPunishment : currentTakeoffPunishment"
        :executor-player="mercyExecutorPlayer"
        :target-player="mercyTargetPlayer"
        :halved-strikes="mercyHalvedStrikes"
        @mercy-result="handleMercyResult"
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
      :can-request-mercy="canRequestTakeoffMercy"
      @confirm="confirmTakeoffPunishment"
      @request-mercy="handleMercyRequest('takeoff')"
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

    <!-- 翻倍惩罚揭示弹窗 -->
    <DoublePunishmentReveal :visible="showDoublePunishmentReveal" @confirm="confirmDoubleReveal" />

    <!-- 连锁惩罚掷骰弹窗 -->
    <ChainPunishmentRoll :visible="showChainPunishmentRoll" @result="handleChainRollResult" />

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

    <button
      v-if="canPauseSession && !sessionPaused"
      class="session-pause-trigger"
      :class="{ 'session-pause-trigger--blocked': hasActiveForcedOverlay }"
      aria-label="暂停本局"
      @click="pauseSession"
    >
      <Pause :size="18" aria-hidden="true" />
      <span>暂停本局</span>
    </button>

    <SessionPauseOverlay
      :visible="sessionPaused"
      @resume="resumeSession"
      @end-session="endPausedSession"
    />

    <!-- 用户引导按钮和设置 -->
    <div class="guide-controls">
      <!-- 配置导出按钮 -->
      <button class="export-btn" title="导出配置" @click="openConfigExport">
        <Upload :size="20" />
      </button>

      <!-- 主要引导按钮 -->
      <button class="guide-btn" title="查看当前页面引导" @click="startGuide">
        <HelpCircle :size="20" />
      </button>

      <!-- 引导设置菜单 -->
      <div class="guide-settings">
        <button
          class="settings-toggle"
          title="引导设置"
          @click="showGuideSettings = !showGuideSettings"
        >
          <Settings :size="18" />
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
              <RotateCcw :size="16" />
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

    <PDialog
      v-model:visible="importFeedbackVisible"
      modal
      :header="importFeedbackTitle"
      :style="{ width: 'min(92vw, 420px)' }"
      @hide="closeImportFeedback"
    >
      <div class="import-feedback" :class="`import-feedback--${importFeedbackType}`">
        <span class="import-feedback-icon">
          {{ importFeedbackType === 'success' ? '\u2713' : '\u2717' }}
        </span>
        <p class="import-feedback-message">{{ importFeedbackMessage }}</p>
      </div>
    </PDialog>
  </div>
</template>

<style scoped>
  .app {
    min-height: 100vh;
    background-color: var(--bg-primary);
    background-image: radial-gradient(ellipse at top, rgba(102, 126, 234, 0.15), transparent 60%);
  }

  .import-feedback {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .import-feedback-icon {
    font-size: 1.2rem;
    line-height: 1.5rem;
  }

  .import-feedback-message {
    margin: 0;
    white-space: pre-line;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .import-feedback--error .import-feedback-message {
    color: var(--color-danger);
  }

  .page-container {
    max-width: min(800px, 90vw);
    width: 100%;
  }

  .page-actions {
    display: flex;
    justify-content: space-between;
    margin-top: clamp(1rem, 4vw, 2rem);
    gap: clamp(0.5rem, 2vw, 1rem);
    flex-wrap: wrap;
  }

  .combinations-info {
    text-align: center;
    color: var(--text-primary);
    margin: clamp(0.5rem, 2vw, 1rem) 0;
    padding: clamp(0.5rem, 2vw, 1rem);
    background: var(--bg-glass);
    border-radius: var(--radius-sm);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    box-shadow: var(--glass-shadow);
    font-size: clamp(0.8rem, 2.5vw, 1rem);
  }

  /* 设置页面样式 */
  .settings-page {
    min-height: 100vh;
    padding: clamp(0.5rem, 3vw, 1rem);
    width: 100%;
    background-color: var(--bg-primary);
  }

  /* Stepper 步骤指示器 */
  .settings-stepper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: clamp(1rem, 3vw, 1.5rem);
    padding: clamp(0.5rem, 2vw, 0.75rem) clamp(0.5rem, 2vw, 1rem);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .stepper-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .stepper-item:hover {
    color: var(--text-primary);
    background: var(--bg-glass);
  }

  .stepper-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: var(--bg-glass);
    border: 1px solid var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }

  .stepper-label {
    white-space: nowrap;
  }

  .stepper-item--active {
    color: var(--text-primary);
    background: var(--bg-glass);
    border-color: rgba(102, 126, 234, 0.4);
    box-shadow: var(--glow-sm) rgba(102, 126, 234, 0.2);
  }

  .stepper-item--active .stepper-number {
    background: rgba(102, 126, 234, 0.3);
    border-color: rgba(102, 126, 234, 0.8);
    color: #fff;
  }

  .stepper-item--completed .stepper-number {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.6);
    color: rgba(34, 197, 94, 1);
  }

  .stepper-item--invalid .stepper-number {
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.5);
    color: rgba(245, 158, 11, 1);
  }

  .stepper-connector {
    flex: 0 0 clamp(1rem, 4vw, 2.5rem);
    height: 2px;
    background: var(--text-secondary);
    opacity: 0.3;
    border-radius: 1px;
    transition: all var(--transition-fast);
  }

  .stepper-connector--done {
    background: rgba(34, 197, 94, 0.6);
    opacity: 1;
  }

  @media (max-width: 480px) {
    .stepper-label {
      display: none;
    }

    .stepper-item {
      padding: 0.4rem 0.6rem;
    }

    .stepper-connector {
      flex: 0 0 0.75rem;
    }
  }

  .settings-tab-content {
    min-height: 300px;
  }

  .settings-header {
    text-align: center;
    margin-bottom: clamp(1rem, 4vw, 1.5rem);
  }

  .settings-header h2 {
    margin: 0 0 clamp(0.25rem, 1vw, 0.5rem) 0;
    font-size: clamp(1.5rem, 6vw, 2rem);
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .settings-header p {
    margin: 0;
    font-size: clamp(0.8rem, 2.5vw, 1rem);
    color: var(--text-secondary);
  }

  /* 游戏页面样式 */
  .game-page {
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
  }

  .game-header {
    padding: 0.5rem 1rem;
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border-bottom: var(--glass-border);
    box-shadow: var(--glass-shadow);
    flex-shrink: 0;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .game-header h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .header-players {
    flex: 1;
    min-width: 0;
    justify-content: center;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .audio-toggle-btn {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    padding: 0.3rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    min-width: 30px;
  }

  .audio-toggle-btn:hover {
    color: var(--text-primary);
    background: var(--bg-glass-hover);
  }

  .game-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 0;
  }

  .board-section {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 0;
    padding: 0.5rem;
    position: relative;
  }

  /* 状态样式 */
  .mercy-multiplier-badge {
    font-size: 0.7rem;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.45);
  }

  .turn-badge {
    background: var(--color-accent);
  }

  .status-tag {
    font-size: 0.8rem;
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

  /* 移动端适配 */
  @media (max-width: 768px) {
    .game-header {
      padding: 0.4rem 0.5rem;
    }

    .header-content {
      gap: 0.4rem;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .header-content::-webkit-scrollbar {
      display: none;
    }

    .game-header h1 {
      font-size: 0.95rem;
    }

    .header-players {
      flex: 0 0 auto;
    }

    .board-section {
      padding: 0.25rem;
    }
  }

  /* Mobile player panel dropdown */
  .mobile-panel-dropdown {
    position: fixed;
    inset: 0;
    z-index: 1500;
  }

  .mobile-panel-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
  }

  .mobile-panel-content {
    position: absolute;
    top: 50px;
    left: 0.5rem;
    right: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-md, 12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .panel-dropdown-enter-active {
    transition: opacity 0.2s ease-out;
  }
  .panel-dropdown-enter-active .mobile-panel-content {
    transition: transform 0.2s ease-out;
  }
  .panel-dropdown-leave-active {
    transition: opacity 0.15s ease-in;
  }
  .panel-dropdown-leave-active .mobile-panel-content {
    transition: transform 0.15s ease-in;
  }
  .panel-dropdown-enter-from,
  .panel-dropdown-leave-to {
    opacity: 0;
  }
  .panel-dropdown-enter-from .mobile-panel-content,
  .panel-dropdown-leave-to .mobile-panel-content {
    transform: translateY(-10px);
  }

  @media (max-width: 480px) {
    .game-header h1 {
      font-size: 0.85rem;
    }

    .header-actions .p-button {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  }

  /* 横屏模式优化：header 变为左侧竖栏 */
  @media (orientation: landscape) and (max-height: 600px) {
    .game-page {
      flex-direction: row;
    }

    .game-header {
      flex-shrink: 0;
      width: 60px;
      padding: 0.4rem;
      border-bottom: none;
      border-right: var(--glass-border);
      overflow-y: auto;
      overflow-x: hidden;
    }

    .header-content {
      flex-direction: column;
      gap: 0.5rem;
      max-width: none;
      align-items: center;
    }

    .game-header h1 {
      font-size: 0;
      gap: 0;
    }

    .game-header h1 .pi-map {
      font-size: 1.2rem;
    }

    .header-status {
      flex-direction: column;
      gap: 0.2rem;
    }

    .header-actions {
      flex-direction: column;
      gap: 0.3rem;
    }

    .header-actions .p-button {
      font-size: 0;
      padding: 0.4rem;
      min-width: 36px;
    }

    .header-actions .p-button .p-button-icon {
      margin: 0;
    }

    .header-players {
      flex: 0 0 auto;
    }

    .game-main {
      min-height: 0;
      height: 100vh;
    }
  }

  /* 减少动画偏好 */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition-duration: 0.1s !important;
    }
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
    background: var(--color-punishment);
    color: #fff;
    border: 1px solid rgba(255, 71, 87, 0.4);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 1.8rem;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(255, 71, 87, 0.35);
    transition: transform var(--transition-fast);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .guide-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 71, 87, 0.45);
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
    background: rgba(59, 130, 246, 0.75);
    color: white;
    border: 1px solid rgba(59, 130, 246, 0.35);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
    transition: all var(--transition-fast);
    backdrop-filter: blur(var(--glass-blur));
    font-size: 1.2rem;
    font-weight: 600;
  }

  .export-btn:hover {
    transform: translateY(-2px);
    background: rgba(59, 130, 246, 0.9);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
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
    background: var(--bg-glass);
    color: var(--text-primary);
    border: var(--glass-border);
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: var(--glass-shadow);
    transition: all var(--transition-fast);
    backdrop-filter: blur(var(--glass-blur));
  }

  .settings-toggle:hover {
    transform: translateY(-2px);
    background: var(--bg-glass-hover);
    border-color: rgba(255, 71, 87, 0.4);
  }

  .settings-menu {
    position: absolute;
    bottom: 60px;
    left: 0;
    background: var(--bg-glass);
    border-radius: var(--radius-md);
    padding: 1rem;
    box-shadow: var(--glass-shadow-lg);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    min-width: 200px;
    animation: fadeInUp var(--transition-normal);
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
    color: var(--text-primary);
    cursor: pointer;
  }

  .setting-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--color-punishment);
  }

  .checkbox-text {
    font-weight: 500;
    color: var(--text-primary);
  }

  .reset-btn {
    background: var(--color-punishment);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }

  .reset-btn:hover {
    background: #e8414f;
    transform: translateY(-1px);
  }

  .reset-icon {
    font-size: 1rem;
  }

  .reset-text {
    font-weight: 500;
    color: var(--text-primary);
  }

  .settings-footer {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.3;
  }

  .session-pause-trigger {
    position: fixed;
    z-index: 19000;
    right: 1rem;
    bottom: 6rem;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 44px;
    padding: 0.7rem 1rem;
    color: white;
    background: rgba(30, 41, 59, 0.96);
    border: 1px solid rgba(147, 197, 253, 0.55);
    border-radius: 999px;
    box-shadow: var(--glass-shadow-lg);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .session-pause-trigger:hover {
    background: rgba(37, 99, 235, 0.96);
  }

  .session-pause-trigger:focus-visible {
    outline: 3px solid #93c5fd;
    outline-offset: 3px;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .app--settings .guide-controls {
      display: none;
    }

    .session-pause-trigger {
      right: 0.75rem;
      bottom: 4.75rem;
    }

    .session-pause-trigger--blocked {
      display: none;
    }

    .session-pause-trigger span {
      display: none;
    }

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
