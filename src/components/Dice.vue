<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { GAME_CONFIG } from '../config/gameConfig'

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

  // 骰子点数对应的点阵布局 (3x3网格，索引0-8)
  // 布局如下:
  // 0 1 2
  // 3 4 5
  // 6 7 8
  const dotPatterns: Record<number, number[]> = {
    1: [4], // 中心一个点
    2: [0, 8], // 左上角和右下角
    3: [0, 4, 8], // 左上角、中心、右下角
    4: [0, 2, 6, 8], // 四个角
    5: [0, 2, 4, 6, 8], // 四个角加中心
    6: [0, 2, 3, 5, 6, 8], // 两列各三个点
  }

  const getDots = (value: number): number[] => {
    return dotPatterns[value] || dotPatterns[1]
  }

  const handleRoll = () => {
    if (!props.canRoll || isRolling.value) return

    isRolling.value = true
    rollCount.value++

    // 触发滚动事件
    emit('roll')

    // 等待动画完成
    setTimeout(() => {
      isRolling.value = false
    }, GAME_CONFIG.DICE.ANIMATION_DURATION)
  }

  // 监听value变化，重置滚动状态
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
</script>

<template>
  <div class="dice-container">
    <div
      class="dice"
      :class="{
        rolling: isRolling,
        'can-roll': canRoll && !isRolling,
        rolled: !canRoll && !isRolling && value !== null,
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
        <span>点击骰子开始</span>
      </div>
    </div>

    <div class="dice-controls">
      <button
        :disabled="!canRoll || isRolling"
        class="roll-button"
        :class="{ disabled: !canRoll || isRolling }"
        @click="handleRoll"
      >
        <span class="button-icon">🎲</span>
        <span class="button-text">{{ isRolling ? '滚动中...' : '投骰子' }}</span>
      </button>
    </div>
  </div>
</template>

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
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    margin: 2rem 0;
    perspective: 1200px;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  }

  .dice:hover:not(.rolling) {
    transform: scale(1.08) rotateX(8deg) rotateY(8deg);
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
  }

  .dice.rolling {
    animation: enhancedRoll 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.5));
  }

  .dice.can-roll {
    animation: readyBounce 2s ease-in-out infinite;
  }

  .dice.rolled {
    animation: settleDown 1s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    0%,
    100% {
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
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
    border: 3px solid #dee2e6;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 0 15px rgba(0, 0, 0, 0.08),
      inset 0 2px 4px rgba(255, 255, 255, 0.8),
      0 6px 12px rgba(0, 0, 0, 0.25),
      0 12px 24px rgba(0, 0, 0, 0.15);
    backface-visibility: hidden;
    transform-style: preserve-3d;
    transition: all 0.3s ease;
  }

  .dice-face::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    right: 3px;
    bottom: 3px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.7) 50%,
      rgba(255, 255, 255, 0.4) 100%
    );
    border-radius: 13px;
    z-index: 1;
  }

  .dice-face::after {
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
    border-radius: 16px;
    z-index: 3;
    opacity: 0.8;
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
    width: 14px;
    height: 14px;
    background: radial-gradient(circle at 25% 25%, #ff4757, #ff3742, #c44569);
    border-radius: 50%;
    box-shadow:
      0 3px 6px rgba(0, 0, 0, 0.4),
      0 1px 3px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1);
    margin: auto;
    transform: translateZ(2px);
    transition: all 0.3s ease;
  }

  .dice:hover .dot {
    transform: translateZ(3px) scale(1.05);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.5),
      inset 0 -1px 1px rgba(0, 0, 0, 0.15);
  }

  .dot:nth-child(1) {
    grid-area: 1 / 1;
  }
  .dot:nth-child(2) {
    grid-area: 1 / 2;
  }
  .dot:nth-child(3) {
    grid-area: 1 / 3;
  }
  .dot:nth-child(4) {
    grid-area: 2 / 1;
  }
  .dot:nth-child(5) {
    grid-area: 2 / 2;
  }
  .dot:nth-child(6) {
    grid-area: 2 / 3;
  }
  .dot:nth-child(7) {
    grid-area: 3 / 1;
  }
  .dot:nth-child(8) {
    grid-area: 3 / 2;
  }
  .dot:nth-child(9) {
    grid-area: 3 / 3;
  }

  /* 3D 骰子面定位 - 增强3D效果 */
  .front {
    transform: rotateY(0deg) translateZ(40px);
  }
  .back {
    transform: rotateY(180deg) translateZ(40px);
  }
  .right {
    transform: rotateY(90deg) translateZ(40px);
  }
  .left {
    transform: rotateY(-90deg) translateZ(40px);
  }
  .top {
    transform: rotateX(90deg) translateZ(40px);
  }
  .bottom {
    transform: rotateX(-90deg) translateZ(40px);
  }

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

  .roll-button {
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

  .button-icon {
    font-size: 1.1rem;
  }

  /* 增强的动画效果 */
  @keyframes enhancedRoll {
    0% {
      transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1) translateY(0px);
    }
    15% {
      transform: rotateX(270deg) rotateY(180deg) rotateZ(90deg) scale(1.15) translateY(-10px);
    }
    30% {
      transform: rotateX(540deg) rotateY(360deg) rotateZ(180deg) scale(1.08) translateY(-5px);
    }
    45% {
      transform: rotateX(810deg) rotateY(540deg) rotateZ(270deg) scale(1.2) translateY(-15px);
    }
    60% {
      transform: rotateX(1080deg) rotateY(720deg) rotateZ(360deg) scale(1.05) translateY(-8px);
    }
    75% {
      transform: rotateX(1350deg) rotateY(900deg) rotateZ(450deg) scale(1.12) translateY(-12px);
    }
    85% {
      transform: rotateX(1530deg) rotateY(1020deg) rotateZ(510deg) scale(1.03) translateY(-3px);
    }
    95% {
      transform: rotateX(1710deg) rotateY(1140deg) rotateZ(570deg) scale(1.08) translateY(-6px);
    }
    100% {
      transform: rotateX(1800deg) rotateY(1200deg) rotateZ(600deg) scale(1) translateY(0px);
    }
  }

  @keyframes readyBounce {
    0%,
    100% {
      transform: translateY(0) scale(1) rotateX(0deg) rotateY(0deg);
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
    }
    25% {
      transform: translateY(-12px) scale(1.05) rotateX(8deg) rotateY(8deg);
      filter: drop-shadow(0 16px 24px rgba(0, 0, 0, 0.4));
    }
    50% {
      transform: translateY(-18px) scale(1.08) rotateX(0deg) rotateY(0deg);
      filter: drop-shadow(0 20px 32px rgba(0, 0, 0, 0.5));
    }
    75% {
      transform: translateY(-12px) scale(1.05) rotateX(-8deg) rotateY(-8deg);
      filter: drop-shadow(0 16px 24px rgba(0, 0, 0, 0.4));
    }
  }

  @keyframes settleDown {
    0% {
      transform: scale(1.2) rotateX(20deg) rotateY(20deg) translateY(-10px);
      filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.6));
    }
    30% {
      transform: scale(1.1) rotateX(10deg) rotateY(10deg) translateY(-5px);
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
    }
    60% {
      transform: scale(0.95) rotateX(-5deg) rotateY(-5deg) translateY(2px);
      filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3));
    }
    80% {
      transform: scale(1.02) rotateX(2deg) rotateY(2deg) translateY(-1px);
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
    }
    100% {
      transform: scale(1) rotateX(0deg) rotateY(0deg) translateY(0px);
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
    }
  }

  /* 脉冲高亮动画 */
  @keyframes highlightPulse {
    0%,
    100% {
      transform: translateX(-50%) scale(1);
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
    }
    50% {
      transform: translateX(-50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .dice-container {
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .dice {
      width: clamp(60px, 15vw, 70px);
      height: clamp(60px, 15vw, 70px);
      margin: 1rem 0;
    }

    .dice-result-highlight {
      width: clamp(45px, 12vw, 50px);
      height: clamp(45px, 12vw, 50px);
      bottom: -15px;
    }

    .result-number {
      font-size: clamp(1.2rem, 3vw, 1.3rem);
    }

    .result-label {
      font-size: clamp(0.6rem, 1.5vw, 0.7rem);
    }

    .dice-face {
      border-radius: 8px;
      border-width: 1px;
    }

    .dice-face::before {
      border-radius: 7px;
    }

    .dice-face::after {
      border-radius: 8px;
    }

    .dots {
      gap: 2px;
      padding: 6px;
    }

    .dot {
      width: clamp(8px, 2vw, 10px);
      height: clamp(8px, 2vw, 10px);
    }

    .dice-info {
      gap: 0.3rem;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .rolling-text,
    .result-text,
    .roll-prompt {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      gap: 0.3rem;
    }

    .rolling-icon,
    .result-icon,
    .prompt-icon {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .dice-controls {
      gap: 0.5rem;
      flex-direction: column;
      width: 100%;
      max-width: 200px;
    }

    .roll-button {
      padding: clamp(0.5rem, 2vw, 0.6rem) clamp(1rem, 3vw, 1.2rem);
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      border-radius: 6px;
      min-height: clamp(36px, 8vw, 40px);
      gap: clamp(0.3rem, 1vw, 0.4rem);
    }

    .button-icon {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .button-text {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }
  }

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .dice-container {
      gap: 0.4rem;
      padding: 0.4rem;
    }

    .dice {
      width: clamp(50px, 12vw, 60px);
      height: clamp(50px, 12vw, 60px);
      margin: 0.75rem 0;
    }

    .dice-result-highlight {
      width: clamp(40px, 10vw, 45px);
      height: clamp(40px, 10vw, 45px);
      bottom: -12px;
    }

    .result-number {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
    }

    .result-label {
      font-size: clamp(0.5rem, 1.2vw, 0.6rem);
    }

    .dots {
      gap: 1px;
      padding: 4px;
    }

    .dot {
      width: clamp(6px, 1.5vw, 8px);
      height: clamp(6px, 1.5vw, 8px);
    }

    .dice-info {
      padding: 0.4rem;
    }

    .rolling-text,
    .result-text,
    .roll-prompt {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      gap: 0.25rem;
    }

    .rolling-icon,
    .result-icon,
    .prompt-icon {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .dice-controls {
      gap: 0.4rem;
      max-width: 180px;
    }

    .roll-button {
      padding: clamp(0.4rem, 1.8vw, 0.5rem) clamp(0.8rem, 2.5vw, 1rem);
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      min-height: clamp(32px, 7vw, 36px);
      gap: clamp(0.25rem, 0.8vw, 0.3rem);
    }

    .button-icon {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .button-text {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .dice-container {
      gap: 0.3rem;
      padding: 0.3rem;
    }

    .dice {
      width: clamp(45px, 10vw, 50px);
      height: clamp(45px, 10vw, 50px);
      margin: 0.5rem 0;
    }

    .dice-result-highlight {
      width: clamp(35px, 8vw, 40px);
      height: clamp(35px, 8vw, 40px);
      bottom: -10px;
    }

    .result-number {
      font-size: clamp(0.9rem, 2.2vw, 1rem);
    }

    .result-label {
      font-size: clamp(0.45rem, 1vw, 0.5rem);
    }

    .dots {
      gap: 1px;
      padding: 3px;
    }

    .dot {
      width: clamp(5px, 1.2vw, 6px);
      height: clamp(5px, 1.2vw, 6px);
    }

    .dice-info {
      padding: 0.3rem;
    }

    .rolling-text,
    .result-text,
    .roll-prompt {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      gap: 0.2rem;
    }

    .rolling-icon,
    .result-icon,
    .prompt-icon {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .dice-controls {
      gap: 0.3rem;
      max-width: 160px;
    }

    .roll-button {
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      min-height: clamp(28px, 6vw, 32px);
      gap: clamp(0.2rem, 0.6vw, 0.25rem);
    }

    .button-icon {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .button-text {
      font-size: clamp(0.65rem, 1.5vw, 0.7rem);
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .dice-container {
      gap: 0.3rem;
      padding: 0.3rem;
    }

    .dice {
      width: clamp(50px, 12vw, 60px);
      height: clamp(50px, 12vw, 60px);
      margin: 0.5rem 0;
    }

    .dice-result-highlight {
      width: clamp(40px, 10vw, 45px);
      height: clamp(40px, 10vw, 45px);
      bottom: -12px;
    }

    .result-number {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
    }

    .result-label {
      font-size: clamp(0.5rem, 1.2vw, 0.6rem);
    }

    .dots {
      gap: 1px;
      padding: 4px;
    }

    .dot {
      width: clamp(6px, 1.5vw, 8px);
      height: clamp(6px, 1.5vw, 8px);
    }

    .dice-info {
      padding: 0.3rem;
    }

    .rolling-text,
    .result-text,
    .roll-prompt {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      gap: 0.2rem;
    }

    .rolling-icon,
    .result-icon,
    .prompt-icon {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .dice-controls {
      gap: 0.3rem;
      max-width: 160px;
    }

    .roll-button {
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      min-height: clamp(28px, 6vw, 32px);
      gap: clamp(0.2rem, 0.6vw, 0.25rem);
    }

    .button-icon {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .button-text {
      font-size: clamp(0.65rem, 1.5vw, 0.7rem);
    }
  }
</style>
