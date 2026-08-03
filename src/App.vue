<script setup lang="ts">
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
  import { GameService } from './services/gameService'
  import { gameTelemetry } from './services/gameTelemetry'
  import {
    applyTurnConsequence,
    consumePendingSkippedTurn,
    createCompatiblePunishmentAction,
    finalizePunishmentCount,
    pickPunishmentVariant,
    resolveRule,
    scaleResolvedPunishmentCount,
  } from './services/ruleResolution'
  import {
    createDeferredPunishment,
    createEncorePunishmentReturn,
    createMutualPunishmentReturn,
    resolveConditionalPunishment,
  } from './services/punishmentVariants'
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
    ResolvedPunishmentResult,
    ResolvedRuleResult,
    PartyScenePreset,
    PunishmentConstraints,
    VictoryConfig,
  } from './types/game'
  import IntroPage from './components/IntroPage.vue'
  import PartyReactionOverlay from './components/PartyReactionOverlay.vue'
  import PartyDiceDecision from './components/PartyDiceDecision.vue'
  import PartyPunishmentChoice from './components/PartyPunishmentChoice.vue'
  import PartyPunishmentIntervention from './components/PartyPunishmentIntervention.vue'
  import PartyEventCardOverlay from './components/PartyEventCardOverlay.vue'
  import PartyMiniGame from './components/PartyMiniGame.vue'
  import PartyTieBreak from './components/PartyTieBreak.vue'
  import GameBoard from './components/GameBoard.vue'
  import CellInspector from './components/CellInspector.vue'
  import GameRoster from './components/GameRoster.vue'
  import GameTurnDock from './components/GameTurnDock.vue'
  import BoardConfigPanel from './components/BoardConfig.vue'
  import PunishmentConfigPanel from './components/PunishmentConfig.vue'
  import TrapConfigPanel from './components/TrapConfig.vue'
  import PunishmentDisplay from './components/PunishmentDisplay.vue'
  import PunishmentConfirmation from './components/PunishmentConfirmation.vue'
  import EffectDisplay from './components/EffectDisplay.vue'
  import TakeoffPunishmentDisplay from './components/TakeoffPunishmentDisplay.vue'
  import TrapDisplay from './components/TrapDisplay.vue'
  import TrapChoiceDisplay from './components/TrapChoiceDisplay.vue'
  import QADisplay from './components/QADisplay.vue'
  import DareDisplay from './components/DareDisplay.vue'
  import VictoryScreen from './components/VictoryScreen.vue'
  import TakeoffReliefDisplay from './components/TakeoffReliefDisplay.vue'
  import BounceDisplay from './components/BounceDisplay.vue'
  import DoublePunishmentReveal from './components/DoublePunishmentReveal.vue'
  import ChainPunishmentRoll from './components/ChainPunishmentRoll.vue'
  import MercyDecision from './components/MercyDecision.vue'
  import SessionPauseOverlay from './components/SessionPauseOverlay.vue'
  import ConfigExport from './components/ConfigExport.vue'
  import {
    saveConfig,
    loadConfig,
    loadPlayerSettings,
    loadGameMode,
    loadVictoryConfig,
    loadPartyEventDeck,
    loadLocalProgress,
    saveLocalProgress,
    saveGameMode,
  } from './utils/cache'
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
  import { usePartyMode } from './composables/usePartyMode'
  import { useMultiDeviceHost } from './composables/useMultiDeviceHost'
  import { type GameMode } from './config/modes'
  import { createModeConfig, createStandardConfigSnapshot } from '@flying-chess/game-core/config'
  import {
    createPartyPunishmentChoices,
    getActConstraints,
    getPartyTimeLimitLeaders,
    isPartyPunishmentChoiceEligible,
    type PartyAct,
    type PartyPrediction,
    type PartyReactionDecision,
  } from './services/partyMode'
  import {
    applyPartyPunishmentIntervention,
    getPartyPunishmentInterventionOptions,
    projectSharedScreenInterventionOptions,
    type PartyPunishmentIntervention as PartyPunishmentInterventionDecision,
    type PartyPunishmentInterventionOption,
  } from './services/partyPunishmentInterventions'
  import { driver as createDriver } from 'driver.js'
  import {
    activatePartyEvent,
    applyPartyEventPunishmentRules,
    createPartyEventState,
    getBoundPartnerPlayerIndex,
    processPartyEventSignal,
    type PartyEventCard,
    type PartyEventSignal,
    type PartyEventState,
    type PartyMiniGameKind,
  } from './services/partyEvents'
  import {
    consumePartyMiniGameModifier,
    type PartyMiniGameOutcome,
  } from './services/partyMiniGames'
  import {
    getUnlockedPartyContent,
    recordLocalProgress,
    type LocalProgressEvent,
  } from './services/localProgress'
  import { applyPartyBoardLayout, type PartyStudioConfig } from './services/partyStudio'

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
  const selectedMode = ref<GameMode>(loadGameMode())
  const activeMode = ref<GameMode | null>(null)
  const victoryConfig = ref<VictoryConfig>(loadVictoryConfig())
  const partyMode = usePartyMode()
  const isPartyGame = computed(() => activeMode.value === 'party' && partyMode.isActive.value)
  const partySession = computed(() => partyMode.session.value)
  const partyReaction = computed(() => partySession.value?.reaction ?? null)
  const partyHighlight = computed(() => partyMode.highlight.value)
  const partyActLabel = computed(() => {
    switch (partySession.value?.act) {
      case 'heating':
        return '升温'
      case 'finale':
        return '终局'
      default:
        return '暖场'
    }
  })
  const currentPartyTokens = computed(
    () => partySession.value?.tokensRemaining[gameState.currentPlayerIndex] ?? 0
  )
  const canCurrentPlayerReroll = computed(
    () =>
      currentPartyTokens.value > 0 &&
      partySession.value?.interventionUsedThisTurn === undefined &&
      !partySession.value?.diceChangedThisTurn
  )
  const partyDiceDecisionVisible = ref(false)
  const partyPunishmentChoices = ref<readonly PunishmentAction[]>([])
  const partyPunishmentInterventionResolution = ref<ResolvedPunishmentResult | null>(null)
  const partyPunishmentInterventionOptions = ref<readonly PartyPunishmentInterventionOption[]>([])
  const deferredPartyPunishments = ref<ResolvedPunishmentResult[]>([])
  const displayedPunishmentResumesTurn = ref(false)
  const boundPartyPunishments = ref<ResolvedPunishmentResult[]>([])
  const displayedBoundPunishment = ref(false)
  const partyEventState = ref<PartyEventState>(createPartyEventState(loadPartyEventDeck()))
  const partyEventQueue = ref<PartyEventCard[]>([])
  const currentPartyEvent = ref<PartyEventCard | null>(null)
  const partyTurnHadPunishment = ref(false)
  const currentPartyMiniGameKind = ref<PartyMiniGameKind | null>(null)
  const currentPartyMiniGameSource = ref<'event' | 'trap' | null>(null)
  const localProgress = ref(loadLocalProgress())
  const activePartyStudioConfig = ref<PartyStudioConfig | null>(null)
  const partyTieCandidates = ref<readonly number[]>([])
  const classicConfigSnapshot = ref<{
    boardConfig: BoardConfig
    punishmentConfig: PunishmentConfig
    trapConfig: TrapAction[]
  } | null>(null)
  const partyInteractionBlocking = computed(
    () =>
      partyDiceDecisionVisible.value ||
      partyPunishmentChoices.value.length > 0 ||
      partyPunishmentInterventionResolution.value !== null ||
      currentPartyEvent.value !== null ||
      currentPartyMiniGameKind.value !== null ||
      partyTieCandidates.value.length > 0 ||
      partyReaction.value?.status === 'awaiting_prediction' ||
      partyReaction.value?.status === 'awaiting_decision'
  )
  const partyStudioThemeStyle = computed(() => {
    const studio = activePartyStudioConfig.value
    if (!isPartyGame.value || !studio?.enabled) return undefined
    const backgrounds = {
      aurora: 'radial-gradient(circle at 15% 5%, #4c1d95 0%, #0f172a 48%, #020617 100%)',
      ember: 'radial-gradient(circle at 15% 5%, #7f1d1d 0%, #1c1917 48%, #09090b 100%)',
      midnight: 'radial-gradient(circle at 15% 5%, #0c4a6e 0%, #0f172a 48%, #020617 100%)',
    }
    return {
      '--party-studio-accent': studio.theme.accentColor,
      '--party-studio-background': backgrounds[studio.theme.preset],
    }
  })

  const windowWidth = ref(window.innerWidth)

  const isMobileView = computed(() => windowWidth.value <= 768)
  const gameBoardRef = ref<InstanceType<typeof GameBoard> | null>(null)
  const selectedCellPosition = ref<number | null>(1)
  const cellInspectorOpen = ref(false)
  const selectedBoardCell = computed(
    () =>
      gameState.board.find(cell => cell.position === selectedCellPosition.value) ??
      gameState.board[0] ??
      null
  )

  const onWindowResize = () => {
    windowWidth.value = window.innerWidth
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

  watch(gameStarted, (started, wasStarted) => {
    if (started && !wasStarted) {
      gameTelemetry.startGame(gameState.players.length)
    }
  })

  watch(gameFinished, (finished, wasFinished) => {
    if (finished && !wasFinished) {
      gameTelemetry.finishGame('completed', turnCount.value)
    }
  })

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
  const currentTakeoffDiceValue = ref(1)
  const currentTakeoffExecutorIndex = ref(0)
  const currentTakeoffTarget = ref<Player | null>(null)
  const currentTakeoffTriggeringPlayer = ref<Player | null>(null)

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
      if (activeMode.value === 'party') return
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
  const showTrapChoiceDisplay = ref(false)
  const currentTrapPunishment = ref<PunishmentAction | null>(null)
  const currentTrapDescription = ref<string>('')
  const currentTrapChoiceA = ref('')
  const currentTrapChoiceB = ref('')
  const currentTrapVariant = ref<string | undefined>()
  const currentTrapRouletteTarget = ref<Player | null>(null)

  // 升温局问答 / 指令格弹窗
  const showQADisplay = ref(false)
  const currentQAQuestion = ref('')
  const showDareDisplay = ref(false)
  const currentDareInstruction = ref('')
  const selectedPartyScene = ref<PartyScenePreset | 'default'>('default')

  const getCurrentPartyActConstraints = (act: PartyAct): PunishmentConstraints => {
    const scene =
      selectedPartyScene.value === 'default'
        ? undefined
        : GAME_CONFIG.PARTY_SCENE_PRESETS[selectedPartyScene.value]
    return {
      ...getActConstraints(act),
      ...(scene?.actConstraintsOverride?.[act] ?? {}),
    }
  }

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
  const currentPunishmentVariant = computed(() => {
    const resolution = pendingRuleResolution.value
    return resolution?.kind === 'punishment' ? resolution.variant : undefined
  })
  const currentPunishmentVariantPhase = computed(() => {
    const resolution = pendingRuleResolution.value
    return resolution?.kind === 'punishment' ? resolution.variantPhase : undefined
  })
  const canRequestBoardMercy = computed(
    () =>
      !isDoublePunishment.value &&
      !mercyRequested.value &&
      currentPunishmentCountSelection.value === null &&
      currentPunishmentVariant.value === undefined
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

  const recordProgress = (event: LocalProgressEvent) => {
    localProgress.value = recordLocalProgress(localProgress.value, event)
    saveLocalProgress(localProgress.value)
  }

  const recordCompletedPunishment = (resolution: ResolvedPunishmentResult) => {
    if (resolution.count.kind !== 'fixed') return
    recordProgress({
      kind: 'punishment_completed',
      playerName: gameState.players[resolution.targetPlayerIndex]?.name ?? '未命名玩家',
      count: resolution.count.value,
      variant: resolution.variant,
    })
  }

  const presentResolvedPunishment = (
    punishmentResolution: ResolvedPunishmentResult,
    triggeringPlayer: Player,
    diceValue?: number
  ) => {
    const targetPlayer = gameState.players[punishmentResolution.targetPlayerIndex]
    const executorPlayer =
      punishmentResolution.executorIndex === undefined
        ? null
        : (gameState.players[punishmentResolution.executorIndex] ?? null)
    const displayAction = toMutablePunishmentAction(punishmentResolution.action)
    pendingRuleResolution.value = punishmentResolution

    if (!triggeringPlayer.hasTakenOff) {
      currentTakeoffPunishment.value = displayAction
      currentTakeoffDiceValue.value = diceValue ?? gameState.diceValue ?? 1
      currentTakeoffExecutorIndex.value = punishmentResolution.executorIndex ?? -1
      currentTakeoffTarget.value = targetPlayer
      currentTakeoffTriggeringPlayer.value = triggeringPlayer
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
  }

  const recordPartyEventSignal = (signal: PartyEventSignal) => {
    if (!isPartyGame.value) return
    const result = processPartyEventSignal(partyEventState.value, signal, cards =>
      cards.length === 1 ? cards[0] : SecureRandom.choice([...cards])
    )
    partyEventState.value = result.state
    if (result.drawnCard) partyEventQueue.value.push(result.drawnCard)
  }

  const queueBoundPunishmentIfNeeded = (resolution: ResolvedPunishmentResult) => {
    if (!isPartyGame.value || resolution.variant === 'deferred') return
    const partnerIndex = getBoundPartnerPlayerIndex(
      partyEventState.value,
      resolution.targetPlayerIndex
    )
    if (partnerIndex === undefined) return
    boundPartyPunishments.value.push(
      Object.freeze({
        ...resolution,
        targetPlayerIndex: partnerIndex,
        executorIndex: resolution.targetPlayerIndex,
        variant: undefined,
        variantPhase: undefined,
      })
    )
  }

  const presentNextBoundPunishment = (): boolean => {
    const resolution = boundPartyPunishments.value.shift()
    if (!resolution) return false
    displayedBoundPunishment.value = true
    lastEffect.value = `${gameState.players[resolution.targetPlayerIndex]?.name ?? '绑定玩家'} 共同承担本次惩罚`
    presentResolvedPunishment(
      resolution,
      gameState.players[resolution.actorIndex],
      gameState.diceValue ?? undefined
    )
    return true
  }

  const offerPartyPunishmentInterventionOrPresent = (
    punishmentResolution: ResolvedPunishmentResult,
    triggeringPlayer: Player,
    diceValue?: number
  ) => {
    let resolvedPunishment = punishmentResolution
    if (isPartyGame.value) {
      const targetIndex = resolvedPunishment.targetPlayerIndex
      const targetPlayer = gameState.players[targetIndex]
      const miniGameModified = consumePartyMiniGameModifier(resolvedPunishment, targetPlayer)
      gameState.players[targetIndex] = miniGameModified.player
      resolvedPunishment = applyPartyEventPunishmentRules(
        partyEventState.value,
        miniGameModified.resolution
      )
      partyTurnHadPunishment.value = true
      recordPartyEventSignal({ kind: 'punishment_resolved' })
    }
    const partySessionSnapshot = partySession.value
    if (isPartyGame.value && partySessionSnapshot) {
      const interventionOptions = getPartyPunishmentInterventionOptions(
        resolvedPunishment,
        gameState.players,
        partySessionSnapshot.tokensRemaining,
        partySessionSnapshot.interventionUsedThisTurn !== undefined
      )
      if (interventionOptions.length > 0) {
        pendingRuleResolution.value = resolvedPunishment
        partyPunishmentInterventionResolution.value = resolvedPunishment
        partyPunishmentInterventionOptions.value = interventionOptions
        gameState.gameStatus = 'configuring'
        const targetPlayer = gameState.players[resolvedPunishment.targetPlayerIndex]
        const countLabel =
          resolvedPunishment.count.kind === 'fixed'
            ? `${resolvedPunishment.count.value} 下`
            : '次数待选'
        interventionOptions.forEach(option => {
          if (!multiDevice.isRemotePlayer(option.playerIndex)) return
          multiDevice.requestAction(option.playerIndex, {
            type: 'punishment_intervention',
            targetName: targetPlayer?.name ?? '当前玩家',
            countLabel,
            actions: option.actions,
            transferTargets: option.transferTargetPlayerIndices.map(targetPlayerIndex => ({
              playerIndex: targetPlayerIndex,
              playerName: gameState.players[targetPlayerIndex]?.name ?? '玩家',
            })),
          })
        })
        return
      }
    }

    queueBoundPunishmentIfNeeded(resolvedPunishment)
    presentResolvedPunishment(resolvedPunishment, triggeringPlayer, diceValue)
  }

  const handleMercyRequest = (source: 'board' | 'takeoff') => {
    const punishment = source === 'board' ? currentPunishment.value : currentTakeoffPunishment.value
    if (!punishment || punishment.strikes == null) return

    const progressTarget =
      source === 'board'
        ? currentPunishmentTarget.value
        : gameState.players[gameState.currentPlayerIndex]
    recordProgress({
      kind: 'mercy_requested',
      playerName: progressTarget?.name ?? '未命名玩家',
    })

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

  const pendingPartyLanding = ref<LandingEffectPayload | null>(null)

  const handleLandingCellEffect = async (
    {
      currentPlayer,
      fromPosition,
      newPosition,
      punishment,
      cellEffect,
      diceValue,
    }: LandingEffectPayload,
    allowPartyChoice = true
  ) => {
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
      if (isPartyGame.value) partyMode.recordChain(effectChainCount.value)
      recordProgress({ kind: 'chain_recorded', length: effectChainCount.value })
    }

    if (resolvedPunishment) {
      const partySessionSnapshot = partySession.value
      const actConstraints =
        isPartyGame.value && partySessionSnapshot
          ? getCurrentPartyActConstraints(partySessionSnapshot.act)
          : undefined
      const actAwarePunishment =
        actConstraints !== undefined
          ? createCompatiblePunishmentAction(gameState.punishmentConfig, undefined, actConstraints)
          : resolvedPunishment
      const partyChoiceSource = currentPlayer.hasTakenOff ? 'board_punishment' : 'takeoff_failure'
      const partyChoiceCellType =
        resolvedCellEffect?.type === 'chain_punishment' ? 'chain_punishment' : 'punishment'
      const canSpendChoiceToken =
        partySessionSnapshot !== null &&
        (partySessionSnapshot.tokensRemaining[gameState.currentPlayerIndex] ?? 0) > 0 &&
        partySessionSnapshot.interventionUsedThisTurn === undefined

      if (
        allowPartyChoice &&
        isPartyGame.value &&
        canSpendChoiceToken &&
        isPartyPunishmentChoiceEligible({
          source: partyChoiceSource,
          cellType: partyChoiceCellType,
          action: actAwarePunishment,
        })
      ) {
        try {
          partyPunishmentChoices.value = createPartyPunishmentChoices(
            gameState.punishmentConfig,
            undefined,
            actConstraints
          )
          pendingPartyLanding.value = {
            currentPlayer,
            fromPosition,
            newPosition,
            punishment: actAwarePunishment,
            cellEffect,
            diceValue,
          }
          return
        } catch {
          // A very narrow custom configuration may not contain two distinct choices.
        }
      }

      const actorIndex = gameState.currentPlayerIndex
      const punishmentVariant =
        currentPlayer.hasTakenOff && isPartyGame.value && partySessionSnapshot
          ? pickPunishmentVariant(
              partySessionSnapshot.act,
              undefined,
              getUnlockedPartyContent(localProgress.value).punishmentVariants
            )
          : undefined
      const punishmentResolution = !currentPlayer.hasTakenOff
        ? resolveRule({
            source: 'takeoff_failure',
            actorIndex,
            players: gameState.players,
            punishmentConfig: gameState.punishmentConfig,
            punishmentAction: actAwarePunishment,
            diceValue: diceValue ?? gameState.diceValue ?? undefined,
            punishmentVariant,
          })
        : resolveRule({
            source: 'board_punishment',
            actorIndex,
            players: gameState.players,
            punishmentConfig: gameState.punishmentConfig,
            boardAction: actAwarePunishment,
            diceValue: diceValue ?? gameState.diceValue ?? undefined,
            punishmentVariant,
          })
      const targetPlayer = gameState.players[punishmentResolution.targetPlayerIndex]
      if (punishmentResolution.countMultiplier) {
        targetPlayer.pendingMercyMultiplier = undefined
      }

      offerPartyPunishmentInterventionOrPresent(punishmentResolution, currentPlayer, diceValue)
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
      currentTrapVariant.value = trapResolution.trapVariant
      currentTrapChoiceA.value = trapResolution.choiceA ?? ''
      currentTrapChoiceB.value = trapResolution.choiceB ?? ''
      currentTrapRouletteTarget.value =
        trapResolution.rouletteTargetIndex !== undefined
          ? (gameState.players[trapResolution.rouletteTargetIndex] ?? null)
          : null

      const miniGameKind =
        trapResolution.trapVariant === 'mini_game_reaction'
          ? 'reaction'
          : trapResolution.trapVariant === 'mini_game_memory'
            ? 'memory'
            : trapResolution.trapVariant === 'mini_game_quiz'
              ? 'quick_quiz'
              : undefined
      if (miniGameKind) {
        currentPartyMiniGameKind.value = miniGameKind
        currentPartyMiniGameSource.value = 'trap'
        gameState.gameStatus = 'configuring'
        return
      }

      const usesChoiceOverlay =
        trapResolution.trapVariant === 'choice' ||
        trapResolution.trapVariant === 'roulette' ||
        trapResolution.trapVariant === 'all_players'
      if (usesChoiceOverlay) {
        showTrapChoiceDisplay.value = true
      } else {
        showTrapDisplay.value = true
      }
      audioService.play('trap')
      return
    }

    if (resolvedCellEffect && resolvedCellEffect.type === 'qa') {
      const qaResolution = resolveRule({
        source: 'qa',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        effect: resolvedCellEffect,
      })
      pendingRuleResolution.value = qaResolution
      currentQAQuestion.value = qaResolution.question
      showQADisplay.value = true
      return
    }

    if (resolvedCellEffect && resolvedCellEffect.type === 'dare') {
      const dareResolution = resolveRule({
        source: 'dare',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        effect: resolvedCellEffect,
      })
      pendingRuleResolution.value = dareResolution
      currentDareInstruction.value = dareResolution.instruction
      showDareDisplay.value = true
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
      bounceTargetPosition.value = fromPosition + (diceValue ?? gameState.diceValue ?? 1)
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

  const resolvePartyPunishmentChoice = async (selectedIndex?: number) => {
    const pendingLanding = pendingPartyLanding.value
    if (!pendingLanding) return
    const selectedPunishment =
      selectedIndex === undefined
        ? pendingLanding.punishment
        : partyPunishmentChoices.value[selectedIndex]

    pendingPartyLanding.value = null
    partyPunishmentChoices.value = []

    if (selectedIndex !== undefined) {
      partyMode.spendToken(gameState.currentPlayerIndex, 'punishment_choice')
    }

    await handleLandingCellEffect({ ...pendingLanding, punishment: selectedPunishment }, false)
  }

  const resolvePartyPunishmentIntervention = async (
    intervention?: PartyPunishmentInterventionDecision
  ) => {
    const originalResolution = partyPunishmentInterventionResolution.value
    if (!originalResolution) return

    partyPunishmentInterventionOptions.value.forEach(option => {
      multiDevice.clearPendingAction(option.playerIndex)
    })
    multiDevice.broadcastStateToAll()
    partyPunishmentInterventionResolution.value = null
    partyPunishmentInterventionOptions.value = []

    if (!intervention) {
      presentResolvedPunishment(
        originalResolution,
        gameState.players[originalResolution.actorIndex],
        gameState.diceValue ?? undefined
      )
      return
    }

    try {
      const outcome = applyPartyPunishmentIntervention(
        originalResolution,
        intervention,
        gameState.players.length
      )
      partyMode.spendToken(outcome.spentByPlayerIndex, outcome.action)
      const playerName = gameState.players[outcome.spentByPlayerIndex]?.name ?? '玩家'

      if (!outcome.resolution) {
        lastEffect.value = `${playerName} 使用免疫，取消了本次惩罚`
        pendingRuleResolution.value = null
        gameState.gameStatus = 'waiting'
        await continueAfterPunishment()
        return
      }

      const resolvedTarget = gameState.players[outcome.resolution.targetPlayerIndex]
      lastEffect.value =
        outcome.action === 'transfer'
          ? `${playerName} 把惩罚转嫁给了 ${resolvedTarget?.name ?? '其他玩家'}`
          : `${playerName} 把本次惩罚加码为 2 倍`
      queueBoundPunishmentIfNeeded(outcome.resolution)
      presentResolvedPunishment(
        outcome.resolution,
        gameState.players[outcome.resolution.actorIndex],
        gameState.diceValue ?? undefined
      )
    } catch (error) {
      console.error('处理惩罚筹码干预时发生错误:', error)
      presentResolvedPunishment(
        originalResolution,
        gameState.players[originalResolution.actorIndex],
        gameState.diceValue ?? undefined
      )
    }
  }

  const handlePunishmentVariantAction = async (
    action:
      | { type: 'conditional'; conditionMet: boolean; condition: string }
      | { type: 'defer'; selectedCount?: number }
  ) => {
    const currentResolution = pendingRuleResolution.value
    if (currentResolution?.kind !== 'punishment') return

    if (action.type === 'conditional') {
      const resolved = resolveConditionalPunishment(currentResolution, action.conditionMet)
      pendingRuleResolution.value = resolved
      currentPunishment.value = toMutablePunishmentAction(resolved.action)
      lastEffect.value = action.conditionMet
        ? `条件“${action.condition}”已完成，本次惩罚减半`
        : `条件“${action.condition}”未完成，本次惩罚照常执行`
      return
    }

    let fixedResolution = currentResolution
    if (fixedResolution.count.kind === 'awaiting_external_count') {
      if (action.selectedCount === undefined) return
      fixedResolution = finalizePunishmentCount(fixedResolution, action.selectedCount)
    }
    const deferredResolution = createDeferredPunishment(fixedResolution)
    deferredPartyPunishments.value.push(deferredResolution)
    const targetName = gameState.players[deferredResolution.targetPlayerIndex]?.name ?? '受罚玩家'
    lastEffect.value = `${targetName} 的惩罚已延迟到其下一个回合开始前`
    await skipPunishment()
  }

  const presentNextDeferredPunishment = (): boolean => {
    const queueIndex = deferredPartyPunishments.value.findIndex(
      resolution => resolution.targetPlayerIndex === gameState.currentPlayerIndex
    )
    if (queueIndex < 0) return false

    const [resolution] = deferredPartyPunishments.value.splice(queueIndex, 1)
    if (!resolution) return false
    displayedPunishmentResumesTurn.value = true
    const triggeringPlayer = gameState.players[resolution.actorIndex]
    presentResolvedPunishment(resolution, triggeringPlayer, gameState.diceValue ?? undefined)
    lastEffect.value = `${gameState.players[resolution.targetPlayerIndex]?.name ?? '当前玩家'} 的延迟惩罚现在执行`
    return true
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
      !showTrapChoiceDisplay.value &&
      !showQADisplay.value &&
      !showDareDisplay.value &&
      !showDoublePunishmentReveal.value &&
      !showChainPunishmentRoll.value &&
      !partyInteractionBlocking.value
    )
  })

  const hasActiveForcedOverlay = computed(
    () =>
      Boolean(currentPunishment.value) ||
      showTakeoffPunishmentDisplay.value ||
      showTrapDisplay.value ||
      showTrapChoiceDisplay.value ||
      showQADisplay.value ||
      showDareDisplay.value ||
      showBounceDisplay.value ||
      showDoublePunishmentReveal.value ||
      showChainPunishmentRoll.value ||
      showMercyDecision.value ||
      showTakeoffReliefDisplay.value ||
      partyInteractionBlocking.value ||
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
    partyPunishmentInterventionResolution.value = null
    partyPunishmentInterventionOptions.value = []
    deferredPartyPunishments.value = []
    displayedPunishmentResumesTurn.value = false
    boundPartyPunishments.value = []
    displayedBoundPunishment.value = false
    partyEventQueue.value = []
    currentPartyEvent.value = null
    partyTurnHadPunishment.value = false
    currentPartyMiniGameKind.value = null
    currentPartyMiniGameSource.value = null
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
      trap:
        showTrapDisplay.value ||
        showTrapChoiceDisplay.value ||
        showQADisplay.value ||
        showDareDisplay.value,
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
    gameTelemetry.setMode(selectedMode.value)
    gameTelemetry.openApp()
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
        selectedMode: typeof selectedMode
        activeMode: typeof activeMode
        partyMode: typeof partyMode
        finishGameWithPlayer: typeof finishGameWithPlayer
        completePartyTurnForPlayer: typeof completePartyTurnForPlayer
        resolveNaturalVictory: typeof resolveNaturalVictory
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
      debugWindow.selectedMode = selectedMode
      debugWindow.activeMode = activeMode
      debugWindow.partyMode = partyMode
      debugWindow.finishGameWithPlayer = finishGameWithPlayer
      debugWindow.completePartyTurnForPlayer = completePartyTurnForPlayer
      debugWindow.resolveNaturalVictory = resolveNaturalVictory
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
    activeMode.value = null
    activePartyStudioConfig.value = null
    classicConfigSnapshot.value = null
    partyMode.clear()
    partyDiceDecisionVisible.value = false
    partyPunishmentChoices.value = []
    partyPunishmentInterventionResolution.value = null
    partyPunishmentInterventionOptions.value = []
    pendingPartyLanding.value = null
    deferredPartyPunishments.value = []
    displayedPunishmentResumesTurn.value = false
    boundPartyPunishments.value = []
    displayedBoundPunishment.value = false
    partyEventQueue.value = []
    currentPartyEvent.value = null
    partyTurnHadPunishment.value = false
    currentPartyMiniGameKind.value = null
    currentPartyMiniGameSource.value = null
    partyTieCandidates.value = []
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

  const handleModeSelected = (mode: GameMode) => {
    selectedMode.value = mode
    saveGameMode(mode)
    gameTelemetry.selectMode(mode)
  }

  const cloneConfig = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const startPartyGame = (playerConfig: {
    count: number
    names: string[]
    mode: 'party'
    scenePreset?: PartyScenePreset | 'default'
    eventDeck?: readonly PartyEventCard[]
    studioConfig?: PartyStudioConfig
  }) => {
    const standardSnapshot = createStandardConfigSnapshot({
      boardConfig: cloneConfig(gameState.boardConfig),
      punishmentConfig: cloneConfig(gameState.punishmentConfig),
      traps: cloneConfig(trapConfig.value),
    })
    const partySnapshot = createModeConfig('party', standardSnapshot)
    classicConfigSnapshot.value = {
      boardConfig: cloneConfig(standardSnapshot.boardConfig),
      punishmentConfig: cloneConfig(standardSnapshot.punishmentConfig),
      trapConfig: cloneConfig(standardSnapshot.traps),
    }
    activeMode.value = 'party'
    selectedPartyScene.value = playerConfig.scenePreset ?? 'default'
    gameState.players = GameService.createCustomPlayers(playerConfig.count, playerConfig.names)
    gameState.currentPlayerIndex = 0
    gameState.diceValue = null
    gameState.winner = null
    gameState.pendingEffect = null
    gameState.punishmentConfig = cloneConfig(partySnapshot.punishmentConfig)

    const sceneKey = selectedPartyScene.value
    const scene = sceneKey !== 'default' ? GAME_CONFIG.PARTY_SCENE_PRESETS[sceneKey] : undefined
    const studio = playerConfig.studioConfig?.enabled ? playerConfig.studioConfig : undefined
    activePartyStudioConfig.value = studio ?? null
    gameState.boardConfig = {
      ...(studio?.boardConfig ?? scene?.boardConfig ?? partySnapshot.boardConfig),
    } as BoardConfig

    const unlockedPartyContent = getUnlockedPartyContent(localProgress.value)
    const partyTraps =
      sceneKey === 'intimate'
        ? partySnapshot.traps.filter(trap => trap.trapVariant !== 'all_players')
        : [...partySnapshot.traps]
    trapConfig.value = partyTraps.filter(
      trap =>
        !trap.trapVariant?.startsWith('mini_game_') ||
        unlockedPartyContent.miniGameTraps.includes(trap.trapVariant)
    )

    const warmupConstraints = getCurrentPartyActConstraints('warmup')
    if (warmupConstraints.doublePunishmentChance !== undefined) {
      gameState.punishmentConfig.doublePunishmentChance = warmupConstraints.doublePunishmentChance
    }

    const partyBoardConfig = createModeConfig(
      'party',
      createStandardConfigSnapshot({
        boardConfig: cloneConfig(gameState.boardConfig),
        punishmentConfig: cloneConfig(gameState.punishmentConfig),
        traps: cloneConfig(trapConfig.value),
        qaQuestions: studio ? Object.values(studio.qaQuestions).flat() : undefined,
        dareInstructions: studio ? Object.values(studio.dareInstructions).flat() : undefined,
      })
    )
    partyBoardConfig.boardConfig = cloneConfig(gameState.boardConfig)
    partyBoardConfig.punishmentConfig = cloneConfig(gameState.punishmentConfig)
    partyBoardConfig.traps = cloneConfig(trapConfig.value)
    partyBoardConfig.punishmentConstraints = { ...warmupConstraints }
    partyBoardConfig.stageConstraints = {
      warmup: { ...warmupConstraints },
      heating: { ...getCurrentPartyActConstraints('heating') },
      finale: { ...getCurrentPartyActConstraints('finale') },
    }

    const generatedBoard = GameService.createBoard(
      gameState.punishmentConfig,
      gameState.boardConfig,
      trapConfig.value,
      studio
        ? {
            qaQuestions: Object.values(studio.qaQuestions).flat(),
            dareInstructions: Object.values(studio.dareInstructions).flat(),
          }
        : undefined,
      undefined,
      partyBoardConfig
    )
    gameState.board = studio
      ? applyPartyBoardLayout(generatedBoard, studio.cellLayout)
      : generatedBoard
    gameState.gameStatus = 'waiting'
    gameTelemetry.setMode('party')
    partyMode.start(gameState.players.length, studio?.director)
    partyEventState.value = createPartyEventState(playerConfig.eventDeck ?? loadPartyEventDeck())
    partyEventQueue.value = []
    currentPartyEvent.value = null
    partyTurnHadPunishment.value = false
    currentPartyMiniGameKind.value = null
    currentPartyMiniGameSource.value = null
    turnCount.value = 1
    gameFinished.value = false
    gameStarted.value = true
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
    const resetMode = activeMode.value
    if (resetMode === 'party' && classicConfigSnapshot.value) {
      gameState.boardConfig = classicConfigSnapshot.value.boardConfig
      gameState.punishmentConfig = classicConfigSnapshot.value.punishmentConfig
      trapConfig.value = classicConfigSnapshot.value.trapConfig
      classicConfigSnapshot.value = null
    }
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
    partyMode.clear()
    partyDiceDecisionVisible.value = false
    partyPunishmentChoices.value = []
    partyPunishmentInterventionResolution.value = null
    partyPunishmentInterventionOptions.value = []
    pendingPartyLanding.value = null
    deferredPartyPunishments.value = []
    displayedPunishmentResumesTurn.value = false
    boundPartyPunishments.value = []
    displayedBoundPunishment.value = false
    partyEventQueue.value = []
    currentPartyEvent.value = null
    partyTurnHadPunishment.value = false
    currentPartyMiniGameKind.value = null
    currentPartyMiniGameSource.value = null
    partyTieCandidates.value = []
    activeMode.value = null
    multiDevice.stopHost()

    // 清除惩罚组合确认状态
    punishmentCombinations.value = []
    punishmentStep.value = 'config'
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    currentTakeoffExecutorIndex.value = -1

    // 清除所有强制结算弹层，结束本局后不残留旧流程
    showTrapDisplay.value = false
    showTrapChoiceDisplay.value = false
    currentTrapPunishment.value = null
    currentTrapDescription.value = ''
    currentTrapChoiceA.value = ''
    currentTrapChoiceB.value = ''
    currentTrapVariant.value = undefined
    currentTrapRouletteTarget.value = null
    showQADisplay.value = false
    currentQAQuestion.value = ''
    showDareDisplay.value = false
    currentDareInstruction.value = ''
    selectedPartyScene.value = 'default'
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

    // 升温局重置后回首页方可切换玩法；经典局保留原配置流程。
    gameState.gameStatus = resetMode === 'party' ? 'intro' : 'board_settings'
  }

  const pauseSession = () => {
    if (!canPauseSession.value) return
    if (isPartyGame.value) partyMode.pause()
    sessionPaused.value = true
  }

  const resumeSession = () => {
    if (isPartyGame.value) partyMode.resume()
    sessionPaused.value = false
  }

  const endPausedSession = () => {
    sessionPaused.value = false
    gameTelemetry.finishGame('user_ended', turnCount.value)
    resetGame()
  }

  const finishGameWithPlayer = (playerIndex: number, preserveClassicVictoryAudio = true) => {
    const winner = gameState.players[playerIndex]
    if (!winner) return
    if (!gameFinished.value) recordProgress({ kind: 'game_completed' })
    winner.isWinner = true
    gameState.winner = winner
    gameState.gameStatus = 'finished'
    gameFinished.value = true
    showVictoryScreen.value = true
    partyTieCandidates.value = []
    if (isPartyGame.value || preserveClassicVictoryAudio) {
      audioService.play('victory')
    }
    resetEffectChainCount()
  }

  type PartyTurnCompletion = 'continue' | 'time_limit_pending' | 'ended'

  const openNextPartyEvent = (): boolean => {
    if (
      !isPartyGame.value ||
      gameFinished.value ||
      currentPartyEvent.value ||
      currentPartyMiniGameKind.value
    ) {
      return false
    }
    const nextCard = partyEventQueue.value.shift()
    if (!nextCard) return false
    currentPartyEvent.value = nextCard
    gameState.gameStatus = 'configuring'
    return true
  }

  const resolveCurrentPartyEvent = (result: {
    selectedPlayerIndices?: readonly number[]
    voteChoice?: string
    voteCounts?: readonly number[]
    rpsWinnerPlayerIndices?: readonly number[]
  }) => {
    const card = currentPartyEvent.value
    if (!card) return
    partyEventState.value = activatePartyEvent(
      partyEventState.value,
      card,
      result.selectedPlayerIndices
    )
    if (result.voteChoice && card.effect.kind === 'vote') {
      const tally = card.effect.options
        .map((option, index) => `${option} ${result.voteCounts?.[index] ?? 0} 票`)
        .join('，')
      lastEffect.value = `事件“${card.title}”投票结果：${result.voteChoice}（${tally}）`
    } else if (result.rpsWinnerPlayerIndices) {
      const winners = result.rpsWinnerPlayerIndices
        .map(index => gameState.players[index]?.name)
        .filter(Boolean)
        .join('、')
      lastEffect.value = `事件“${card.title}”猜拳结果：${winners || '全员'}获胜`
    } else {
      lastEffect.value = `事件“${card.title}”已激活`
    }
    currentPartyEvent.value = null
    gameState.gameStatus = 'waiting'
    openNextPartyEvent()
  }

  const startCurrentEventMiniGame = () => {
    const card = currentPartyEvent.value
    if (card?.effect.kind !== 'mini_game') return
    currentPartyMiniGameKind.value = card.effect.game
    currentPartyMiniGameSource.value = 'event'
    currentPartyEvent.value = null
    gameState.gameStatus = 'configuring'
  }

  const finishPartyMiniGame = async (outcome: PartyMiniGameOutcome) => {
    const kind = currentPartyMiniGameKind.value
    const source = currentPartyMiniGameSource.value
    if (!kind || !source) return

    if (kind === 'reaction') {
      outcome.winnerPlayerIndices.forEach(playerIndex => {
        const player = gameState.players[playerIndex]
        if (player) player.pendingMiniGameImmunity = true
      })
    } else {
      outcome.loserPlayerIndices.forEach(playerIndex => {
        const player = gameState.players[playerIndex]
        if (player) player.pendingMiniGameMultiplier = 2
      })
    }
    lastEffect.value = outcome.summary
    currentPartyMiniGameKind.value = null
    currentPartyMiniGameSource.value = null
    gameState.gameStatus = 'waiting'

    if (source === 'trap') {
      pendingRuleResolution.value = null
      await continueAfterMove()
      return
    }
    openNextPartyEvent()
  }

  const completePartyTurnForPlayer = (playerIndex: number): PartyTurnCompletion => {
    if (!isPartyGame.value) return 'continue'
    const nextRoundEligibleReactionTargets = gameState.players.flatMap((player, index) =>
      (player.pendingSkippedTurns ?? 0) > 0 ? [] : [index]
    )
    const completedSession = partyMode.completeTurn(playerIndex, nextRoundEligibleReactionTargets)
    recordPartyEventSignal({
      kind: 'turn_completed',
      hadPunishment: partyTurnHadPunishment.value,
    })
    partyTurnHadPunishment.value = false
    if (!completedSession.shouldEnd) {
      return completedSession.timeLimitPending ? 'time_limit_pending' : 'continue'
    }

    const leaders = getPartyTimeLimitLeaders(gameState.players.map(player => player.position))
    if (leaders.length === 1) {
      finishGameWithPlayer(leaders[0])
    } else {
      gameState.gameStatus = 'configuring'
      partyTieCandidates.value = leaders
    }
    return 'ended'
  }

  const resolveNaturalVictory = (playerIndex: number, preserveClassicVictoryAudio = true): void => {
    const completion = completePartyTurnForPlayer(playerIndex)
    if (completion === 'ended') return
    if (completion === 'time_limit_pending') {
      advanceToNextPlayablePlayer(true)
      return
    }
    finishGameWithPlayer(playerIndex, preserveClassicVictoryAudio)
  }

  const continuePartyMove = async () => {
    partyDiceDecisionVisible.value = false
    gameState.gameStatus = 'moving'
    await moveCurrentPlayer()
  }

  const performDiceRoll = async (isReroll = false) => {
    audioService.play('diceRoll')
    resetEffectChainCount()
    gameState.gameStatus = 'rolling'
    gameState.diceValue = GameService.rollDice()
    if (isPartyGame.value) {
      recordPartyEventSignal({ kind: 'dice_value', value: gameState.diceValue })
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    if (
      isPartyGame.value &&
      !isReroll &&
      partyMode.session.value?.reaction?.status === 'awaiting_roll'
    ) {
      const resolvedSession = partyMode.resolveRoll(gameState.diceValue)
      if (resolvedSession.reaction?.status === 'awaiting_decision') {
        const reactorIdx = resolvedSession.reaction.reactorPlayerIndex
        if (multiDevice.isRemotePlayer(reactorIdx)) {
          multiDevice.requestAction(reactorIdx, {
            type: 'reaction_decision',
            rolledValue: resolvedSession.reaction.rolledValue ?? gameState.diceValue,
            timeoutSeconds: 5,
          })
        }
        return
      }
      gameState.diceValue = resolvedSession.reaction?.finalDiceValue ?? gameState.diceValue
    }

    if (isPartyGame.value && !isReroll) {
      const currentIdx = gameState.currentPlayerIndex
      if (multiDevice.isRemotePlayer(currentIdx)) {
        multiDevice.requestAction(currentIdx, {
          type: 'dice_decision',
          diceValue: gameState.diceValue ?? 1,
          canReroll: canCurrentPlayerReroll.value,
          timeoutSeconds: 5,
        })
      }
      partyDiceDecisionVisible.value = true
      return
    }

    await continuePartyMove()
  }

  const handlePartyReactionPrediction = async (prediction: PartyPrediction) => {
    const reactorPlayerIndex = partyReaction.value?.reactorPlayerIndex
    if (reactorPlayerIndex === undefined) return
    partyMode.submitPrediction(reactorPlayerIndex, prediction)
    await performDiceRoll()
  }

  const handlePartyReactionDecision = async (decision: PartyReactionDecision) => {
    const reactorPlayerIndex = partyReaction.value?.reactorPlayerIndex
    if (reactorPlayerIndex === undefined) return
    const resolvedSession = partyMode.decideReaction(reactorPlayerIndex, decision)
    gameState.diceValue = resolvedSession.reaction?.finalDiceValue ?? gameState.diceValue
    partyDiceDecisionVisible.value = true
  }

  const handlePartyReroll = async () => {
    if (!isPartyGame.value) return
    partyMode.spendToken(gameState.currentPlayerIndex, 'reroll')
    partyDiceDecisionVisible.value = false
    await performDiceRoll(true)
  }

  // 处理骰子滚动
  const handleDiceRoll = async () => {
    if (!canRollDice.value) return

    if (isPartyGame.value && presentNextDeferredPunishment()) return

    const currentPlayerIndex = gameState.currentPlayerIndex
    const currentPlayer = gameState.players[currentPlayerIndex]
    const pendingTurn = consumePendingSkippedTurn(currentPlayer)
    if (pendingTurn.shouldSkip) {
      gameState.players[currentPlayerIndex] = pendingTurn.player
      lastEffect.value = `${currentPlayer.name}休息一回合，本回合已跳过`
      advanceToNextPlayablePlayer()
      return
    }

    if (isPartyGame.value) {
      const partyTurn = partyMode.beginTurn(currentPlayerIndex)
      if (partyTurn.reaction?.status === 'awaiting_prediction') {
        if (multiDevice.isRemotePlayer(partyTurn.reaction.reactorPlayerIndex)) {
          multiDevice.requestAction(partyTurn.reaction.reactorPlayerIndex, {
            type: 'predict',
            timeoutSeconds: 5,
          })
        }
        return
      }
    }

    await performDiceRoll()
  }

  // 移动当前玩家（第一步：基本移动）
  const moveCurrentPlayer = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      const diceValue = gameState.diceValue
      if (diceValue == null) {
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
          gameState.punishmentConfig,
          isPartyGame.value
            ? getCurrentPartyActConstraints(partySession.value?.act ?? 'warmup')
            : undefined
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
        resolveNaturalVictory(gameState.currentPlayerIndex)
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
        resolveNaturalVictory(gameState.currentPlayerIndex, false)
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

  function advanceToNextPlayablePlayer(currentTurnAlreadyCompleted = false) {
    if (gameState.players.length === 0) return

    if (
      !currentTurnAlreadyCompleted &&
      completePartyTurnForPlayer(gameState.currentPlayerIndex) === 'ended'
    ) {
      return
    }

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
      if (completePartyTurnForPlayer(playerIndex) === 'ended') return
      gameState.currentPlayerIndex = GameService.getNextPlayer(
        playerIndex,
        gameState.players.length
      )
      turnCount.value++
      remainingChecks--
    }

    gameState.diceValue = null
    gameState.gameStatus = 'waiting'
    openNextPartyEvent()
  }

  // 移动后的继续流程
  const continueAfterMove = async () => {
    try {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]
      resetEffectChainCount()

      // 检查是否获胜
      if (GameService.checkWinner(currentPlayer, gameState.board.length)) {
        resolveNaturalVictory(gameState.currentPlayerIndex, false)
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
      let punishmentResolution = pendingRuleResolution.value
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
        punishmentResolution = finalizedResolution
      }

      if (punishmentResolution?.kind === 'punishment') {
        recordCompletedPunishment(punishmentResolution)
      }

      if (
        punishmentResolution?.kind === 'punishment' &&
        punishmentResolution.variant === 'mutual' &&
        punishmentResolution.variantPhase === undefined
      ) {
        const returnedResolution = createMutualPunishmentReturn(punishmentResolution)
        mercyRequested.value = true
        lastEffect.value = '双向惩罚第一次已完成，现在交换角色执行第二次'
        presentResolvedPunishment(
          returnedResolution,
          gameState.players[returnedResolution.actorIndex],
          gameState.diceValue ?? undefined
        )
        return
      }

      if (
        punishmentResolution?.kind === 'punishment' &&
        punishmentResolution.variant === 'encore' &&
        punishmentResolution.variantPhase === undefined
      ) {
        const returnedResolution = createEncorePunishmentReturn(punishmentResolution)
        mercyRequested.value = true
        lastEffect.value = '返场惩罚第一次已完成，现在由同一玩家执行减半后的第二次'
        presentResolvedPunishment(
          returnedResolution,
          gameState.players[returnedResolution.actorIndex],
          gameState.diceValue ?? undefined
        )
        return
      }

      if (presentNextBoundPunishment()) return
      if (displayedBoundPunishment.value) displayedBoundPunishment.value = false

      // 连锁惩罚：确认后进入连锁掷骰阶段
      if (isChainPunishment.value) {
        currentPunishment.value = null
        showChainPunishmentRoll.value = true
        return
      }

      // 翻倍陷阱：如果当前不是翻倍状态，检查是否触发翻倍
      if (
        !isDoublePunishment.value &&
        currentPunishment.value &&
        punishmentResolution?.kind === 'punishment' &&
        punishmentResolution.variant !== 'mutual' &&
        punishmentResolution.variant !== 'encore'
      ) {
        const chance = isPartyGame.value
          ? (getCurrentPartyActConstraints(partySession.value?.act ?? 'warmup')
              .doublePunishmentChance ?? 0)
          : (gameState.punishmentConfig.doublePunishmentChance ?? 0)
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

      if (displayedPunishmentResumesTurn.value) {
        displayedPunishmentResumesTurn.value = false
        presentNextDeferredPunishment()
        return
      }

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
      const actConstraints = isPartyGame.value
        ? getCurrentPartyActConstraints(partySession.value?.act ?? 'warmup')
        : undefined
      const newPunishment = GameService.generateRandomPunishment(
        gameState.punishmentConfig,
        actConstraints
      )
      const chainResolution = resolveRule({
        source: 'board_punishment',
        actorIndex: gameState.currentPlayerIndex,
        players: gameState.players,
        punishmentConfig: gameState.punishmentConfig,
        diceValue: gameState.diceValue ?? undefined,
        boardAction: newPunishment,
        punishmentVariant:
          isPartyGame.value && partySession.value
            ? pickPunishmentVariant(
                partySession.value.act,
                undefined,
                getUnlockedPartyContent(localProgress.value).punishmentVariants
              )
            : undefined,
      })
      const targetPlayer = gameState.players[chainResolution.targetPlayerIndex]
      if (chainResolution.countMultiplier) {
        targetPlayer.pendingMercyMultiplier = undefined
      }
      offerPartyPunishmentInterventionOrPresent(
        chainResolution,
        gameState.players[chainResolution.actorIndex],
        gameState.diceValue ?? undefined
      )
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
      if (presentNextBoundPunishment()) return
      if (displayedBoundPunishment.value) displayedBoundPunishment.value = false

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

      if (displayedPunishmentResumesTurn.value) {
        displayedPunishmentResumesTurn.value = false
        presentNextDeferredPunishment()
        return
      }

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
        resolveNaturalVictory(gameState.currentPlayerIndex, false)
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

  const handleCellSelect = (cell: BoardCell) => {
    selectedCellPosition.value = cell.position
    cellInspectorOpen.value = true
  }

  const selectAdjacentCell = (offset: -1 | 1) => {
    if (!selectedBoardCell.value) return
    const nextPosition = Math.min(
      Math.max(selectedBoardCell.value.position + offset, 1),
      gameState.board.length
    )
    selectedCellPosition.value = nextPosition
    gameBoardRef.value?.scrollToCell(nextPosition)
  }

  const locateSelectedCell = () => {
    if (!selectedCellPosition.value) return
    gameBoardRef.value?.scrollToCell(selectedCellPosition.value)
  }

  const closeCellInspector = () => {
    cellInspectorOpen.value = false
    const selectedPosition = selectedCellPosition.value
    if (selectedPosition) {
      nextTick(() => gameBoardRef.value?.focusCell(selectedPosition))
    }
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
    if (pendingRuleResolution.value?.kind === 'punishment') {
      recordCompletedPunishment(pendingRuleResolution.value)
    }
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    currentTakeoffTarget.value = null
    currentTakeoffTriggeringPlayer.value = null
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
  const handleIntroStart = async (playerConfig: {
    count: number
    names: string[]
    mode: GameMode
    scenePreset?: PartyScenePreset | 'default'
    multiDevice?: boolean
    victoryConfig: VictoryConfig
    eventDeck: readonly PartyEventCard[]
    studioConfig: PartyStudioConfig
  }) => {
    selectedMode.value = playerConfig.mode
    saveGameMode(playerConfig.mode)
    gameTelemetry.setMode(playerConfig.mode)
    gameTelemetry.startSetup(playerConfig.count)
    victoryConfig.value = { ...playerConfig.victoryConfig }

    if (playerConfig.mode === 'party') {
      startPartyGame({
        ...playerConfig,
        mode: 'party',
        scenePreset: playerConfig.scenePreset ?? 'default',
      })
      if (playerConfig.multiDevice) {
        try {
          await multiDevice.startHost()
        } catch (e) {
          devLog('多设备模式启动失败:', e)
        }
      }
      return
    }

    activeMode.value = 'classic'
    activePartyStudioConfig.value = null
    partyMode.clear()
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
      showTrapChoiceDisplay.value = false
      currentTrapPunishment.value = null
      currentTrapDescription.value = ''
      currentTrapChoiceA.value = ''
      currentTrapChoiceB.value = ''
      currentTrapVariant.value = undefined
      currentTrapRouletteTarget.value = null
      pendingRuleResolution.value = null
      gameState.gameStatus = 'waiting'

      await continueAfterMove()
    } catch (error) {
      console.error('确认机关陷阱时发生错误:', error)
      gameState.gameStatus = 'waiting'
      showTrapDisplay.value = false
      showTrapChoiceDisplay.value = false
      currentTrapPunishment.value = null
      currentTrapDescription.value = ''
      pendingRuleResolution.value = null
    }
  }

  const confirmTrapChoice = async (_choice: 'A' | 'B') => {
    await confirmTrap()
  }

  const confirmQAAnswer = async () => {
    showQADisplay.value = false
    currentQAQuestion.value = ''
    pendingRuleResolution.value = null
    gameState.gameStatus = 'waiting'
    await continueAfterMove()
  }

  const confirmQARefuse = async () => {
    showQADisplay.value = false
    currentQAQuestion.value = ''
    pendingRuleResolution.value = null

    const actConstraints = partySession.value
      ? getCurrentPartyActConstraints(partySession.value.act)
      : undefined
    const punishment = createCompatiblePunishmentAction(
      gameState.punishmentConfig,
      undefined,
      actConstraints
    )
    const punishmentResolution = resolveRule({
      source: 'board_punishment',
      actorIndex: gameState.currentPlayerIndex,
      players: gameState.players,
      punishmentConfig: gameState.punishmentConfig,
      boardAction: punishment,
      punishmentVariant:
        isPartyGame.value && partySession.value
          ? pickPunishmentVariant(
              partySession.value.act,
              undefined,
              getUnlockedPartyContent(localProgress.value).punishmentVariants
            )
          : undefined,
    })
    const targetPlayer = gameState.players[punishmentResolution.targetPlayerIndex]
    if (punishmentResolution.countMultiplier) {
      targetPlayer.pendingMercyMultiplier = undefined
    }
    offerPartyPunishmentInterventionOrPresent(
      punishmentResolution,
      gameState.players[punishmentResolution.actorIndex],
      gameState.diceValue ?? undefined
    )
  }

  const confirmDare = async () => {
    showDareDisplay.value = false
    currentDareInstruction.value = ''
    pendingRuleResolution.value = null
    gameState.gameStatus = 'waiting'
    await continueAfterMove()
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
  const handleVictoryPlayAgain = async () => {
    const playerCount = gameState.players.length
    const playerNames = gameState.players.map(player => player.name)
    const completedMode = activeMode.value
    gameTelemetry.playAgain()
    showVictoryScreen.value = false
    resetGame()

    if (completedMode === 'party') {
      await nextTick()
      startPartyGame({
        count: playerCount,
        names: playerNames,
        mode: 'party',
        scenePreset: selectedPartyScene.value,
      })
      return
    }

    gameTelemetry.startSetup(playerCount)
  }

  const showTakeoffReliefDisplay = ref(false)
  const failedTakeoffCountForMessage = ref(0)

  const confirmTakeoffRelief = async () => {
    showTakeoffReliefDisplay.value = false
    gameState.gameStatus = 'waiting'
    await continueAfterMove()
  }

  // --- 多设备同步（手柄模式） ---
  const multiDevice = useMultiDeviceHost({
    gameState,
    partySession,
    lastEffect,
    gameStarted,
    gameFinished,
    isPartyGame,
    sessionPaused,
    victoryConfig,
    overlayState: () => ({
      currentPunishment: Boolean(currentPunishment.value),
      showTakeoffPunishment: showTakeoffPunishmentDisplay.value,
      showTrap: showTrapDisplay.value,
      showTrapChoice: showTrapChoiceDisplay.value,
      showQA: showQADisplay.value,
      showDare: showDareDisplay.value,
      showBounce: showBounceDisplay.value,
      showEffect: gameState.gameStatus === 'showing_effect',
      showTakeoffRelief: showTakeoffReliefDisplay.value,
    }),
    actions: {
      handleDiceRoll,
      performDiceRoll,
      handlePartyReactionPrediction,
      handlePartyReactionDecision,
      handlePartyReroll,
      continuePartyMove,
      resolvePartyPunishmentChoice,
      resolvePartyPunishmentIntervention: intervention =>
        resolvePartyPunishmentIntervention(intervention),
      confirmPunishment,
      confirmEffect,
      handleTrapDismiss: () => confirmTrap(),
      handleTrapChoiceDismiss: () => confirmTrap(),
      handleQADismiss: () => {
        showQADisplay.value = false
        currentQAQuestion.value = ''
        pendingRuleResolution.value = null
        continueAfterMove()
      },
      handleDareDismiss: () => {
        showDareDisplay.value = false
        currentDareInstruction.value = ''
        pendingRuleResolution.value = null
        continueAfterMove()
      },
      handleBounceConfirm: () => confirmBounce(),
      handleTakeoffPunishmentDismiss: handleTakeoffPunishmentDisplay,
      handleTakeoffReliefDismiss: () => confirmTakeoffRelief(),
    },
  })
  const lanPairingAnswerInput = ref('')
  const submitLanPairingAnswer = async () => {
    const answer = lanPairingAnswerInput.value.trim()
    if (!answer) return
    if (await multiDevice.acceptPairingAnswer(answer)) lanPairingAnswerInput.value = ''
  }

  const multiDeviceEnabled = computed(() => multiDevice.enabled.value)
  const sharedScreenPunishmentInterventionOptions = computed(() =>
    multiDeviceEnabled.value
      ? projectSharedScreenInterventionOptions(
          partyPunishmentInterventionOptions.value,
          multiDevice.isRemotePlayer
        )
      : partyPunishmentInterventionOptions.value
  )

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
    if (gameStarted.value) {
      gameTelemetry.finishGame('config_import', turnCount.value)
    }

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
      'app--game':
        gameState.gameStatus !== 'intro' &&
        gameState.gameStatus !== 'board_settings' &&
        gameState.gameStatus !== 'settings',
      'app--party-studio': isPartyGame && activePartyStudioConfig?.enabled,
    }"
    :style="partyStudioThemeStyle"
  >
    <!-- 开始页面 -->
    <IntroPage
      v-if="gameState.gameStatus === 'intro'"
      :initial-mode="selectedMode"
      @start="handleIntroStart"
      @mode-selected="handleModeSelected"
    />

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

          <GameRoster
            v-if="gameState.players.length > 0"
            :players="gameState.players"
            :current-player-index="gameState.currentPlayerIndex"
            :total-cells="gameState.board.length"
            :party-act-label="isPartyGame ? partyActLabel : undefined"
            :party-round="isPartyGame ? partySession?.roundNumber : undefined"
            :tokens-remaining="
              isPartyGame && !multiDeviceEnabled ? partySession?.tokensRemaining : undefined
            "
            class="header-players"
          />

          <div class="header-actions">
            <span
              v-if="multiDeviceEnabled"
              class="multi-device-badge"
              :title="`多设备模式 - ${multiDevice.getConnectedPlayerCount()}/${gameState.players.length} 已连接`"
            >
              📱 {{ multiDevice.getConnectedPlayerCount() }}/{{ gameState.players.length }}
            </span>
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
              @click="handleVictoryPlayAgain"
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
        <div class="game-cockpit">
          <div class="board-section">
            <GameBoard
              ref="gameBoardRef"
              :board="gameState.board"
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
              :selected-position="selectedCellPosition"
              :interaction-disabled="
                hasActiveForcedOverlay || sessionPaused || gameFinished || partyInteractionBlocking
              "
              @select-cell="handleCellSelect"
            />
          </div>

          <aside v-if="!isMobileView" class="game-sidecar" aria-label="回合与格子信息">
            <GameTurnDock
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
              :total-cells="gameState.board.length"
              :can-roll="canRollDice"
              :dice-value="gameState.diceValue"
              :last-effect="lastEffect"
              :turn-count="turnCount"
              :mobile="false"
              @roll="handleDiceRoll"
            />
            <CellInspector
              :cell="selectedBoardCell"
              :total-cells="gameState.board.length"
              :players="gameState.players"
              :visible="true"
              :mobile="false"
              @close="cellInspectorOpen = false"
              @previous="selectAdjacentCell(-1)"
              @next="selectAdjacentCell(1)"
              @locate="locateSelectedCell"
            />
          </aside>
        </div>

        <GameTurnDock
          v-if="isMobileView"
          :players="gameState.players"
          :current-player-index="gameState.currentPlayerIndex"
          :total-cells="gameState.board.length"
          :can-roll="canRollDice"
          :dice-value="gameState.diceValue"
          :last-effect="lastEffect"
          :turn-count="turnCount"
          :mobile="true"
          @roll="handleDiceRoll"
        />

        <CellInspector
          v-if="isMobileView"
          :cell="selectedBoardCell"
          :total-cells="gameState.board.length"
          :players="gameState.players"
          :visible="cellInspectorOpen"
          :mobile="true"
          @close="closeCellInspector"
          @previous="selectAdjacentCell(-1)"
          @next="selectAdjacentCell(1)"
          @locate="locateSelectedCell"
        />
      </main>

      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
        :executor-player="currentPunishmentExecutor"
        :target-player="currentPunishmentTarget"
        :count-selection="currentPunishmentCountSelection"
        :count-multiplier="currentPunishmentCountMultiplier"
        :variant="currentPunishmentVariant"
        :variant-phase="currentPunishmentVariantPhase"
        :can-request-mercy="canRequestBoardMercy"
        @confirm="confirmPunishment"
        @skip="skipPunishment"
        @request-mercy="handleMercyRequest('board')"
        @variant-action="handlePunishmentVariantAction"
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
      :target-name="currentTakeoffTarget?.name ?? ''"
      :triggering-player-name="currentTakeoffTriggeringPlayer?.name ?? ''"
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

    <TrapChoiceDisplay
      :show="showTrapChoiceDisplay"
      :description="currentTrapDescription"
      :choice-a="currentTrapChoiceA"
      :choice-b="currentTrapChoiceB"
      :player="gameState.players[gameState.currentPlayerIndex]"
      :roulette-target="currentTrapRouletteTarget"
      :trap-variant="currentTrapVariant"
      @choose="confirmTrapChoice"
      @confirm="confirmTrap"
    />

    <QADisplay
      :show="showQADisplay"
      :question="currentQAQuestion"
      :player="gameState.players[gameState.currentPlayerIndex]"
      @answer="confirmQAAnswer"
      @refuse="confirmQARefuse"
    />

    <DareDisplay
      :show="showDareDisplay"
      :instruction="currentDareInstruction"
      :player="gameState.players[gameState.currentPlayerIndex]"
      @confirm="confirmDare"
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

    <PartyReactionOverlay
      v-if="
        !multiDeviceEnabled || !multiDevice.isRemotePlayer(partyReaction?.reactorPlayerIndex ?? -1)
      "
      :reaction="partyReaction"
      :players="gameState.players"
      :paused="sessionPaused"
      @predict="handlePartyReactionPrediction"
      @decide="handlePartyReactionDecision"
    />

    <PartyDiceDecision
      v-if="!multiDeviceEnabled || !multiDevice.isRemotePlayer(gameState.currentPlayerIndex)"
      :visible="partyDiceDecisionVisible"
      :player-name="gameState.players[gameState.currentPlayerIndex]?.name ?? '当前玩家'"
      :dice-value="gameState.diceValue ?? 1"
      :tokens-remaining="currentPartyTokens"
      :can-reroll="canCurrentPlayerReroll"
      :paused="sessionPaused"
      @reroll="handlePartyReroll"
      @continue="continuePartyMove"
    />

    <PartyPunishmentChoice
      v-if="!multiDeviceEnabled || !multiDevice.isRemotePlayer(gameState.currentPlayerIndex)"
      :visible="partyPunishmentChoices.length === 2"
      :choices="partyPunishmentChoices"
      :tokens-remaining="currentPartyTokens"
      :paused="sessionPaused"
      @select="resolvePartyPunishmentChoice"
      @skip="resolvePartyPunishmentChoice()"
    />

    <PartyPunishmentIntervention
      :visible="partyPunishmentInterventionResolution !== null"
      :resolution="partyPunishmentInterventionResolution"
      :players="gameState.players"
      :options="sharedScreenPunishmentInterventionOptions"
      :tokens-remaining="partySession?.tokensRemaining ?? []"
      :paused="sessionPaused"
      @apply="resolvePartyPunishmentIntervention"
      @skip="resolvePartyPunishmentIntervention()"
    />

    <PartyEventCardOverlay
      :card="currentPartyEvent"
      :players="gameState.players"
      @resolve="resolveCurrentPartyEvent"
      @start-mini-game="startCurrentEventMiniGame"
    />

    <PartyMiniGame
      :visible="currentPartyMiniGameKind !== null"
      :kind="currentPartyMiniGameKind"
      :players="gameState.players"
      :actor-player-index="gameState.currentPlayerIndex"
      @complete="finishPartyMiniGame"
    />

    <PartyTieBreak
      :visible="partyTieCandidates.length > 1"
      :players="gameState.players"
      :candidate-indices="partyTieCandidates"
      @winner="finishGameWithPlayer"
    />

    <!-- 胜利结算画面 -->
    <VictoryScreen
      :show="showVictoryScreen"
      :winner="gameState.winner"
      :all-players="gameState.players"
      :mode="activeMode"
      :party-highlight="partyHighlight"
      :victory-config="activeMode === 'party' ? victoryConfig : undefined"
      @play-again="handleVictoryPlayAgain"
    />

    <!-- 起飞失败过多自动起飞弹窗 -->
    <TakeoffReliefDisplay
      :visible="showTakeoffReliefDisplay"
      :failed-count="failedTakeoffCountForMessage"
      @confirm="confirmTakeoffRelief"
    />

    <!-- 多设备连接面板 -->
    <div
      v-if="
        multiDeviceEnabled && multiDevice.roomInfo.value && !multiDevice.allPlayersConnected.value
      "
      class="multi-device-lobby"
    >
      <div class="multi-device-lobby-card">
        <h2>等待玩家连接</h2>
        <p class="room-code-label">房间码</p>
        <p class="room-code">{{ multiDevice.roomInfo.value.roomId }}</p>
        <p class="room-url">{{ multiDevice.roomInfo.value.gameUrl }}</p>
        <div class="lan-pairing-panel">
          <p>1. 手机打开上方手柄地址；2. 将邀请粘贴到手机；3. 把手机生成的应答粘贴回来。</p>
          <small>原生 WebRTC 局域网直连：不使用默认云端信令或外部中继。</small>
          <label>
            <span>局域网配对邀请</span>
            <textarea
              :value="multiDevice.pairingOffer.value"
              readonly
              placeholder="正在收集局域网连接信息..."
              data-testid="lan-pairing-offer"
            />
          </label>
          <label>
            <span>手机配对应答</span>
            <textarea
              v-model="lanPairingAnswerInput"
              placeholder="粘贴手机生成的配对应答 JSON"
              data-testid="lan-pairing-answer-input"
            />
          </label>
          <button
            type="button"
            :disabled="!lanPairingAnswerInput.trim()"
            data-testid="lan-pairing-submit"
            @click="submitLanPairingAnswer"
          >
            建立局域网直连
          </button>
          <p v-if="multiDevice.pairingError.value" class="lan-pairing-error">
            {{ multiDevice.pairingError.value }}
          </p>
        </div>
        <div class="connection-list">
          <div
            v-for="player in gameState.players"
            :key="player.id"
            class="connection-item"
            :class="{
              connected: multiDevice.connectedPlayers.value.some(
                c => c.playerIndex === player.id - 1 && c.status === 'connected'
              ),
            }"
          >
            <span class="player-dot" :style="{ background: player.color }" />
            <span>{{ player.name }}</span>
            <span class="connection-status-icon">
              {{
                multiDevice.connectedPlayers.value.some(
                  c => c.playerIndex === player.id - 1 && c.status === 'connected'
                )
                  ? '✓'
                  : '...'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

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

  .app--party-studio {
    background: var(--party-studio-background);
  }

  .app--party-studio .game-header,
  .app--party-studio .game-sidecar {
    border-color: color-mix(in srgb, var(--party-studio-accent) 48%, transparent);
  }

  .app--party-studio .multi-device-badge,
  .app--party-studio .turn-badge {
    color: var(--party-studio-accent);
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
    background:
      radial-gradient(circle at 50% -10%, rgba(76, 116, 94, 0.22), transparent 38%),
      linear-gradient(145deg, #081914, #06130f);
  }

  .game-header {
    position: relative;
    z-index: 20;
    padding: 0.55rem 1rem;
    background: rgba(8, 24, 19, 0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(216, 181, 112, 0.22);
    box-shadow: 0 8px 28px rgba(1, 10, 8, 0.26);
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
    color: #fff7e7;
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
    background: rgba(236, 218, 180, 0.07);
    border: 1px solid rgba(218, 181, 112, 0.2);
    border-radius: 10px;
    color: #cabd9f;
    padding: 0.4rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 44px;
  }

  .audio-toggle-btn:hover {
    color: #fff5df;
    background: rgba(236, 218, 180, 0.13);
  }

  .game-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 0;
  }

  .game-cockpit {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(290px, 340px);
    gap: 1rem;
    padding: 1rem;
  }

  .board-section {
    min-height: 0;
    position: relative;
    display: flex;
  }

  .board-section :deep(.game-board) {
    flex: 1;
  }

  .game-sidecar {
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .game-sidecar :deep(.cell-inspector) {
    flex: 1;
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
      gap: 0.35rem;
    }

    .game-header h1,
    .header-status {
      display: none;
    }

    .header-players {
      flex: 1 1 auto;
      min-width: 0;
    }

    .game-cockpit {
      display: block;
      min-height: 0;
      padding: 0.45rem 0.45rem 100px;
    }

    .board-section {
      height: calc(100dvh - 150px);
      min-height: 430px;
    }
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

  /* 横屏模式：保持同一信息层级，只压缩垂直空间 */
  @media (orientation: landscape) and (max-height: 600px) {
    .game-header {
      padding-block: 0.3rem;
    }

    .board-section {
      height: calc(100dvh - 132px);
      min-height: 260px;
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
      bottom: calc(max(0.45rem, env(safe-area-inset-bottom)) + 99px);
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

    .app--game .guide-btn,
    .app--game .guide-controls {
      bottom: calc(max(0.45rem, env(safe-area-inset-bottom)) + 99px);
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

  /* --- Multi-device lobby --- */
  .multi-device-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(225, 194, 127, 0.15);
    color: var(--color-accent, #e1c27f);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .multi-device-lobby {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    padding: 1rem;
  }

  .multi-device-lobby-card {
    background: var(--color-surface, #1a1a2e);
    border-radius: var(--radius-lg, 12px);
    padding: 2rem;
    text-align: center;
    max-width: 680px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .multi-device-lobby-card h2 {
    margin: 0 0 1.5rem;
    font-size: 1.3rem;
  }

  .room-code-label {
    font-size: 0.85rem;
    color: var(--color-text-muted, #8a8780);
    margin-bottom: 0.25rem;
  }

  .room-code {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: 0.3em;
    color: var(--color-accent, #e1c27f);
    margin-bottom: 0.5rem;
  }

  .room-url {
    font-size: 0.7rem;
    color: var(--color-text-muted, #8a8780);
    word-break: break-all;
    margin-bottom: 1.5rem;
  }

  .lan-pairing-panel {
    display: grid;
    gap: 0.65rem;
    margin-bottom: 1.25rem;
    padding: 0.9rem;
    text-align: left;
    background: rgb(255 255 255 / 0.04);
    border: 1px solid rgb(225 194 127 / 0.22);
    border-radius: 10px;
  }

  .lan-pairing-panel p,
  .lan-pairing-panel small {
    margin: 0;
  }

  .lan-pairing-panel small {
    color: var(--color-text-muted, #8a8780);
  }

  .lan-pairing-panel label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.78rem;
  }

  .lan-pairing-panel textarea {
    min-height: 76px;
    padding: 0.55rem;
    color: var(--color-text, #e8e6e3);
    font:
      0.7rem/1.3 ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    background: rgb(0 0 0 / 0.24);
    border: 1px solid rgb(255 255 255 / 0.14);
    border-radius: 7px;
    resize: vertical;
  }

  .lan-pairing-panel button {
    min-height: 42px;
  }

  .lan-pairing-error {
    color: #fca5a5;
  }

  .connection-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .connection-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    transition: all 0.3s;
  }

  .connection-item.connected {
    background: rgba(52, 211, 153, 0.1);
  }

  .connection-item .player-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .connection-status-icon {
    margin-left: auto;
    font-size: 0.9rem;
  }

  .connection-item.connected .connection-status-icon {
    color: #34d399;
  }
</style>
