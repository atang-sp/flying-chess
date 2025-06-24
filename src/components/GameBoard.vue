<template>
  <div class="game-board">
    <div class="board-container">
      <!-- 环形棋盘布局 -->
      <div class="board-grid">
        <!-- 外圈：5x4的矩形 -->
        <div class="outer-ring">
          <div 
            v-for="i in 20" 
            :key="`outer-${i}`"
            class="board-cell outer-cell"
            :class="getCellClass(i)"
            @click="handleCellClick(getCellByPosition(i))"
          >
            <div class="cell-content">
              <div class="cell-number">{{ i }}</div>
              <div class="cell-icon">{{ getCellIcon(i) }}</div>
              <div class="cell-effect">{{ getCellEffect(i) }}</div>
            </div>
            <!-- 玩家标记 -->
            <div 
              v-for="(player, index) in players" 
              :key="`player-${player.id}`"
              v-show="player.position === i"
              class="player-marker"
              :style="{ backgroundColor: player.color }"
              :class="{ 'current-player': index === currentPlayerIndex }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
        
        <!-- 内圈：4x2的矩形 -->
        <div class="inner-ring">
          <div 
            v-for="i in 8" 
            :key="`inner-${i + 20}`"
            class="board-cell inner-cell"
            :class="getCellClass(i + 20)"
            @click="handleCellClick(getCellByPosition(i + 20))"
          >
            <div class="cell-content">
              <div class="cell-number">{{ i + 20 }}</div>
              <div class="cell-icon">{{ getCellIcon(i + 20) }}</div>
              <div class="cell-effect">{{ getCellEffect(i + 20) }}</div>
            </div>
            <!-- 玩家标记 -->
            <div 
              v-for="(player, index) in players" 
              :key="`player-${player.id}`"
              v-show="player.position === i + 20"
              class="player-marker"
              :style="{ backgroundColor: player.color }"
              :class="{ 'current-player': index === currentPlayerIndex }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
        
        <!-- 中心：2x1 -->
        <div class="center-ring">
          <div 
            v-for="i in 2" 
            :key="`center-${i + 28}`"
            class="board-cell center-cell"
            :class="getCellClass(i + 28)"
            @click="handleCellClick(getCellByPosition(i + 28))"
          >
            <div class="cell-content">
              <div class="cell-number">{{ i + 28 }}</div>
              <div class="cell-icon">{{ getCellIcon(i + 28) }}</div>
              <div class="cell-effect">{{ getCellEffect(i + 28) }}</div>
            </div>
            <!-- 玩家标记 -->
            <div 
              v-for="(player, index) in players" 
              :key="`player-${player.id}`"
              v-show="player.position === i + 28"
              class="player-marker"
              :style="{ backgroundColor: player.color }"
              :class="{ 'current-player': index === currentPlayerIndex }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 起始位置 -->
      <div class="start-position">
        <div class="start-cell">
          <div class="cell-content">
            <div class="cell-number">START</div>
            <div class="cell-icon">🚀</div>
          </div>
          <!-- 玩家标记 -->
          <div 
            v-for="(player, index) in players" 
            :key="`player-${player.id}`"
            v-show="player.position === 0"
            class="player-marker"
            :style="{ backgroundColor: player.color }"
            :class="{ 'current-player': index === currentPlayerIndex }"
          >
            {{ player.name.charAt(0) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 效果显示 -->
    <div v-if="lastEffect" class="effect-display">
      <div class="effect-content">
        <span class="effect-icon">✨</span>
        <span class="effect-text">{{ lastEffect }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BoardCell, Player } from '../types/game';
import { CELL_ICONS, CELL_COLORS } from '../config/gameConfig';

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

const getCellByPosition = (position: number): BoardCell => {
  return props.board.find(cell => cell.position === position) || {
    id: position,
    type: 'normal',
    position
  };
};

const getCellClass = (position: number): string => {
  const cell = getCellByPosition(position);
  const baseClass = `cell-${cell.type}`;
  const highlightClass = props.players.some(p => p.position === position) ? 'cell-occupied' : '';
  return `${baseClass} ${highlightClass}`.trim();
};

const getCellIcon = (position: number): string => {
  const cell = getCellByPosition(position);
  return CELL_ICONS[cell.type] || '';
};

const getCellEffect = (position: number): string => {
  const cell = getCellByPosition(position);
  return cell.effect?.description || '';
};

const handleCellClick = (cell: BoardCell) => {
  emit('cellClick', cell);
};
</script>

<style scoped>
.game-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.board-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.board-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.outer-ring {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.inner-ring {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.center-ring {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.board-cell {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.board-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

.cell-number {
  font-size: 0.8rem;
  font-weight: bold;
  color: #333;
  line-height: 1;
}

.cell-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.cell-effect {
  font-size: 0.6rem;
  color: #666;
  text-align: center;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 格子类型样式 */
.cell-normal {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-color: #dee2e6;
}

.cell-punishment {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-color: #ff4757;
  animation: pulse 2s infinite;
}

.cell-bonus {
  background: linear-gradient(135deg, #2ed573, #1e90ff);
  border-color: #2ed573;
  animation: glow 2s infinite;
}

.cell-special {
  background: linear-gradient(135deg, #ffd93d, #ffb347);
  border-color: #ffa726;
  animation: bounce 2s infinite;
}

.cell-occupied {
  border-color: #4ecdc4;
  border-width: 3px;
  box-shadow: 0 0 15px rgba(78, 205, 196, 0.5);
}

/* 玩家标记 */
.player-marker {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.current-player {
  animation: pulse 1s infinite;
  border-color: #4ecdc4;
  box-shadow: 0 0 10px rgba(78, 205, 196, 0.8);
}

/* 起始位置 */
.start-position {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

.start-cell {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.start-cell .cell-content {
  background: transparent;
  color: white;
  text-align: center;
}

.start-cell .cell-number {
  font-size: 0.6rem;
  color: white;
}

.start-cell .cell-icon {
  font-size: 1rem;
}

/* 效果显示 */
.effect-display {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideIn 0.5s ease;
}

.effect-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.1rem;
}

.effect-icon {
  font-size: 1.2rem;
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(46, 213, 115, 0.5); }
  50% { box-shadow: 0 0 20px rgba(46, 213, 115, 0.8); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .board-cell {
    width: 50px;
    height: 50px;
  }
  
  .cell-content {
    padding: 0.25rem;
  }
  
  .cell-number {
    font-size: 0.6rem;
  }
  
  .cell-icon {
    font-size: 0.8rem;
  }
  
  .cell-effect {
    display: none;
  }
  
  .player-marker {
    width: 18px;
    height: 18px;
    font-size: 0.6rem;
  }
  
  .start-cell {
    width: 40px;
    height: 40px;
  }
  
  .start-cell .cell-number {
    font-size: 0.4rem;
  }
  
  .start-cell .cell-icon {
    font-size: 0.6rem;
  }
  
  .board-grid {
    padding: 0.5rem;
  }
  
  .outer-ring,
  .inner-ring,
  .center-ring {
    gap: 0.25rem;
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .board-cell {
    width: 40px;
    height: 40px;
  }
  
  .cell-content {
    padding: 0.2rem;
  }
  
  .cell-number {
    font-size: 0.5rem;
  }
  
  .cell-icon {
    font-size: 0.7rem;
  }
  
  .player-marker {
    width: 16px;
    height: 16px;
    font-size: 0.5rem;
  }
  
  .start-cell {
    width: 35px;
    height: 35px;
  }
  
  .start-cell .cell-number {
    font-size: 0.35rem;
  }
  
  .start-cell .cell-icon {
    font-size: 0.5rem;
  }
  
  .board-grid {
    padding: 0.25rem;
  }
  
  .outer-ring,
  .inner-ring,
  .center-ring {
    gap: 0.2rem;
    padding: 0.25rem;
  }
  
  .effect-display {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style> 