<script setup lang="ts">
  import { ref } from 'vue'

  const props = defineProps<{
    disabled: boolean
    diceValue: number | null
  }>()

  const emit = defineEmits<{
    roll: []
  }>()

  const isAnimating = ref(false)

  function handleRoll(): void {
    if (props.disabled || isAnimating.value) return
    isAnimating.value = true
    if (navigator.vibrate) navigator.vibrate([30, 50, 30])
    emit('roll')
    setTimeout(() => {
      isAnimating.value = false
    }, 1200)
  }
</script>

<template>
  <button
    class="dice-area"
    :class="{ disabled, animating: isAnimating }"
    :disabled="disabled"
    @click="handleRoll"
  >
    <div class="dice-face" :class="{ rolling: isAnimating }">
      <span v-if="diceValue && !isAnimating" class="dice-value">{{ diceValue }}</span>
      <span v-else class="dice-value">🎲</span>
    </div>
    <span class="dice-label">{{ disabled ? '等待中' : '点击掷骰子' }}</span>
  </button>
</template>

<style scoped>
  .dice-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .dice-area:not(.disabled):active {
    transform: scale(0.95);
  }

  .dice-area.disabled {
    opacity: 0.4;
    cursor: default;
  }

  .dice-face {
    width: 80px;
    height: 80px;
    background: linear-gradient(145deg, #2a2a40, #1a1a2e);
    border: 2px solid rgba(225, 194, 127, 0.3);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transition: all 0.3s;
  }

  .dice-face.rolling {
    animation: dice-shake 0.6s ease-in-out 2;
    border-color: var(--color-accent, #e1c27f);
    box-shadow: 0 0 20px rgba(225, 194, 127, 0.3);
  }

  .dice-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-accent, #e1c27f);
    line-height: 1;
  }

  .dice-label {
    font-size: 0.8rem;
    color: var(--color-text-muted, #8a8780);
    font-weight: 500;
  }

  @keyframes dice-shake {
    0%,
    100% {
      transform: rotate(0deg) scale(1);
    }
    15% {
      transform: rotate(12deg) scale(1.05);
    }
    30% {
      transform: rotate(-10deg) scale(1.02);
    }
    45% {
      transform: rotate(8deg) scale(1.04);
    }
    60% {
      transform: rotate(-6deg) scale(1.01);
    }
    75% {
      transform: rotate(4deg) scale(1.03);
    }
  }
</style>
