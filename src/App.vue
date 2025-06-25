<template>
  <div class="app">
    <!-- 开始页面 -->
    <IntroPage 
      v-if="gameState.gameStatus === 'intro'"
      @start="showInstructions"
    />
    
    <!-- 游戏说明页面 -->
    <div v-else-if="gameState.gameStatus === 'instructions'" class="instructions-page">
      <div class="page-container">
        <GameInstructions />
        <div class="page-actions">
          <button @click="showSettings" class="btn-primary">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">下一步：设置惩罚</span>
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
          <button @click="showInstructions" class="btn-secondary">
            <span class="btn-icon">⬅️</span>
            <span class="btn-text">返回说明</span>
          </button>
          <button @click="generatePunishmentCombinations" class="btn-primary" :disabled="!isConfigValid">
            <span class="btn-icon">🎯</span>
            <span class="btn-text">生成惩罚组合</span>
          </button>
        </div>
        
        <div v-if="punishmentCombinations.length > 0" class="page-actions">
          <p class="combinations-info">已生成 {{ punishmentCombinations.length }} 个惩罚组合，点击开始游戏继续</p>
          <button @click="startGame" class="btn-primary">
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
        <GameControls
          :gameStarted="gameStarted"
          :gameFinished="gameFinished"
          :gameStatus="gameState.gameStatus"
          :turnCount="turnCount"
          :winner="gameState.winner"
          @start="startGame"
          @pause="pauseGame"
          @reset="resetGame"
        />

        <GameBoard
          :board="gameState.board"
          :players="gameState.players"
          :currentPlayerIndex="gameState.currentPlayerIndex"
          :lastEffect="lastEffect"
          @cellClick="handleCellClick"
        />

        <Dice
          :canRoll="canRollDice"
          :value="gameState.diceValue"
          @roll="handleDiceRoll"
        />
      </main>

      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
        @confirm="confirmPunishment"
        @skip="skipPunishment"
      />
    </div>
    
    <!-- 惩罚组合确认弹窗 -->
    <PunishmentConfirmation
      :show="showPunishmentConfirmation"
      :combinations="punishmentCombinations"
      @confirm="confirmPunishmentCombinations"
      @regenerate="generatePunishmentCombinations"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { GameService } from './services/gameService';
import { GAME_CONFIG } from './config/gameConfig';
import type { GameState, Player, BoardCell, PunishmentConfig, PunishmentAction } from './types/game';
import IntroPage from './components/IntroPage.vue';
import GameInstructions from './components/GameInstructions.vue';
import GameControls from './components/GameControls.vue';
import GameBoard from './components/GameBoard.vue';
import Dice from './components/Dice.vue';
import PunishmentConfigPanel from './components/PunishmentConfig.vue';
import PunishmentDisplay from './components/PunishmentDisplay.vue';
import PunishmentConfirmation from './components/PunishmentConfirmation.vue';

// 游戏状态
const gameState = reactive<GameState>({
  players: [],
  currentPlayerIndex: 0,
  diceValue: null,
  gameStatus: 'intro', // 从开始页面开始
  winner: null,
  board: [],
  punishmentConfig: GameService.createPunishmentConfig()
});

// 游戏控制状态
const gameStarted = ref(false);
const gameFinished = ref(false);
const turnCount = ref(0);
const lastEffect = ref<string>('');
const isPaused = ref(false);
const currentPunishment = ref<PunishmentAction | null>(null);

// 惩罚组合确认状态
const showPunishmentConfirmation = ref(false);
const punishmentCombinations = ref<PunishmentAction[]>([]);

// 计算属性
const canRollDice = computed(() => {
  return gameStarted.value && 
         !gameFinished.value && 
         !isPaused.value && 
         gameState.gameStatus === 'waiting' &&
         !currentPunishment.value;
});

const isConfigValid = computed(() => {
  return GameService.validatePunishmentConfig(gameState.punishmentConfig);
});

// 页面导航
const showInstructions = () => {
  gameState.gameStatus = 'instructions';
};

const showSettings = () => {
  gameState.gameStatus = 'settings';
};

// 初始化游戏
const initializeGame = () => {
  gameState.players = GameService.createPlayers();
  gameState.board = GameService.createBoard();
  gameState.currentPlayerIndex = 0;
  gameState.diceValue = null;
  gameState.gameStatus = 'intro';
  gameState.winner = null;
  gameState.punishmentConfig = GameService.createPunishmentConfig();
  gameStarted.value = false;
  gameFinished.value = false;
  turnCount.value = 0;
  lastEffect.value = '';
  isPaused.value = false;
  currentPunishment.value = null;
  
  // 清除惩罚组合确认状态
  showPunishmentConfirmation.value = false;
  punishmentCombinations.value = [];
};

// 更新惩罚配置
const updatePunishmentConfig = (config: PunishmentConfig) => {
  gameState.punishmentConfig = config;
};

// 开始游戏
const startGame = () => {
  // 检查是否已生成惩罚组合
  if (gameState.gameStatus === 'settings') {
    // 如果还在设置页面，先生成惩罚组合
    generatePunishmentCombinations();
    return;
  }
  
  gameState.gameStatus = 'waiting';
  gameStarted.value = true;
  if (turnCount.value === 0) {
    turnCount.value = 1;
  }
};

// 暂停游戏
const pauseGame = () => {
  isPaused.value = !isPaused.value;
  if (isPaused.value) {
    gameState.gameStatus = 'waiting';
  }
};

// 重置游戏
const resetGame = () => {
  initializeGame();
};

// 处理骰子滚动
const handleDiceRoll = async () => {
  if (!canRollDice.value) return;

  gameState.gameStatus = 'rolling';
  gameState.diceValue = GameService.rollDice();

  // 等待骰子动画完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  gameState.gameStatus = 'moving';
  
  // 移动玩家
  await moveCurrentPlayer();
};

// 移动当前玩家
const moveCurrentPlayer = async () => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const diceValue = gameState.diceValue!;
  
  const { newPosition, effect, punishment, targetPlayerIndex } = GameService.movePlayer(
    currentPlayer, 
    diceValue, 
    gameState.board,
    gameState.currentPlayerIndex,
    gameState.players.length
  );

  // 更新玩家位置
  currentPlayer.position = newPosition;
  
  // 显示效果信息
  if (effect) {
    lastEffect.value = effect;
  }

  // 检查是否有惩罚
  if (punishment) {
    currentPunishment.value = punishment;
    gameState.gameStatus = 'configuring';
    return; // 等待用户处理惩罚
  }

  // 检查是否获胜
  if (GameService.checkWinner(currentPlayer)) {
    currentPlayer.isWinner = true;
    gameState.winner = currentPlayer;
    gameState.gameStatus = 'finished';
    gameFinished.value = true;
    return;
  }

  // 等待移动动画完成
  await new Promise(resolve => setTimeout(resolve, 500));

  // 切换到下一个玩家
  gameState.currentPlayerIndex = GameService.getNextPlayer(
    gameState.currentPlayerIndex, 
    gameState.players.length
  );
  
  turnCount.value++;
  gameState.diceValue = null;
  gameState.gameStatus = 'waiting';
  
  // 清除上一步效果
  setTimeout(() => {
    lastEffect.value = '';
  }, 2000);
};

// 确认惩罚
const confirmPunishment = async () => {
  currentPunishment.value = null;
  gameState.gameStatus = 'waiting';
  
  // 继续游戏流程
  await continueAfterPunishment();
};

// 跳过惩罚
const skipPunishment = async () => {
  currentPunishment.value = null;
  gameState.gameStatus = 'waiting';
  
  // 继续游戏流程
  await continueAfterPunishment();
};

// 惩罚后的继续流程
const continueAfterPunishment = async () => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // 检查是否获胜
  if (GameService.checkWinner(currentPlayer)) {
    currentPlayer.isWinner = true;
    gameState.winner = currentPlayer;
    gameState.gameStatus = 'finished';
    gameFinished.value = true;
    return;
  }

  // 等待移动动画完成
  await new Promise(resolve => setTimeout(resolve, 500));

  // 切换到下一个玩家
  gameState.currentPlayerIndex = GameService.getNextPlayer(
    gameState.currentPlayerIndex, 
    gameState.players.length
  );
  
  turnCount.value++;
  gameState.diceValue = null;
  gameState.gameStatus = 'waiting';
  
  // 清除上一步效果
  setTimeout(() => {
    lastEffect.value = '';
  }, 2000);
};

// 处理格子点击（可选功能）
const handleCellClick = (cell: BoardCell) => {
  console.log('点击格子:', cell);
  // 可以在这里添加查看格子详情的功能
};

// 生成惩罚组合
const generatePunishmentCombinations = () => {
  // 计算需要的惩罚组合数量：普通惩罚格子 + 动态惩罚格子
  const punishmentCellCount = Object.keys(GAME_CONFIG.PUNISHMENT_CELLS).length;
  const dynamicPunishmentCellCount = Object.keys(GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS).length;
  const totalPunishmentCells = punishmentCellCount + dynamicPunishmentCellCount;
  
  punishmentCombinations.value = GameService.generatePunishmentCombinations(gameState.punishmentConfig, totalPunishmentCells);
  showPunishmentConfirmation.value = true;
};

// 确认惩罚组合
const confirmPunishmentCombinations = (combinations: PunishmentAction[]) => {
  showPunishmentConfirmation.value = false;
  
  // 根据确认的组合更新棋盘
  gameState.board = GameService.updateBoardWithConfirmedCombinations(gameState.board, combinations);
  
  // 直接开始游戏流程
  gameState.gameStatus = 'waiting';
  gameStarted.value = true;
  if (turnCount.value === 0) {
    turnCount.value = 1;
  }
};

// 组件挂载时初始化游戏
onMounted(() => {
  initializeGame();
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 说明页面样式 */
.instructions-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.page-container {
  max-width: 800px;
  width: 100%;
}

.page-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.combinations-info {
  text-align: center;
  color: white;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 设置页面样式 */
.settings-page {
  min-height: 100vh;
  padding: 2rem;
}

.settings-header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.settings-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.settings-header p {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

/* 游戏页面样式 */
.game-page {
  min-height: 100vh;
  padding: 0.5rem;
}

.game-header {
  text-align: center;
  color: white;
  margin-bottom: 1rem;
}

.game-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.game-header p {
  margin: 0;
  font-size: 1rem;
  opacity: 0.9;
}

.game-main {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.game-footer {
  text-align: center;
  color: white;
  margin-top: 2rem;
  opacity: 0.7;
}

/* 按钮样式 */
.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
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
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .instructions-page,
  .settings-page {
    padding: 0.5rem;
  }
  
  .settings-header h2 {
    font-size: 1.8rem;
  }
  
  .game-header h1 {
    font-size: 1.6rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.7rem 1.2rem;
    font-size: 0.9rem;
  }
  
  .game-page {
    padding: 0.25rem;
  }
  
  .game-main {
    gap: 0.25rem;
  }
}

@media (max-width: 480px) {
  .settings-header h2 {
    font-size: 1.5rem;
  }
  
  .game-header h1 {
    font-size: 1.4rem;
  }
  
  .game-header p {
    font-size: 0.9rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
