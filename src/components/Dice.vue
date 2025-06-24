<template>
  <div class="dice-container">
    <div 
      class="dice" 
      :class="{ 'rolling': isRolling }"
      @click="handleRoll"
    >
      <div class="dice-face">
        <div v-if="value" class="dice-value">{{ value }}</div>
        <div v-else class="dice-placeholder">?</div>
      </div>
    </div>
    <div class="dice-info">
      <p v-if="isRolling" class="rolling-text">骰子滚动中...</p>
      <p v-else-if="value" class="result-text">点数: {{ value }}</p>
      <p v-else class="instruction-text">点击骰子开始游戏</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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

const handleRoll = () => {
  if (!props.canRoll || isRolling.value) return;
  
  isRolling.value = true;
  emit('roll');
  
  // 模拟骰子滚动动画
  setTimeout(() => {
    isRolling.value = false;
  }, 1000);
};

// 监听value变化，重置滚动状态
watch(() => props.value, () => {
  if (props.value !== null) {
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
  margin: 2rem 0;
}

.dice {
  width: 80px;
  height: 80px;
  background: linear-gradient(145deg, #ffffff, #e6e6e6);
  border: 3px solid #333;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.dice:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.dice.rolling {
  animation: roll 0.5s infinite;
  cursor: not-allowed;
}

@keyframes roll {
  0% { transform: rotateX(0deg) rotateY(0deg); }
  25% { transform: rotateX(90deg) rotateY(45deg); }
  50% { transform: rotateX(180deg) rotateY(90deg); }
  75% { transform: rotateX(270deg) rotateY(135deg); }
  100% { transform: rotateX(360deg) rotateY(180deg); }
}

.dice-face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.dice-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.dice-placeholder {
  font-size: 1.5rem;
  color: #666;
  font-weight: bold;
}

.dice-info {
  text-align: center;
}

.rolling-text {
  color: #ff6b6b;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.result-text {
  color: #4ecdc4;
  font-weight: bold;
  font-size: 1.1rem;
}

.instruction-text {
  color: #666;
  font-style: italic;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style> 