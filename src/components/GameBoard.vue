<template>
  <div class="game-board">
    <div class="board-container">
      <!-- 螺旋蛇形棋盘布局 -->
      <div class="board-grid">
        <div v-for="(row, rowIdx) in spiralBoard" :key="'row-' + rowIdx" class="board-row">
          <div v-for="cellNum in row" :key="'cell-' + cellNum">
            <template v-if="typeof cellNum === 'number' && cellNum !== null">
              <div class="board-cell"
                :class="getCellClass(cellNum)"
                @click="handleCellClick(getCellByPosition(cellNum))"
                @mouseenter="showTooltip(getCellByPosition(cellNum), $event)"
                @mouseleave="hideTooltip"
              >
                <div class="cell-content">
                  <div class="cell-number">{{ cellNum }}</div>
                  <div class="cell-icon">{{ getCellIcon(cellNum) }}</div>
                  <div class="cell-effect">{{ getCellEffect(cellNum) }}</div>
                </div>
                <!-- 玩家标记 -->
                <div 
                  v-for="(player, index) in players" 
                  :key="`player-${player.id}`"
                  v-show="player.position === cellNum"
                  class="player-marker"
                  :style="{ backgroundColor: player.color }"
                  :class="{ 
                    'current-player': index === currentPlayerIndex,
                    'player-moving': player.isMoving
                  }"
                >
                  ✈️
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      
      <!-- 起始位置 -->
      <div class="start-position">
        <div 
          class="start-cell"
          @mouseenter="showTooltip(getCellByPosition(0), $event)"
          @mouseleave="hideTooltip"
        >
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
            :class="{ 
              'current-player': index === currentPlayerIndex,
              'player-moving': player.isMoving
            }"
          >
            ✈️
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

    <!-- 浮窗提示 -->
    <div 
      v-if="tooltipVisible" 
      class="cell-tooltip"
      :style="tooltipStyle"
    >
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span class="tooltip-number">{{ tooltipCell?.position || 0 }}</span>
          <span class="tooltip-type">{{ getCellTypeName(tooltipCell?.type || 'punishment') }}</span>
        </div>
        <div class="tooltip-body">
          <div v-if="tooltipCell?.effect" class="tooltip-effect">
            <div class="effect-title">{{ tooltipCell.effect.description }}</div>
            <div v-if="tooltipCell.effect.type === 'punishment' && tooltipCell.effect.punishment" class="punishment-details">
              <div class="detail-item">
                <span class="detail-label">工具：</span>
                <span class="detail-value">{{ tooltipCell.effect.punishment.tool.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">部位：</span>
                <span class="detail-value">{{ tooltipCell.effect.punishment.bodyPart.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">姿势：</span>
                <span class="detail-value">{{ tooltipCell.effect.punishment.position.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">数量：</span>
                <span class="detail-value">{{ tooltipCell.effect.punishment.strikes }}下</span>
              </div>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'move'" class="move-details">
              <div class="detail-item">
                <span class="detail-label">移动：</span>
                <span class="detail-value">{{ tooltipCell.effect.value > 0 ? '+' : '' }}{{ tooltipCell.effect.value }}步</span>
              </div>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'rest'" class="rest-details">
              <div class="detail-item">
                <span class="detail-label">休息：</span>
                <span class="detail-value">{{ tooltipCell.effect.value }}回合</span>
              </div>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'reverse'" class="reverse-details">
              <div class="detail-item">
                <span class="detail-label">后退：</span>
                <span class="detail-value">{{ tooltipCell.effect.value }}步</span>
              </div>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'restart'" class="restart-details">
              <div class="detail-item">
                <span class="detail-label">回到起点</span>
              </div>
            </div>
          </div>
          <div v-else class="tooltip-normal">
            <div class="normal-text">普通格子，无特殊效果</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { BoardCell, Player } from '../types/game';
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

// 浮窗状态
const tooltipVisible = ref(false);
const tooltipCell = ref<BoardCell | null>(null);
const tooltipStyle = ref({
  left: '0px',
  top: '0px'
});

// 螺旋蛇形棋盘生成
const spiralBoard = computed(() => {
  const rows = GAME_CONFIG.BOARD.GRID_SIZE.rows;
  const cols = GAME_CONFIG.BOARD.GRID_SIZE.cols;
  const spiral: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  
  let num = 1;
  let left = 0, right = cols - 1, top = 0, bottom = rows - 1;
  
  while (left <= right && top <= bottom && num <= GAME_CONFIG.BOARD.SIZE) {
    // 从左到右填充顶部行
    for (let j = left; j <= right && num <= GAME_CONFIG.BOARD.SIZE; j++) {
      spiral[top][j] = num++;
    }
    top++;
    
    // 从上到下填充右列
    for (let i = top; i <= bottom && num <= GAME_CONFIG.BOARD.SIZE; i++) {
      spiral[i][right] = num++;
    }
    right--;
    
    // 从右到左填充底部行（如果还有行）
    if (top <= bottom) {
      for (let j = right; j >= left && num <= GAME_CONFIG.BOARD.SIZE; j--) {
        spiral[bottom][j] = num++;
      }
      bottom--;
    }
    
    // 从下到上填充左列（如果还有列）
    if (left <= right) {
      for (let i = bottom; i >= top && num <= GAME_CONFIG.BOARD.SIZE; i--) {
        spiral[i][left] = num++;
      }
      left++;
    }
  }
  
  return spiral;
});

const getCellByPosition = (position: number): BoardCell => {
  return props.board.find(cell => cell.position === position) || {
    id: position,
    type: 'punishment',
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
  
  // 特殊处理休息格子
  if (cell.effect?.type === 'rest') {
    return '😴';
  }
  
  return CELL_ICONS[cell.type] || '';
};

const getCellEffect = (position: number): string => {
  const cell = getCellByPosition(position);
  return cell.effect?.description || '';
};

const getCellTypeName = (type: string): string => {
  const typeNames = {
    punishment: '惩罚格子',
    bonus: '前进格子',
    special: '后退格子',
    restart: '回到起点'
  };
  
  // 特殊处理休息格子
  if (type === 'special' && tooltipCell.value?.effect?.type === 'rest') {
    return '休息格子';
  }
  
  return typeNames[type as keyof typeof typeNames] || '惩罚格子';
};

const handleCellClick = (cell: BoardCell) => {
  emit('cellClick', cell);
};

const showTooltip = (cell: BoardCell, event: MouseEvent) => {
  tooltipCell.value = cell;
  tooltipVisible.value = true;
  
  // 计算浮窗位置
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const tooltipWidth = 250; // 预估浮窗宽度
  const tooltipHeight = 150; // 预估浮窗高度
  
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  let top = rect.top - tooltipHeight - 10;
  
  // 确保浮窗不超出屏幕边界
  if (left < 10) left = 10;
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }
  if (top < 10) {
    top = rect.bottom + 10;
  }
  
  tooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`
  };
};

const hideTooltip = () => {
  tooltipVisible.value = false;
  tooltipCell.value = null;
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
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  border-radius: 16px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.board-row {
  display: flex;
  gap: 0.5rem;
}

.board-cell {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.board-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0.25rem;
  text-align: center;
}

.cell-number {
  font-size: 0.7rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.1rem;
}

.cell-icon {
  font-size: 1rem;
  margin-bottom: 0.1rem;
}

.cell-effect {
  font-size: 0.5rem;
  color: #666;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 格子类型样式 */
.cell-punishment {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-color: #ff4757;
  color: white;
}

.cell-punishment .cell-number,
.cell-punishment .cell-effect {
  color: white;
}

.cell-bonus {
  background: linear-gradient(135deg, #2ed573, #1e90ff);
  border-color: #2ed573;
  color: white;
}

.cell-bonus .cell-number,
.cell-bonus .cell-effect {
  color: white;
}

.cell-special {
  background: linear-gradient(135deg, #ffa726, #ff9800);
  border-color: #ff7043;
  color: white;
}

.cell-special .cell-number,
.cell-special .cell-effect {
  color: white;
}

.cell-restart {
  background: linear-gradient(135deg, #ab47bc, #8e44ad);
  border-color: #9b59b6;
  color: white;
}

.cell-restart .cell-number,
.cell-restart .cell-effect {
  color: white;
}

.cell-occupied {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
}

/* 玩家标记 */
.player-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 10;
}

.player-marker.current-player {
  border-color: #ffd700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  animation: pulse 2s infinite;
}

.player-marker.player-moving {
  animation: moveAnimation 0.6s ease-in-out;
  transform: translate(-50%, -50%) scale(1.2);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
}

@keyframes moveAnimation {
  0% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 起始位置 */
.start-position {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.start-cell {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: 3px solid #5a67d8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.start-cell .cell-content {
  text-align: center;
}

.start-cell .cell-number {
  font-size: 0.8rem;
  color: white;
  margin-bottom: 0.2rem;
}

.start-cell .cell-icon {
  font-size: 1.5rem;
}

/* 蛇形路径指示器 */
.board-grid::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: 
    linear-gradient(90deg, transparent 0%, transparent 10%, rgba(78, 205, 196, 0.1) 10%, rgba(78, 205, 196, 0.1) 90%, transparent 90%, transparent 100%),
    linear-gradient(0deg, transparent 0%, transparent 10%, rgba(78, 205, 196, 0.1) 10%, rgba(78, 205, 196, 0.1) 90%, transparent 90%, transparent 100%);
  pointer-events: none;
  z-index: -1;
  border-radius: 16px;
}

/* 效果显示 */
.effect-display {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideDown 0.5s ease-out;
}

.effect-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.effect-icon {
  font-size: 1.2rem;
}

.effect-text {
  font-weight: bold;
}

/* 动画 */
@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 1023px) {
  .game-board {
    padding: clamp(0.25rem, 1vw, 0.5rem);
  }
  
  .board-container {
    max-width: 100%;
  }
  
  .board-grid {
    gap: clamp(0.25rem, 1vw, 0.5rem);
    padding: clamp(0.25rem, 1vw, 0.5rem);
  }
  
  .board-row {
    gap: clamp(0.15rem, 0.5vw, 0.25rem);
  }
  
  .board-cell {
    width: clamp(35px, 8vw, 40px);
    height: clamp(35px, 8vw, 40px);
    font-size: clamp(0.5rem, 1.5vw, 0.6rem);
  }
  
  .cell-number {
    font-size: clamp(0.45rem, 1.2vw, 0.5rem);
    font-weight: bold;
  }
  
  .cell-icon {
    font-size: clamp(0.6rem, 1.8vw, 0.7rem);
  }
  
  .cell-effect {
    font-size: clamp(0.35rem, 1vw, 0.4rem);
  }
  
  .player-marker {
    width: clamp(1rem, 2.5vw, 1.2rem);
    height: clamp(1rem, 2.5vw, 1.2rem);
    font-size: clamp(0.5rem, 1.5vw, 0.6rem);
    border: 1px solid white;
  }
  
  .start-cell {
    width: clamp(50px, 12vw, 60px);
    height: clamp(50px, 12vw, 60px);
  }
  
  .start-cell .cell-number {
    font-size: clamp(0.5rem, 1.5vw, 0.6rem);
  }
  
  .start-cell .cell-icon {
    font-size: clamp(1rem, 3vw, 1.2rem);
  }
}

/* 浮窗样式 */
.cell-tooltip {
  position: fixed;
  z-index: 10000;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 0;
  max-width: 280px;
  min-width: 200px;
  pointer-events: none;
  animation: tooltipFadeIn 0.2s ease-out;
}

.tooltip-content {
  padding: 1rem;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.tooltip-number {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.tooltip-type {
  font-size: 0.8rem;
  color: #666;
  background: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
}

.tooltip-body {
  font-size: 0.9rem;
}

.tooltip-effect {
  color: #333;
}

.effect-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.punishment-details,
.move-details,
.rest-details,
.reverse-details,
.restart-details {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-weight: 500;
  color: #555;
  min-width: 40px;
}

.detail-value {
  font-weight: bold;
  color: #2c3e50;
  text-align: right;
}

.tooltip-normal {
  text-align: center;
  color: #666;
  font-style: italic;
}

.normal-text {
  padding: 0.5rem;
}

/* 浮窗动画 */
@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式浮窗 */
@media (max-width: 768px) {
  .cell-tooltip {
    max-width: 240px;
    min-width: 180px;
  }
  
  .tooltip-content {
    padding: 0.75rem;
  }
  
  .tooltip-header {
    margin-bottom: 0.5rem;
  }
  
  .tooltip-number {
    font-size: 1rem;
  }
  
  .tooltip-type {
    font-size: 0.7rem;
  }
  
  .tooltip-body {
    font-size: 0.8rem;
  }
  
  .punishment-details,
  .move-details,
  .rest-details,
  .reverse-details,
  .restart-details {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .cell-tooltip {
    max-width: 200px;
    min-width: 160px;
  }
  
  .tooltip-content {
    padding: 0.5rem;
  }
  
  .tooltip-number {
    font-size: 0.9rem;
  }
  
  .tooltip-type {
    font-size: 0.6rem;
  }
  
  .tooltip-body {
    font-size: 0.75rem;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }
  
  .detail-label {
    min-width: auto;
  }
  
  .detail-value {
    text-align: left;
  }
}
</style> 