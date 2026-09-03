<script setup lang="ts">
  import { MessageCircleQuestion, Check, Zap } from '@lucide/vue'
  import type { Player } from '@flying-chess/game-core/types'

  interface Props {
    show: boolean
    question: string
    player?: Player | null
  }

  interface Emits {
    (e: 'answer'): void
    (e: 'refuse'): void
  }

  import { ref, watch } from 'vue'

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const submitted = ref(false)
  watch(
    () => props.show,
    visible => {
      if (visible) submitted.value = false
    }
  )

  const answer = () => {
    if (submitted.value) return
    submitted.value = true
    emit('answer')
  }
  const refuse = () => {
    if (submitted.value) return
    submitted.value = true
    emit('refuse')
  }
</script>

<template>
  <div v-if="show" class="modal-overlay qa-overlay" @click.stop>
    <div class="qa-modal" @click.stop>
      <div class="qa-header">
        <div class="qa-icon">
          <MessageCircleQuestion :size="48" />
        </div>
        <h2 class="qa-title">问答时间</h2>
        <p v-if="player" class="qa-player">
          <span class="player-dot" :style="{ backgroundColor: player.color }"></span>
          {{ player.name }}，请回答：
        </p>
      </div>

      <div class="qa-content">
        <div class="qa-question">
          <p>{{ question }}</p>
        </div>
      </div>

      <div class="qa-actions">
        <button class="btn qa-answer-btn" :disabled="submitted" @click="answer">
          <Check :size="18" />
          <span>已回答</span>
        </button>
        <button class="btn qa-refuse-btn" :disabled="submitted" @click="refuse">
          <Zap :size="18" />
          <span>拒绝回答（接受惩罚）</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .qa-overlay {
    background: rgba(0, 0, 0, 0.85);
  }

  .qa-modal {
    background: rgba(10, 15, 30, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: var(--radius-xl);
    padding: 30px;
    max-width: 500px;
    width: 100%;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    overflow-wrap: anywhere;
    overscroll-behavior: contain;
    text-align: center;
    box-shadow:
      var(--glass-shadow-lg),
      var(--glow-md) rgba(59, 130, 246, 0.2);
    animation: slideIn var(--transition-normal) ease-out;
  }

  .qa-header {
    margin-bottom: 20px;
  }

  .qa-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
    color: var(--color-qa, #3b82f6);
    animation: pulse 2s infinite;
  }

  .qa-title {
    color: var(--color-qa, #3b82f6);
    font-size: 1.8em;
    margin: 0 0 8px 0;
    text-shadow: var(--glow-sm) rgba(59, 130, 246, 0.5);
    font-weight: bold;
  }

  .qa-player {
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

  .qa-content {
    margin-bottom: 25px;
  }

  .qa-question {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-md);
    padding: 20px;
  }

  .qa-question p {
    color: var(--text-primary);
    font-size: 1.3em;
    font-weight: bold;
    margin: 0;
    line-height: 1.5;
  }

  .qa-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .qa-answer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #1d4ed8, #3b82f6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
    padding: 12px 30px;
    font-size: 1.1em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    width: 100%;
    max-width: 300px;
  }

  .qa-answer-btn:not(:disabled):hover {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
  }

  .qa-refuse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #7f1d1d, var(--color-punishment, #dc2626));
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
    padding: 10px 24px;
    font-size: 0.95em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    width: 100%;
    max-width: 300px;
  }

  .qa-refuse-btn:not(:disabled):hover {
    background: linear-gradient(135deg, var(--color-punishment, #dc2626), #ef4444);
    transform: translateY(-2px);
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
    .qa-modal {
      padding: 20px;
    }

    .qa-icon :deep(svg) {
      width: 40px;
      height: 40px;
    }

    .qa-title {
      font-size: 1.5em;
    }

    .qa-question p {
      font-size: 1.1em;
    }
  }
</style>
