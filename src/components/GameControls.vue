<template>
  <div class="game-controls">
    <div class="control-buttons">
      <button 
        v-if="!gameStarted"
        @click="startGame"
        class="btn btn-primary"
      >
        🎮 开始游戏
      </button>
    </div>
    
    <div v-if="gameStarted" class="game-status">
      <div class="status-item">
        <span class="label">游戏状态:</span>
        <span class="value" :class="gameStatusClass">{{ gameStatusText }}</span>
      </div>
      <div class="status-item">
        <span class="label">回合数:</span>
        <span class="value">{{ turnCount }}</span>
      </div>
    </div>
    
    <div v-if="gameFinished" class="game-over">
      <h3>🎉 游戏结束！</h3>
      <p v-if="winner">{{ winner.name }} 获胜！</p>
      <button @click="resetGame" class="btn btn-primary">
        🎮 再来一局
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '../types/game';

interface Props {
  gameStarted: boolean;
  gameFinished: boolean;
  gameStatus: 'waiting' | 'rolling' | 'moving' | 'showing_effect' | 'finished' | 'configuring';
  turnCount: number;
  winner: Player | null;
}

interface Emits {
  (e: 'start'): void;
  (e: 'reset'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const gameStatusText = computed(() => {
  switch (props.gameStatus) {
    case 'waiting': return '等待玩家操作';
    case 'rolling': return '骰子滚动中';
    case 'moving': return '棋子移动中';
    case 'showing_effect': return '显示效果中';
    case 'finished': return '游戏结束';
    case 'configuring': return '配置中';
    default: return '未知状态';
  }
});

const gameStatusClass = computed(() => {
  return `status-${props.gameStatus}`;
});

const startGame = () => {
  emit('start');
};

const resetGame = () => {
  emit('reset');
};
</script>

<style scoped>
.game-controls {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.control-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: clamp(0.6rem, 2vw, 0.75rem) clamp(1.2rem, 3vw, 1.5rem);
  border: none;
  border-radius: clamp(4px, 1vw, 6px);
  font-size: clamp(0.9rem, 2.5vw, 1rem);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 1vw, 0.5rem);
  min-height: clamp(36px, 8vw, 44px);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ffa726, #ff9800);
  color: white;
}

.game-status {
  display: flex;
  justify-content: space-around;
  gap: clamp(1rem, 4vw, 2rem);
  padding: clamp(0.8rem, 2.5vw, 1rem);
  background: #f8f9fa;
  border-radius: clamp(4px, 1vw, 6px);
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.2rem, 0.5vw, 0.25rem);
}

.label {
  font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  color: #666;
}

.value {
  font-weight: bold;
  font-size: clamp(1rem, 3vw, 1.1rem);
}

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

.game-over {
  text-align: center;
  padding: clamp(1.5rem, 4vw, 2rem);
  background: linear-gradient(135deg, #fff8e1, #fffde7);
  border-radius: clamp(6px, 1.5vw, 8px);
  border: 2px solid #ffd700;
}

.game-over h3 {
  margin: 0 0 clamp(0.8rem, 2.5vw, 1rem) 0;
  color: #333;
  font-size: clamp(1.2rem, 4vw, 1.5rem);
}

.game-over p {
  margin: 0 0 clamp(1.2rem, 3vw, 1.5rem) 0;
  font-size: clamp(1rem, 3vw, 1.2rem);
  color: #666;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 移动端适配 */
@media (max-width: 1023px) {
  .game-controls {
    padding: clamp(0.5rem, 2vw, 0.75rem);
    margin-bottom: clamp(0.25rem, 1vw, 0.5rem);
  }
  
  .control-buttons {
    gap: clamp(0.4rem, 1vw, 0.5rem);
    margin-bottom: clamp(0.4rem, 1vw, 0.5rem);
  }
  
  .game-status {
    gap: clamp(0.75rem, 2vw, 1rem);
    padding: clamp(0.5rem, 2vw, 0.75rem);
  }
  
  .status-item {
    gap: clamp(0.15rem, 0.5vw, 0.2rem);
  }
  
  .game-over {
    padding: clamp(1rem, 3vw, 1.5rem);
  }
  
  .game-over h3 {
    margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
  }
  
  .game-over p {
    margin-bottom: clamp(0.75rem, 2vw, 1rem);
  }
}
</style> 