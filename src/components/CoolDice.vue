<script setup lang="ts">
  import { ref, watch } from 'vue'

  interface Props {
    canRoll: boolean
    value: number | null
  }

  interface Emits {
    (e: 'roll'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const isRolling = ref(false)
  const rollCount = ref(0)

  const handleRoll = () => {
    if (!props.canRoll || isRolling.value) return

    isRolling.value = true
    rollCount.value++

    // 触发滚动事件
    emit('roll')

    // 等待动画完成
    setTimeout(() => {
      isRolling.value = false
    }, 2500)
  }

  watch(
    () => props.value,
    newValue => {
      if (newValue !== null && isRolling.value) {
        // 延迟重置，让用户看到结果
        setTimeout(() => {
          isRolling.value = false
        }, 500)
      }
    }
  )

  // 根据当前值确定显示的面
  const getCurrentFaceClass = () => {
    if (!props.value) return 'show-face-1'
    return `show-face-${props.value}`
  }
</script>

<template>
  <div class="cool-dice-container">
    <!-- 3D骰子 -->
    <div class="dice-scene">
      <div
        class="dice-cube"
        :class="{
          rolling: isRolling,
          'can-roll': canRoll && !isRolling,
          [getCurrentFaceClass()]: !isRolling,
        }"
        @click="handleRoll"
      >
        <!-- 面1: 中心一个点 -->
        <div class="face face-1">
          <div class="dot center"></div>
        </div>

        <!-- 面2: 对角两个点 -->
        <div class="face face-2">
          <div class="dot top-left"></div>
          <div class="dot bottom-right"></div>
        </div>

        <!-- 面3: 对角三个点 -->
        <div class="face face-3">
          <div class="dot top-left"></div>
          <div class="dot center"></div>
          <div class="dot bottom-right"></div>
        </div>

        <!-- 面4: 四角四个点 -->
        <div class="face face-4">
          <div class="dot top-left"></div>
          <div class="dot top-right"></div>
          <div class="dot bottom-left"></div>
          <div class="dot bottom-right"></div>
        </div>

        <!-- 面5: 四角加中心 -->
        <div class="face face-5">
          <div class="dot top-left"></div>
          <div class="dot top-right"></div>
          <div class="dot center"></div>
          <div class="dot bottom-left"></div>
          <div class="dot bottom-right"></div>
        </div>

        <!-- 面6: 两列各三个点 -->
        <div class="face face-6">
          <div class="column left">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          <div class="column right">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-if="value !== null && !isRolling" class="result-display">
      <div class="result-number">{{ value }}</div>
      <div class="result-label">点</div>
    </div>

    <!-- 状态信息 - 只在非移动端显示 -->
    <div class="dice-status desktop-status">
      <div v-if="isRolling" class="status-rolling">
        <span class="icon">🎲</span>
        <span>骰子滚动中...</span>
      </div>
      <div v-else-if="value !== null" class="status-result">
        <span class="icon">🎯</span>
        <span>点数: {{ value }}</span>
      </div>
      <div v-else-if="canRoll" class="status-prompt">
        <span class="icon">👆</span>
        <span>点击投掷骰子</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .cool-dice-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
  }

  .dice-scene {
    perspective: 1200px;
    perspective-origin: center center;
  }

  .dice-cube {
    position: relative;
    width: 100px;
    height: 100px;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    margin: 3rem;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
  }

  .dice-cube:hover:not(.rolling) {
    transform: scale(1.05) rotateX(5deg) rotateY(5deg);
    filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.4));
  }

  .dice-cube.can-roll {
    animation: float 3s ease-in-out infinite;
  }

  .dice-cube.rolling {
    animation: roll 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    filter: drop-shadow(0 15px 40px rgba(0, 0, 0, 0.5));
  }

  /* 骰子面 */
  .face {
    position: absolute;
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
    border: 4px solid #dee2e6;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 0 20px rgba(0, 0, 0, 0.1),
      inset 0 3px 6px rgba(255, 255, 255, 0.8),
      0 8px 16px rgba(0, 0, 0, 0.3),
      0 16px 32px rgba(0, 0, 0, 0.2);
    backface-visibility: hidden;
  }

  .face::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.3) 100%
    );
    border-radius: 16px;
    z-index: 1;
  }

  .face::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 20%,
      rgba(255, 255, 255, 0.4) 40%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.4) 60%,
      transparent 80%
    );
    border-radius: 20px;
    z-index: 3;
    opacity: 0.8;
  }

  /* 3D定位 */
  .face-1 {
    transform: rotateY(0deg) translateZ(50px);
  }
  .face-2 {
    transform: rotateY(90deg) translateZ(50px);
  }
  .face-3 {
    transform: rotateY(180deg) translateZ(50px);
  }
  .face-4 {
    transform: rotateY(-90deg) translateZ(50px);
  }
  .face-5 {
    transform: rotateX(90deg) translateZ(50px);
  }
  .face-6 {
    transform: rotateX(-90deg) translateZ(50px);
  }

  /* 点数样式 */
  .dot {
    width: 16px;
    height: 16px;
    background: radial-gradient(circle at 25% 25%, #ff4757, #ff3742, #c44569);
    border-radius: 50%;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1);
    z-index: 4;
    position: relative;
  }

  /* 点数布局 */
  .center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .top-left {
    position: absolute;
    top: 20%;
    left: 20%;
  }
  .top-right {
    position: absolute;
    top: 20%;
    right: 20%;
  }
  .bottom-left {
    position: absolute;
    bottom: 20%;
    left: 20%;
  }
  .bottom-right {
    position: absolute;
    bottom: 20%;
    right: 20%;
  }

  /* 面6的列布局 */
  .column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 4;
    position: relative;
  }
  .left {
    margin-right: 20px;
  }
  .right {
    margin-left: 20px;
  }

  /* 显示特定面的旋转 */
  .show-face-1 {
    transform: rotateY(0deg) rotateX(0deg);
  }
  .show-face-2 {
    transform: rotateY(-90deg) rotateX(0deg);
  }
  .show-face-3 {
    transform: rotateY(-180deg) rotateX(0deg);
  }
  .show-face-4 {
    transform: rotateY(90deg) rotateX(0deg);
  }
  .show-face-5 {
    transform: rotateY(0deg) rotateX(-90deg);
  }
  .show-face-6 {
    transform: rotateY(0deg) rotateX(90deg);
  }

  /* 动画 */
  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotateX(0deg) rotateY(0deg);
    }
    25% {
      transform: translateY(-10px) rotateX(5deg) rotateY(5deg);
    }
    50% {
      transform: translateY(-15px) rotateX(0deg) rotateY(0deg);
    }
    75% {
      transform: translateY(-10px) rotateX(-5deg) rotateY(-5deg);
    }
  }

  @keyframes roll {
    0% {
      transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1);
    }
    15% {
      transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg) scale(1.1);
    }
    30% {
      transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg) scale(1.05);
    }
    45% {
      transform: rotateX(1080deg) rotateY(540deg) rotateZ(270deg) scale(1.15);
    }
    60% {
      transform: rotateX(1440deg) rotateY(720deg) rotateZ(360deg) scale(1.08);
    }
    75% {
      transform: rotateX(1800deg) rotateY(900deg) rotateZ(450deg) scale(1.12);
    }
    85% {
      transform: rotateX(2070deg) rotateY(1035deg) rotateZ(517deg) scale(1.03);
    }
    95% {
      transform: rotateX(2250deg) rotateY(1125deg) rotateZ(562deg) scale(1.08);
    }
    100% {
      transform: rotateX(2340deg) rotateY(1170deg) rotateZ(585deg) scale(1);
    }
  }

  /* 结果显示 */
  .result-display {
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 2rem;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    animation: resultPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .result-number {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .result-label {
    font-size: 1rem;
    opacity: 0.9;
  }

  @keyframes resultPop {
    0% {
      transform: scale(0) rotate(180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(90deg);
      opacity: 0.8;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  /* 状态信息 */
  .dice-status {
    text-align: center;
    min-height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 移动端隐藏状态信息 */
  @media (max-width: 768px) {
    .desktop-status {
      display: none;
    }
  }

  .status-rolling,
  .status-result,
  .status-prompt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .status-rolling {
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .status-result {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .status-prompt {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  .icon {
    font-size: 1.2rem;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .cool-dice-container {
      padding: 1rem;
      gap: 1rem;
    }

    .dice-cube {
      width: 70px;
      height: 70px;
      margin: 1.5rem;
    }

    .face {
      width: 70px;
      height: 70px;
      border-radius: 14px;
    }

    .face-1,
    .face-2,
    .face-3,
    .face-4,
    .face-5,
    .face-6 {
      transform-origin: center;
    }
    .face-1 {
      transform: rotateY(0deg) translateZ(35px);
    }
    .face-2 {
      transform: rotateY(90deg) translateZ(35px);
    }
    .face-3 {
      transform: rotateY(180deg) translateZ(35px);
    }
    .face-4 {
      transform: rotateY(-90deg) translateZ(35px);
    }
    .face-5 {
      transform: rotateX(90deg) translateZ(35px);
    }
    .face-6 {
      transform: rotateX(-90deg) translateZ(35px);
    }

    .dot {
      width: 12px;
      height: 12px;
    }

    .result-display {
      padding: 0.5rem 1rem;
    }

    .result-number {
      font-size: 1.5rem;
    }

    .dice-status {
      font-size: 0.85rem;
    }
  }

  @media (max-width: 480px) {
    .cool-dice-container {
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .dice-cube {
      width: 60px;
      height: 60px;
      margin: 1rem;
    }

    .face {
      width: 60px;
      height: 60px;
      border-radius: 12px;
    }

    .face-1 {
      transform: rotateY(0deg) translateZ(30px);
    }
    .face-2 {
      transform: rotateY(90deg) translateZ(30px);
    }
    .face-3 {
      transform: rotateY(180deg) translateZ(30px);
    }
    .face-4 {
      transform: rotateY(-90deg) translateZ(30px);
    }
    .face-5 {
      transform: rotateX(90deg) translateZ(30px);
    }
    .face-6 {
      transform: rotateX(-90deg) translateZ(30px);
    }

    .dot {
      width: 10px;
      height: 10px;
    }

    .result-number {
      font-size: 1.3rem;
    }

    .dice-status {
      font-size: 0.8rem;
    }

    .status-rolling,
    .status-result,
    .status-prompt {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }
</style>
