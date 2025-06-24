<template>
  <div class="game-board">
    <div class="board-container">
      <!-- 环形棋盘 -->
      <div class="circular-board">
        <!-- 外圈 -->
        <div class="outer-ring">
          <div 
            v-for="cell in outerRingCells" 
            :key="cell.id"
            class="board-cell outer-cell"
            :class="getCellClass(cell)"
            @click="handleCellClick(cell)"
          >
            <div class="cell-number">{{ cell.position }}</div>
            <div v-if="cell.effect" class="cell-effect">
              <span v-if="cell.type === 'punishment'" class="punishment-icon">{{ CELL_ICONS.punishment }}</span>
              <span v-else-if="cell.type === 'bonus'" class="bonus-icon">{{ CELL_ICONS.bonus }}</span>
              <span v-else-if="cell.type === 'special'" class="special-icon">{{ CELL_ICONS.special }}</span>
            </div>
            <div v-if="cell.effect" class="cell-description">
              {{ cell.effect.description }}
            </div>
          </div>
        </div>
        
        <!-- 内圈 -->
        <div class="inner-ring">
          <div 
            v-for="cell in innerRingCells" 
            :key="cell.id"
            class="board-cell inner-cell"
            :class="getCellClass(cell)"
            @click="handleCellClick(cell)"
          >
            <div class="cell-number">{{ cell.position }}</div>
            <div v-if="cell.effect" class="cell-effect">
              <span v-if="cell.type === 'punishment'" class="punishment-icon">{{ CELL_ICONS.punishment }}</span>
              <span v-else-if="cell.type === 'bonus'" class="bonus-icon">{{ CELL_ICONS.bonus }}</span>
              <span v-else-if="cell.type === 'special'" class="special-icon">{{ CELL_ICONS.special }}</span>
            </div>
            <div v-if="cell.effect" class="cell-description">
              {{ cell.effect.description }}
            </div>
          </div>
        </div>
        
        <!-- 中心 -->
        <div class="center-area">
          <div 
            v-for="cell in centerCells" 
            :key="cell.id"
            class="board-cell center-cell"
            :class="getCellClass(cell)"
            @click="handleCellClick(cell)"
          >
            <div class="cell-number">{{ cell.position }}</div>
            <div v-if="cell.effect" class="cell-effect">
              <span v-if="cell.type === 'punishment'" class="punishment-icon">{{ CELL_ICONS.punishment }}</span>
              <span v-else-if="cell.type === 'bonus'" class="bonus-icon">{{ CELL_ICONS.bonus }}</span>
              <span v-else-if="cell.type === 'special'" class="special-icon">{{ CELL_ICONS.special }}</span>
            </div>
            <div v-if="cell.effect" class="cell-description">
              {{ cell.effect.description }}
            </div>
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

// 将棋盘分为外圈、内圈、中心
const outerRingCells = computed(() => {
  return props.board.slice(0, 20); // 前20格
});

const innerRingCells = computed(() => {
  return props.board.slice(20, 28); // 21-28格
});

const centerCells = computed(() => {
  return props.board.slice(28, 30); // 29-30格
});

const currentPlayer = computed(() => {
  if (props.players.length === 0 || props.currentPlayerIndex < 0 || props.currentPlayerIndex >= props.players.length) {
    return null;
  }
  return props.players[props.currentPlayerIndex];
});

const getCellClass = (cell: BoardCell) => {
  return {
    'cell-punishment': cell.type === 'punishment',
    'cell-bonus': cell.type === 'bonus',
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
  
  // 根据环形布局计算位置
  if (player.position <= 20) {
    // 外圈：5x4布局
    const index = player.position - 1;
    const actualRow = Math.floor(index / 5);
    const actualCol = index % 5;
    return {
      left: `${(actualCol + 1) * 16.67}%`,
      top: `${(actualRow + 1) * 20}%`
    };
  } else if (player.position <= 28) {
    // 内圈：4x2布局
    const index = player.position - 21;
    const actualRow = Math.floor(index / 4) + 1;
    const actualCol = (index % 4) + 1;
    return {
      left: `${(actualCol + 1) * 16.67}%`,
      top: `${(actualRow + 1) * 20}%`
    };
  } else {
    // 中心：2x1布局
    const index = player.position - 29;
    return {
      left: `${(index + 2) * 16.67}%`,
      top: '60%'
    };
  }
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
  border-radius: 50%;
  overflow: hidden;
  background: #f8f9fa;
}

.circular-board {
  position: relative;
  width: 100%;
  height: 100%;
}

.outer-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 2px;
  padding: 10px;
}

.inner-ring {
  position: absolute;
  top: 20%;
  left: 20%;
  width: 60%;
  height: 60%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  padding: 10px;
}

.center-area {
  position: absolute;
  top: 40%;
  left: 40%;
  width: 20%;
  height: 20%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  padding: 5px;
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
  border-radius: 8px;
  min-height: 60px;
  font-size: 0.8rem;
}

.board-cell:hover {
  background: #f0f0f0;
  transform: scale(1.05);
  z-index: 10;
}

.outer-cell {
  min-height: 80px;
}

.inner-cell {
  min-height: 70px;
}

.center-cell {
  min-height: 60px;
}

.cell-number {
  font-size: 0.7rem;
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

.cell-description {
  font-size: 0.6rem;
  text-align: center;
  margin-top: 0.25rem;
  color: #333;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-punishment {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-color: #ff4757;
  color: white;
}

.cell-bonus {
  background: linear-gradient(135deg, #2ed573, #1e90ff);
  border-color: #2ed573;
  color: white;
}

.cell-special {
  background: linear-gradient(135deg, #ffd93d, #ffb347);
  border-color: #ffa726;
  color: white;
}

.player-token {
  position: absolute;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
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
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
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
  
  .cell-description {
    font-size: 0.5rem;
  }
}
</style> 