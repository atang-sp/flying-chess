<template>
  <div class="game-board">
    <div class="board-container">
      <div class="board-grid">
        <div 
          v-for="cell in boardCells" 
          :key="cell.id"
          class="board-cell"
          :class="getCellClass(cell)"
          @click="handleCellClick(cell)"
        >
          <div class="cell-number">{{ cell.position }}</div>
          <div v-if="cell.effect" class="cell-effect">
            <span v-if="cell.type === 'ladder'" class="ladder-icon">{{ CELL_ICONS.ladder }}</span>
            <span v-else-if="cell.type === 'snake'" class="snake-icon">{{ CELL_ICONS.snake }}</span>
            <span v-else-if="cell.type === 'special'" class="special-icon">{{ CELL_ICONS.special }}</span>
          </div>
        </div>
      </div>
      
      <!-- 玩家棋子 -->
      <div 
        v-for="player in players" 
        :key="player.id"
        class="player-token"
        :class="{ 'current-player': currentPlayerIndex === player.id - 1 }"
        :style="getPlayerPosition(player)"
      >
        <div 
          class="token"
          :style="{ backgroundColor: player.color }"
        ></div>
        <div class="player-name">{{ player.name }}</div>
      </div>
    </div>
    
    <!-- 游戏信息面板 -->
    <div class="game-info">
      <div v-if="currentPlayer" class="current-player-info">
        <h3>当前玩家</h3>
        <div class="player-display">
          <div 
            class="player-avatar"
            :style="{ backgroundColor: currentPlayer.color }"
          ></div>
          <span>{{ currentPlayer.name }}</span>
        </div>
        <p>位置: {{ currentPlayer.position }}</p>
      </div>
      
      <div v-if="lastEffect" class="effect-info">
        <h4>上一步效果</h4>
        <p>{{ lastEffect }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Player, BoardCell } from '../types/game';
import { GameService } from '../services/gameService';
import { CELL_ICONS, CELL_COLORS, GAME_CONFIG } from '../config/gameConfig';

interface Props {
  board: BoardCell[];
  players: Player[];
  currentPlayerIndex: number;
  lastEffect?: string;
}

interface Emits {
  (e: 'cellClick', cell: BoardCell): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const boardCells = computed(() => {
  // 将棋盘格子按蛇形排列（从下到上，从左到右）
  const cells = [...props.board];
  const rows = GAME_CONFIG.BOARD.GRID_SIZE;
  const cols = GAME_CONFIG.BOARD.GRID_SIZE;
  const arranged: BoardCell[] = [];
  
  for (let row = rows - 1; row >= 0; row--) {
    const rowCells = [];
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (index < cells.length) {
        rowCells.push(cells[index]);
      }
    }
    // 偶数行反转
    if (row % 2 === 0) {
      rowCells.reverse();
    }
    arranged.push(...rowCells);
  }
  
  return arranged;
});

const currentPlayer = computed(() => {
  if (props.players.length === 0 || props.currentPlayerIndex < 0 || props.currentPlayerIndex >= props.players.length) {
    return null;
  }
  return props.players[props.currentPlayerIndex];
});

const getCellClass = (cell: BoardCell) => {
  return {
    'cell-ladder': cell.type === 'ladder',
    'cell-snake': cell.type === 'snake',
    'cell-special': cell.type === 'special',
    'cell-normal': cell.type === 'normal'
  };
};

const getPlayerPosition = (player: Player) => {
  if (player.position === 0) {
    return { display: 'none' }; // 起始位置不显示
  }
  
  const { row, col } = GameService.getPlayerDisplayPosition(player.position);
  if (row === -1 || col === -1) {
    return { display: 'none' };
  }
  
  return {
    left: `${col * 10}%`,
    bottom: `${row * 10}%`
  };
};

const handleCellClick = (cell: BoardCell) => {
  emit('cellClick', cell);
};
</script>

<style scoped>
.game-board {
  display: flex;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.board-container {
  position: relative;
  width: 600px;
  height: 600px;
  border: 3px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  width: 100%;
  height: 100%;
}

.board-cell {
  position: relative;
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.board-cell:hover {
  background: #f0f0f0;
  transform: scale(1.05);
  z-index: 10;
}

.cell-number {
  font-size: 0.8rem;
  font-weight: bold;
  color: #666;
  position: absolute;
  top: 2px;
  left: 2px;
}

.cell-effect {
  font-size: 1.2rem;
  margin-top: 0.5rem;
}

.cell-ladder {
  background: linear-gradient(135deg, #a8e6cf, #88d8c0);
  border-color: #4ecdc4;
}

.cell-snake {
  background: linear-gradient(135deg, #ffb3ba, #ff8a95);
  border-color: #ff6b6b;
}

.cell-special {
  background: linear-gradient(135deg, #ffd93d, #ffb347);
  border-color: #ffa726;
}

.player-token {
  position: absolute;
  width: 40px;
  height: 40px;
  transform: translate(-50%, 50%);
  transition: all 0.5s ease;
  z-index: 20;
}

.player-token.current-player {
  z-index: 25;
  animation: pulse 2s infinite;
}

.token {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  margin: 0 auto;
}

.player-name {
  font-size: 0.7rem;
  text-align: center;
  margin-top: 2px;
  color: #333;
  font-weight: bold;
  text-shadow: 1px 1px 1px white;
}

.game-info {
  flex: 1;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.current-player-info h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.player-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.player-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #333;
}

.effect-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #4ecdc4;
}

.effect-info h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.effect-info p {
  margin: 0;
  color: #666;
  font-style: italic;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, 50%) scale(1); }
  50% { transform: translate(-50%, 50%) scale(1.1); }
}

@media (max-width: 768px) {
  .game-board {
    flex-direction: column;
  }
  
  .board-container {
    width: 100%;
    max-width: 400px;
    height: 400px;
  }
  
  .cell-number {
    font-size: 0.6rem;
  }
  
  .cell-effect {
    font-size: 1rem;
  }
}
</style> 