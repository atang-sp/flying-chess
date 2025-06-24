<template>
  <div class="app">
    <header class="app-header">
      <h1>🎲 飞行棋游戏</h1>
      <p>经典蛇梯棋游戏，支持多人轮流对战</p>
    </header>

    <main class="app-main">
      <GameInstructions />
      
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

      <PlayerPanel
        :players="gameState.players"
        :currentPlayerIndex="gameState.currentPlayerIndex"
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

    <footer class="app-footer">
      <p>使用 Vue 3 + TypeScript 构建</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { GameService } from './services/gameService';
import type { GameState, Player, BoardCell } from './types/game';
import GameInstructions from './components/GameInstructions.vue';
import GameControls from './components/GameControls.vue';
import PlayerPanel from './components/PlayerPanel.vue';
import GameBoard from './components/GameBoard.vue';
import Dice from './components/Dice.vue';

// 游戏状态
const gameState = reactive<GameState>({
  players: [],
  currentPlayerIndex: 0,
  diceValue: null,
  gameStatus: 'waiting',
  winner: null,
  board: []
});

// 游戏控制状态
const gameStarted = ref(false);
const gameFinished = ref(false);
const turnCount = ref(0);
const lastEffect = ref<string>('');
const isPaused = ref(false);

// 计算属性
const canRollDice = computed(() => {
  return gameStarted.value && 
         !gameFinished.value && 
         !isPaused.value && 
         gameState.gameStatus === 'waiting';
});

// 初始化游戏
const initializeGame = () => {
  gameState.players = GameService.createPlayers();
  gameState.board = GameService.createBoard();
  gameState.currentPlayerIndex = 0;
  gameState.diceValue = null;
  gameState.gameStatus = 'waiting';
  gameState.winner = null;
  gameStarted.value = false;
  gameFinished.value = false;
  turnCount.value = 0;
  lastEffect.value = '';
  isPaused.value = false;
};

// 开始游戏
const startGame = () => {
  gameStarted.value = true;
  gameState.gameStatus = 'waiting';
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
  
  const { newPosition, effect } = GameService.movePlayer(
    currentPlayer, 
    diceValue, 
    gameState.board
  );

  // 更新玩家位置
  currentPlayer.position = newPosition;
  
  // 显示效果信息
  if (effect) {
    lastEffect.value = effect;
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

// 处理格子点击（可选功能）
const handleCellClick = (cell: BoardCell) => {
  console.log('点击格子:', cell);
  // 可以在这里添加查看格子详情的功能
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
  padding: 1rem;
}

.app-header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.app-header p {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.app-footer {
  text-align: center;
  color: white;
  margin-top: 2rem;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .app {
    padding: 0.5rem;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .app-header p {
    font-size: 1rem;
  }
}
</style>
