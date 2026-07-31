<script setup lang="ts">
  import { Flame, Check } from '@lucide/vue'
  import type { Player } from '../types/game'

  interface Props {
    show: boolean
    instruction: string
    player?: Player | null
  }

  interface Emits {
    (e: 'confirm'): void
  }

  import { ref, watch } from 'vue'

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const submitted = ref(false)
  watch(() => props.show, (visible) => { if (visible) submitted.value = false })

  const confirm = () => { if (submitted.value) return; submitted.value = true; emit('confirm') }
</script>

<template>
  <div v-if="show" class="modal-overlay dare-overlay" @click.stop>
    <div class="dare-modal" @click.stop>
      <div class="dare-header">
        <div class="dare-icon">
          <Flame :size="48" />
        </div>
        <h2 class="dare-title">执行指令</h2>
        <p v-if="player" class="dare-player">
          <span class="player-dot" :style="{ backgroundColor: player.color }"></span>
          {{ player.name }}，请执行：
        </p>
      </div>

      <div class="dare-content">
        <div class="dare-instruction">
          <p>{{ instruction }}</p>
        </div>
      </div>

      <div class="dare-actions">
        <button class="btn dare-confirm-btn" :disabled="submitted" @click="confirm">
          <Check :size="18" />
          <span>已完成</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .dare-overlay {
    background: rgba(0, 0, 0, 0.85);
  }

  .dare-modal {
    background: rgba(20, 15, 5, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: var(--radius-xl);
    padding: 30px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow:
      var(--glass-shadow-lg),
      var(--glow-md) rgba(245, 158, 11, 0.2);
    animation: slideIn var(--transition-normal) ease-out;
  }

  .dare-header {
    margin-bottom: 20px;
  }

  .dare-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
    color: var(--color-dare, #f59e0b);
    animation: pulse 2s infinite;
  }

  .dare-title {
    color: var(--color-dare, #f59e0b);
    font-size: 1.8em;
    margin: 0 0 8px 0;
    text-shadow: var(--glow-sm) rgba(245, 158, 11, 0.5);
    font-weight: bold;
  }

  .dare-player {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    margin: 0;
    font-size: 1.1rem;
  }

  .player-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.25);
    flex-shrink: 0;
  }

  .dare-content {
    margin-bottom: 25px;
  }

  .dare-instruction {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-md);
    padding: 20px;
  }

  .dare-instruction p {
    color: var(--text-primary);
    font-size: 1.3em;
    font-weight: bold;
    margin: 0;
    line-height: 1.5;
  }

  .dare-actions {
    display: flex;
    justify-content: center;
  }

  .dare-confirm-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #b45309, #f59e0b);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
    padding: 12px 30px;
    font-size: 1.1em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  }

  .dare-confirm-btn:not(:disabled):hover {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
  }

  @keyframes slideIn {
    from {
      transform: translateY(-50px) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  @media (max-width: 768px) {
    .dare-modal {
      padding: 20px;
      margin: 20px;
    }

    .dare-icon :deep(svg) {
      width: 40px;
      height: 40px;
    }

    .dare-title {
      font-size: 1.5em;
    }

    .dare-instruction p {
      font-size: 1.1em;
    }
  }
</style>
