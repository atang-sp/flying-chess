<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
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
  } from './types/game'
  import IntroPage from './components/IntroPage.vue'
  import GameControls from './components/GameControls.vue'
  import GameBoard from './components/GameBoard.vue'
  import Dice from './components/Dice.vue'
  import BoardConfigPanel from './components/BoardConfig.vue'
  import PunishmentConfigPanel from './components/PunishmentConfig.vue'
  import PunishmentDisplay from './components/PunishmentDisplay.vue'
  import PunishmentConfirmation from './components/PunishmentConfirmation.vue'
  import EffectDisplay from './components/EffectDisplay.vue'
  import PunishmentStats from './components/PunishmentStats.vue'
  import TakeoffPunishmentDisplay from './components/TakeoffPunishmentDisplay.vue'
  import VersionDisplay from './components/VersionDisplay.vue'

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

  // 计算属性
  const canRollDice = computed(() => {
    return (
      gameStarted.value &&
      !gameFinished.value &&
      gameState.gameStatus === 'waiting' &&
      !currentPunishment.value &&
      !showTakeoffPunishmentDisplay.value
    )
  })

  const isConfigValid = computed(() => {
    return GameService.validatePunishmentConfig(gameState.punishmentConfig)
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

  // 初始化游戏
  const initializeGame = () => {
    gameState.players = GameService.createPlayers()
    gameState.board = GameService.createBoard(gameState.punishmentConfig, gameState.boardConfig)
    gameState.currentPlayerIndex = 0
    gameState.diceValue = null
    gameState.gameStatus = 'intro'
    gameState.winner = null
    gameState.punishmentConfig = GameService.createPunishmentConfig()
    gameState.boardConfig = GameService.createBoardConfig()
    gameState.pendingEffect = null
    gameStarted.value = false
    gameFinished.value = false
    turnCount.value = 0
    lastEffect.value = ''
    currentPunishment.value = null

    // 清除惩罚组合确认状态
    showPunishmentConfirmation.value = false
    punishmentCombinations.value = []
  }

  // 更新惩罚配置
  const updatePunishmentConfig = (config: PunishmentConfig) => {
    gameState.punishmentConfig = config
    // 重新创建棋盘以应用新的惩罚配置
    gameState.board = GameService.createBoard(config, gameState.boardConfig)
  }

  // 更新棋盘配置
  const updateBoardConfig = (config: BoardConfig) => {
    gameState.boardConfig = config
    // 重新创建棋盘以应用新的棋盘配置
    gameState.board = GameService.createBoard(gameState.punishmentConfig, config)
  }

  // 开始游戏
  const startGame = () => {
    // 检查是否已生成惩罚组合
    if (gameState.gameStatus === 'settings') {
      // 如果还在设置页面，先生成惩罚组合
      generatePunishmentCombinations()
      return
    }

    gameState.gameStatus = 'waiting'
    gameStarted.value = true
    if (turnCount.value === 0) {
      turnCount.value = 1
    }
  }

  // 重置游戏
  const resetGame = () => {
    initializeGame()
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
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    const diceValue = gameState.diceValue
    if (!diceValue) return

    const fromPosition = currentPlayer.position

    const {
      newPosition,
      effect,
      punishment,
      targetPlayerIndex,
      cellEffect,
      canTakeOff,
      executorIndex,
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
      return
    }

    // 检查是否有起飞惩罚
    if (punishment && executorIndex !== undefined) {
      currentTakeoffPunishment.value = punishment
      currentTakeoffDiceValue.value = diceValue
      currentTakeoffExecutorIndex.value = executorIndex
      showTakeoffPunishmentDisplay.value = true
      return // 等待用户处理起飞惩罚
    }

    // 检查是否有普通惩罚
    if (punishment) {
      currentPunishment.value = punishment
      gameState.gameStatus = 'configuring'
      return // 等待用户处理惩罚
    }

    // 检查是否有需要显示效果的非惩罚格子
    if (
      cellEffect &&
      (cellEffect.type === 'move' || cellEffect.type === 'reverse' || cellEffect.type === 'restart')
    ) {
      // 如果到达第1格（飞机场），不显示效果确认弹窗
      if (newPosition === 1) {
        // 直接继续游戏流程
        await continueAfterMove()
        return
      }

      gameState.pendingEffect = cellEffect
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
      const effectWithPath = {
        ...cellEffect,
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
  }

  // 确认效果（第二步：处理格子效果）
  const confirmEffect = async () => {
    if (!gameState.pendingEffect) return

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
      return
    }

    // 继续游戏流程
    await continueAfterMove()
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
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]

    // 检查是否获胜
    if (GameService.checkWinner(currentPlayer, gameState.board.length)) {
      currentPlayer.isWinner = true
      gameState.winner = currentPlayer
      gameState.gameStatus = 'finished'
      gameFinished.value = true
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
  }

  // 确认惩罚
  const confirmPunishment = async () => {
    currentPunishment.value = null
    gameState.gameStatus = 'waiting'

    // 继续游戏流程
    await continueAfterPunishment()
  }

  // 跳过惩罚
  const skipPunishment = async () => {
    currentPunishment.value = null
    gameState.gameStatus = 'waiting'

    // 继续游戏流程
    await continueAfterPunishment()
  }

  // 惩罚后的继续流程
  const continueAfterPunishment = async () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]

    // 检查是否获胜
    if (GameService.checkWinner(currentPlayer, gameState.board.length)) {
      currentPlayer.isWinner = true
      gameState.winner = currentPlayer
      gameState.gameStatus = 'finished'
      gameFinished.value = true
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

  // 在setup中添加handleBackToPunishmentSettings方法
  const handleBackToPunishmentSettings = () => {
    showPunishmentConfirmation.value = false
    gameState.gameStatus = 'settings'
  }

  // 组件挂载时初始化游戏
  onMounted(() => {
    initializeGame()
  })
</script>

<template>
  <div class="app">
    <!-- 开始页面 -->
    <IntroPage v-if="gameState.gameStatus === 'intro'" @start="showBoardSettings" />

    <!-- 棋盘设置页面 -->
    <div v-else-if="gameState.gameStatus === 'board_settings'" class="settings-page">
      <div class="page-container">
        <div class="settings-header">
          <h2>🎯 棋盘设置</h2>
          <p>配置游戏中各种类型格子的数量</p>
        </div>

        <BoardConfigPanel :config="gameState.boardConfig" @update="updateBoardConfig" />

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
          <button class="btn-primary" @click="startGame">
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
        <!-- 骰子区域 - 移到顶部 -->
        <div class="dice-section">
          <Dice :can-roll="canRollDice" :value="gameState.diceValue" @roll="handleDiceRoll" />
        </div>

        <GameControls
          :game-started="gameStarted"
          :game-finished="gameFinished"
          :game-status="gameState.gameStatus"
          :turn-count="turnCount"
          :winner="gameState.winner"
          @start="startGame"
        />

        <GameBoard
          :board="gameState.board"
          :players="gameState.players"
          :current-player-index="gameState.currentPlayerIndex"
          :last-effect="lastEffect"
          @cell-click="handleCellClick"
        />
      </main>

      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
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
      :punishment="currentTakeoffPunishment!"
      :dice-value="currentTakeoffDiceValue"
      :executor-name="gameState.players[currentTakeoffExecutorIndex]?.name || '未知玩家'"
      @confirm="confirmTakeoffPunishment"
    />

    <!-- 版本显示组件 -->
    <VersionDisplay />
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
    gap: clamp(0.15rem, 0.5vw, 0.25rem);
    width: 100%;
  }

  .dice-section {
    text-align: center;
    margin-bottom: clamp(0.25rem, 1vw, 0.5rem);
  }

  /* 按钮样式 */
  .btn-primary,
  .btn-secondary {
    display: flex;
    align-items: center;
    gap: clamp(0.25rem, 1vw, 0.5rem);
    padding: clamp(0.5rem, 2vw, 0.8rem) clamp(1rem, 3vw, 1.5rem);
    font-size: clamp(0.85rem, 2.5vw, 1rem);
    font-weight: bold;
    border: none;
    border-radius: clamp(4px, 1vw, 8px);
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    min-height: clamp(36px, 8vw, 44px);
  }

  .btn-primary {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
    color: white;
    box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
  }

  .btn-icon {
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
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
  }
</style>
