<template>
  <div class="dice-container">
    <div 
      class="dice"
      :class="{ 
        'rolling': isRolling,
        'can-roll': canRoll && !isRolling,
        'rolled': !canRoll && !isRolling && value !== null,
        'shake-enabled': shakeEnabled
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
    
    <!-- 突出显示骰子点数 -->
    <div v-if="value !== null && !isRolling" class="dice-result-highlight">
      <div class="result-number">{{ value }}</div>
      <div class="result-label">点</div>
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
        <span>{{ shakeEnabled ? '摇动手机或点击骰子' : '点击骰子开始' }}</span>
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
      
      <!-- 摇动功能开关 -->
      <button 
        @click="toggleShake"
        class="shake-toggle-button"
        :class="{ 'active': shakeEnabled }"
        title="开启/关闭摇动手机掷骰子"
      >
        <span class="button-icon">{{ shakeEnabled ? '📱' : '📱' }}</span>
        <span class="button-text">{{ shakeEnabled ? '摇动已开启' : '开启摇动' }}</span>
      </button>
    </div>
    
    <!-- 摇动提示 -->
    <div v-if="shakeEnabled && !isRolling && canRoll" class="shake-hint">
      <span class="hint-icon">📱</span>
      <span>摇动手机来掷骰子</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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
const shakeEnabled = ref(false);
const shakeThreshold = 15; // 摇动阈值
const shakeTimeout = ref<number | null>(null);
const lastShakeTime = ref(0);
const shakeCooldown = 1000; // 摇动冷却时间(ms)

// 摇动检测相关变量
let lastX: number | null = null;
let lastY: number | null = null;
let lastZ: number | null = null;
let shakeCount = 0;

// 骰子点数对应的点阵布局
const dotPatterns: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const getDots = (value: number): number[] => {
  return dotPatterns[value] || dotPatterns[1];
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

// 摇动检测函数
const handleDeviceMotion = (event: DeviceMotionEvent) => {
  if (!shakeEnabled.value || isRolling.value || !props.canRoll) return;
  
  const currentTime = Date.now();
  if (currentTime - lastShakeTime.value < shakeCooldown) return;
  
  const acceleration = event.accelerationIncludingGravity;
  if (!acceleration) return;
  
  const { x, y, z } = acceleration;
  
  // 检查坐标值是否有效
  if (x === null || y === null || z === null) return;
  
  if (lastX !== null && lastY !== null && lastZ !== null) {
    const deltaX = Math.abs(x - lastX);
    const deltaY = Math.abs(y - lastY);
    const deltaZ = Math.abs(z - lastZ);
    
    const totalDelta = deltaX + deltaY + deltaZ;
    
    if (totalDelta > shakeThreshold) {
      shakeCount++;
      
      if (shakeCount >= 3) { // 需要连续摇动3次才触发
        handleRoll();
        shakeCount = 0;
        lastShakeTime.value = currentTime;
      }
    } else {
      // 重置摇动计数
      shakeCount = 0;
    }
  }
  
  lastX = x;
  lastY = y;
  lastZ = z;
};

// 切换摇动功能
const toggleShake = () => {
  shakeEnabled.value = !shakeEnabled.value;
  
  if (shakeEnabled.value) {
    // 请求设备运动权限
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      (DeviceMotionEvent as any).requestPermission().then((permission: string) => {
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
        } else {
          shakeEnabled.value = false;
          alert('需要设备运动权限才能使用摇动功能');
        }
      });
    } else {
      // 对于不支持权限请求的设备，直接添加监听器
      window.addEventListener('devicemotion', handleDeviceMotion);
    }
  } else {
    window.removeEventListener('devicemotion', handleDeviceMotion);
  }
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

// 组件挂载时初始化
onMounted(() => {
  // 检查设备是否支持摇动功能
  if (typeof DeviceMotionEvent !== 'undefined') {
    console.log('设备支持摇动检测');
  }
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('devicemotion', handleDeviceMotion);
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
  perspective: 1000px;
}

.dice:hover {
  transform: scale(1.05) rotateX(5deg) rotateY(5deg);
}

.dice.rolling {
  animation: roll 3s ease-in-out infinite;
}

.dice.can-roll {
  animation: bounce 2s ease-in-out infinite;
}

.dice.rolled {
  animation: settle 0.8s ease-out;
}

.dice.shake-enabled {
  animation: shakeHint 2s ease-in-out infinite;
}

/* 突出显示骰子点数 */
.dice-result-highlight {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  animation: highlightPulse 2s ease-in-out infinite;
  z-index: 10;
}

.result-number {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.result-label {
  font-size: 0.8rem;
  opacity: 0.9;
}

@keyframes highlightPulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  }
  50% {
    transform: translateX(-50%) scale(1.1);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
  }
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
  box-shadow: 
    inset 0 0 10px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.2),
    0 8px 16px rgba(0, 0, 0, 0.1);
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

.dice-face::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
  border-radius: 10px;
  z-index: 1;
}

.dice-face::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
  border-radius: 12px;
  z-index: 3;
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
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  margin: auto;
  transform: translateZ(1px);
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

/* 3D 骰子面定位 - 增强3D效果 */
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
  flex-wrap: wrap;
  justify-content: center;
}

.roll-button,
.shake-toggle-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.roll-button {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
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

.shake-toggle-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.shake-toggle-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.shake-toggle-button.active {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
}

.shake-toggle-button.active:hover {
  box-shadow: 0 6px 16px rgba(240, 147, 251, 0.4);
}

.button-icon {
  font-size: 1.1rem;
}

.shake-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  animation: shakeHint 2s ease-in-out infinite;
}

.hint-icon {
  font-size: 1rem;
}

/* 动画 */
@keyframes roll {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1);
  }
  10% {
    transform: rotateX(180deg) rotateY(90deg) rotateZ(45deg) scale(1.1);
  }
  20% {
    transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg) scale(1.05);
  }
  30% {
    transform: rotateX(540deg) rotateY(270deg) rotateZ(135deg) scale(1.15);
  }
  40% {
    transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg) scale(1.08);
  }
  50% {
    transform: rotateX(900deg) rotateY(450deg) rotateZ(225deg) scale(1.12);
  }
  60% {
    transform: rotateX(1080deg) rotateY(540deg) rotateZ(270deg) scale(1.06);
  }
  70% {
    transform: rotateX(1260deg) rotateY(630deg) rotateZ(315deg) scale(1.1);
  }
  80% {
    transform: rotateX(1440deg) rotateY(720deg) rotateZ(360deg) scale(1.04);
  }
  90% {
    transform: rotateX(1620deg) rotateY(810deg) rotateZ(405deg) scale(1.08);
  }
  100% {
    transform: rotateX(1800deg) rotateY(900deg) rotateZ(450deg) scale(1);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0) scale(1) rotateX(0deg) rotateY(0deg);
  }
  25% {
    transform: translateY(-8px) scale(1.03) rotateX(5deg) rotateY(5deg);
  }
  50% {
    transform: translateY(-12px) scale(1.05) rotateX(0deg) rotateY(0deg);
  }
  75% {
    transform: translateY(-8px) scale(1.03) rotateX(-5deg) rotateY(-5deg);
  }
}

@keyframes settle {
  0% {
    transform: scale(1.15) rotateX(15deg) rotateY(15deg);
  }
  50% {
    transform: scale(1.08) rotateX(8deg) rotateY(8deg);
  }
  100% {
    transform: scale(1) rotateX(0deg) rotateY(0deg);
  }
}

@keyframes shakeHint {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

/* 移动端适配 */
@media (max-width: 1023px) {
  .dice-container {
    padding: clamp(0.25rem, 1vw, 0.5rem);
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }
  
  .dice {
    width: clamp(45px, 12vw, 60px);
    height: clamp(45px, 12vw, 60px);
    margin: clamp(0.5rem, 2vw, 1rem) 0;
  }
  
  .dice-result-highlight {
    width: clamp(30px, 8vw, 40px);
    height: clamp(30px, 8vw, 40px);
    bottom: clamp(-6px, -1.5vw, -10px);
  }
  
  .result-number {
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  }
  
  .result-label {
    font-size: clamp(0.45rem, 1.2vw, 0.6rem);
  }
  
  .dice-info {
    font-size: clamp(0.75rem, 2.5vw, 0.9rem);
    gap: clamp(0.25rem, 0.8vw, 0.3rem);
  }
  
  .dice-controls {
    flex-direction: column;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }
  
  .roll-button,
  .shake-toggle-button {
    padding: clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.7rem, 2.5vw, 1rem);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    gap: clamp(0.25rem, 0.8vw, 0.3rem);
  }
  
  .button-icon {
    font-size: clamp(0.85rem, 2.5vw, 1rem);
  }
  
  .shake-hint {
    font-size: clamp(0.7rem, 2.5vw, 0.8rem);
    padding: clamp(0.25rem, 1vw, 0.4rem) clamp(0.5rem, 2vw, 0.8rem);
  }
}
</style> 