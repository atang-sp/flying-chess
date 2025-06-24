<template>
  <div class="dice-container">
    <div 
      class="dice"
      :class="{ 
        'rolling': isRolling,
        'can-roll': canRoll && !isRolling,
        'rolled': !canRoll && !isRolling && value !== null
      }"
      @click="handleRoll"
    >
      <div class="dice-face front">
        <div class="dots">
          <span v-for="i in getDots(value || 1)" :key="i" class="dot"></span>
        </div>
      </div>
      <div class="dice-face back">
        <div class="dots">
          <span v-for="i in getDots(6)" :key="i" class="dot"></span>
        </div>
      </div>
      <div class="dice-face right">
        <div class="dots">
          <span v-for="i in getDots(3)" :key="i" class="dot"></span>
        </div>
      </div>
      <div class="dice-face left">
        <div class="dots">
          <span v-for="i in getDots(4)" :key="i" class="dot"></span>
        </div>
      </div>
      <div class="dice-face top">
        <div class="dots">
          <span v-for="i in getDots(2)" :key="i" class="dot"></span>
        </div>
      </div>
      <div class="dice-face bottom">
        <div class="dots">
          <span v-for="i in getDots(5)" :key="i" class="dot"></span>
        </div>
      </div>
    </div>
    
    <div class="dice-info">
      <div v-if="isRolling" class="rolling-text">
        <span class="rolling-icon">🎲</span>
        <span>骰子滚动中...</span>
      </div>
      <div v-else-if="value !== null" class="result-text">
        <span class="result-icon">🎯</span>
        <span>点数: {{ value }}</span>
      </div>
      <div v-else class="roll-prompt">
        <span class="prompt-icon">👆</span>
        <span>点击骰子开始</span>
      </div>
    </div>
    
    <div class="dice-controls">
      <button 
        @click="handleRoll"
        :disabled="!canRoll || isRolling"
        class="roll-button"
        :class="{ 'disabled': !canRoll || isRolling }"
      >
        <span class="button-icon">🎲</span>
        <span class="button-text">{{ isRolling ? '滚动中...' : '投骰子' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { GAME_CONFIG } from '../config/gameConfig';

interface Props {
  canRoll: boolean;
  value: number | null;
}

interface Emits {
  (e: 'roll'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isRolling = ref(false);
const rollCount = ref(0);

// 骰子点数对应的点阵布局
const dotPatterns = {
  1: [[4]],
  2: [[0, 8]],
  3: [[0, 4, 8]],
  4: [[0, 2, 6, 8]],
  5: [[0, 2, 4, 6, 8]],
  6: [[0, 2, 3, 5, 6, 8]]
};

const getDots = (value: number): number[] => {
  return dotPatterns[value as keyof typeof dotPatterns] || dotPatterns[1];
};

const handleRoll = () => {
  if (!props.canRoll || isRolling.value) return;
  
  isRolling.value = true;
  rollCount.value++;
  
  // 触发滚动事件
  emit('roll');
  
  // 等待动画完成
  setTimeout(() => {
    isRolling.value = false;
  }, GAME_CONFIG.DICE.ANIMATION_DURATION);
};

// 监听value变化，重置滚动状态
watch(() => props.value, (newValue) => {
  if (newValue !== null && isRolling.value) {
    // 延迟重置，让用户看到结果
    setTimeout(() => {
      isRolling.value = false;
    }, 500);
  }
});
</script>

<style scoped>
.dice-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.dice {
  position: relative;
  width: 80px;
  height: 80px;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
  cursor: pointer;
  margin: 2rem 0;
}

.dice:hover {
  transform: scale(1.05);
}

.dice.rolling {
  animation: roll 2s ease-in-out infinite;
}

.dice.can-roll {
  animation: bounce 2s ease-in-out infinite;
}

.dice.rolled {
  animation: settle 0.5s ease-out;
}

.dice-face {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  border: 2px solid #dee2e6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
  backface-visibility: hidden;
}

.dice-face::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4));
  border-radius: 10px;
  z-index: 1;
}

.dots {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  padding: 8px;
  z-index: 2;
}

.dot {
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 30% 30%, #ff6b6b, #ee5a52);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  margin: auto;
}

.dot:nth-child(1) { grid-area: 1 / 1; }
.dot:nth-child(2) { grid-area: 1 / 2; }
.dot:nth-child(3) { grid-area: 1 / 3; }
.dot:nth-child(4) { grid-area: 2 / 1; }
.dot:nth-child(5) { grid-area: 2 / 2; }
.dot:nth-child(6) { grid-area: 2 / 3; }
.dot:nth-child(7) { grid-area: 3 / 1; }
.dot:nth-child(8) { grid-area: 3 / 2; }
.dot:nth-child(9) { grid-area: 3 / 3; }

/* 3D 骰子面定位 */
.front  { transform: rotateY(0deg) translateZ(40px); }
.back   { transform: rotateY(180deg) translateZ(40px); }
.right  { transform: rotateY(90deg) translateZ(40px); }
.left   { transform: rotateY(-90deg) translateZ(40px); }
.top    { transform: rotateX(90deg) translateZ(40px); }
.bottom { transform: rotateX(-90deg) translateZ(40px); }

.dice-info {
  text-align: center;
  color: white;
  font-weight: bold;
  font-size: 1.1rem;
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rolling-text,
.result-text,
.roll-prompt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.rolling-icon,
.result-icon,
.prompt-icon {
  font-size: 1.2rem;
}

.dice-controls {
  display: flex;
  gap: 1rem;
}

.roll-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.roll-button:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(78, 205, 196, 0.4);
}

.roll-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.button-icon {
  font-size: 1.1rem;
}

/* 动画 */
@keyframes roll {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  25% {
    transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg);
  }
  50% {
    transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg);
  }
  75% {
    transform: rotateX(1080deg) rotateY(540deg) rotateZ(270deg);
  }
  100% {
    transform: rotateX(1440deg) rotateY(720deg) rotateZ(360deg);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-10px) scale(1.05);
  }
}

@keyframes settle {
  0% {
    transform: scale(1.1) rotateX(10deg);
  }
  100% {
    transform: scale(1) rotateX(0deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dice {
    width: 60px;
    height: 60px;
  }
  
  .dice-face {
    border-radius: 8px;
  }
  
  .dot {
    width: 8px;
    height: 8px;
  }
  
  .dots {
    gap: 2px;
    padding: 6px;
  }
  
  .front  { transform: rotateY(0deg) translateZ(30px); }
  .back   { transform: rotateY(180deg) translateZ(30px); }
  .right  { transform: rotateY(90deg) translateZ(30px); }
  .left   { transform: rotateY(-90deg) translateZ(30px); }
  .top    { transform: rotateX(90deg) translateZ(30px); }
  .bottom { transform: rotateX(-90deg) translateZ(30px); }
  
  .dice-info {
    font-size: 1rem;
  }
  
  .roll-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .dice {
    width: 50px;
    height: 50px;
  }
  
  .dot {
    width: 6px;
    height: 6px;
  }
  
  .dots {
    gap: 1px;
    padding: 4px;
  }
  
  .front  { transform: rotateY(0deg) translateZ(25px); }
  .back   { transform: rotateY(180deg) translateZ(25px); }
  .right  { transform: rotateY(90deg) translateZ(25px); }
  .left   { transform: rotateY(-90deg) translateZ(25px); }
  .top    { transform: rotateX(90deg) translateZ(25px); }
  .bottom { transform: rotateX(-90deg) translateZ(25px); }
  
  .dice-info {
    font-size: 0.9rem;
  }
  
  .roll-button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
}
</style> 