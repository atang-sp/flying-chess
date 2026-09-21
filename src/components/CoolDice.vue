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

    // 等待动画完成 (1.1s 干脆利落)
    setTimeout(() => {
      isRolling.value = false
    }, 1100)
  }

  watch(
    () => props.value,
    newValue => {
      if (newValue !== null && isRolling.value) {
        // 延迟重置，让用户看到结果
        setTimeout(() => {
          isRolling.value = false
        }, 1000)
      }
    }
  )

  // 根据当前值确定显示的面
  const getCurrentFaceClass = () => {
    if (props.value == null) return 'show-face-1'
    return `show-face-${props.value}`
  }
</script>

<template>
  <div class="cool-dice-container">
    <!-- 3D骰子 -->
    <div class="dice-scene">
      <button
        type="button"
        class="dice-cube"
        :class="{
          rolling: isRolling,
          'can-roll': canRoll && !isRolling,
          [getCurrentFaceClass()]: !isRolling,
        }"
        :aria-label="isRolling ? '骰子滚动中' : canRoll ? '投掷骰子' : '当前不可投掷骰子'"
        :disabled="!canRoll || isRolling"
        @click="handleRoll"
      >
        <!-- 面1: 中心一个点 -->
        <span class="face face-1">
          <span class="dot center"></span>
        </span>

        <!-- 面2: 对角两个点 -->
        <span class="face face-2">
          <span class="dot top-left"></span>
          <span class="dot bottom-right"></span>
        </span>

        <!-- 面3: 对角三个点 -->
        <span class="face face-3">
          <span class="dot top-left"></span>
          <span class="dot center"></span>
          <span class="dot bottom-right"></span>
        </span>

        <!-- 面4: 四角四个点 -->
        <span class="face face-4">
          <span class="dot top-left"></span>
          <span class="dot top-right"></span>
          <span class="dot bottom-left"></span>
          <span class="dot bottom-right"></span>
        </span>

        <!-- 面5: 四角加中心 -->
        <span class="face face-5">
          <span class="dot top-left"></span>
          <span class="dot top-right"></span>
          <span class="dot center"></span>
          <span class="dot bottom-left"></span>
          <span class="dot bottom-right"></span>
        </span>

        <!-- 面6: 两列各三个点 -->
        <span class="face face-6">
          <span class="column left">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
          <span class="column right">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </span>
      </button>
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
    gap: 0.75rem;
    padding: 0.5rem;
    background: transparent;
  }

  .dice-scene {
    perspective: 1200px;
    perspective-origin: center center;
  }

  .dice-cube {
    position: relative;
    width: 100px;
    height: 100px;
    padding: 0;
    color: inherit;
    appearance: none;
    background: transparent;
    border: 0;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    margin: 1.5rem auto;
    filter: drop-shadow(0 6px 16px rgba(2, 18, 14, 0.45));
  }

  .dice-cube:hover:not(.rolling) {
    transform: scale(1.05) rotateX(5deg) rotateY(5deg);
    filter: drop-shadow(0 8px 20px rgba(212, 178, 114, 0.45));
  }

  .dice-cube:disabled {
    cursor: default;
  }

  .dice-cube:focus-visible {
    outline: 3px solid var(--color-accent-light);
    outline-offset: 8px;
  }

  .dice-cube.can-roll {
    animation: float 3s ease-in-out infinite;
  }

  .dice-cube.rolling {
    animation: roll 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    filter: drop-shadow(0 8px 24px rgba(212, 178, 114, 0.5));
  }

  /* 骰子面 - 象牙白温润质感 */
  .face {
    position: absolute;
    width: 100px;
    height: 100px;
    background: linear-gradient(145deg, #fefcf9 0%, #f7f1e6 55%, #eae0cf 100%);
    border: 1.5px solid rgba(214, 180, 118, 0.65);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 2px 4px rgba(255, 255, 255, 0.95),
      inset 0 -3px 6px rgba(160, 128, 78, 0.22),
      0 6px 18px rgba(1, 15, 12, 0.28);
    backface-visibility: hidden;
  }

  .face::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    border: 1px dashed rgba(206, 172, 108, 0.25);
    border-radius: 16px;
    z-index: 1;
    pointer-events: none;
  }

  .face::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.4) 0%,
      transparent 45%,
      rgba(170, 138, 88, 0.12) 100%
    );
    border-radius: 20px;
    z-index: 3;
    pointer-events: none;
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

  /* 点数样式 - 沉稳雕刻内凹质感 */
  .dot {
    width: 17px;
    height: 17px;
    background: #332617;
    border-radius: 50%;
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.6),
      0 1px 1px rgba(255, 255, 255, 0.75);
    z-index: 4;
    position: relative;
  }

  /* 面1 中心大红点 (传统朱砂点) */
  .face-1 .dot {
    width: 26px;
    height: 26px;
    background: radial-gradient(circle at 35% 35%, #e53935 0%, #b71c1c 75%, #880e4f 100%);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.45),
      0 0 6px rgba(229, 57, 53, 0.3),
      0 1px 1px rgba(255, 255, 255, 0.8);
  }

  /* 面4 四角红点 (传统中式中四) */
  .face-4 .dot {
    background: radial-gradient(circle at 35% 35%, #e53935 0%, #c62828 85%);
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.45),
      0 1px 1px rgba(255, 255, 255, 0.75);
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
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    padding: 1rem 2rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--glass-shadow);
    animation: resultPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .result-number {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .result-label {
    font-size: 1rem;
    color: var(--text-secondary);
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
    border-radius: var(--radius-md);
    font-weight: 600;
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    background: var(--bg-glass);
    color: var(--text-secondary);
  }

  .status-rolling {
    animation: pulse 1.5s ease-in-out infinite;
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
