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
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  gap: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.label {
  font-size: 0.9rem;
  color: #666;
}

.value {
  font-weight: bold;
  font-size: 1.1rem;
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
  padding: 2rem;
  background: linear-gradient(135deg, #fff8e1, #fffde7);
  border-radius: 8px;
  border: 2px solid #ffd700;
}

.game-over h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.game-over p {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  color: #666;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .game-controls {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .control-section {
    gap: 0.5rem;
  }
  
  .control-section h3 {
    font-size: 1.1rem;
  }
  
  .control-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-danger {
    width: 100%;
    padding: 0.8rem 1rem;
    font-size: 1rem;
    min-height: 44px;
  }
  
  .game-info {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
  
  .info-item {
    font-size: 0.9rem;
  }
  
  .winner-display {
    padding: 1rem;
  }
  
  .winner-display h2 {
    font-size: 1.5rem;
  }
  
  .winner-display p {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .game-controls {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .control-section h3 {
    font-size: 1rem;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-danger {
    padding: 0.7rem 0.8rem;
    font-size: 0.95rem;
    min-height: 42px;
  }
  
  .info-item {
    font-size: 0.85rem;
  }
  
  .winner-display {
    padding: 0.75rem;
  }
  
  .winner-display h2 {
    font-size: 1.3rem;
  }
  
  .winner-display p {
    font-size: 0.9rem;
  }
}
</style> 