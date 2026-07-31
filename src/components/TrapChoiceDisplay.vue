<script setup lang="ts">
  import { Skull } from '@lucide/vue'
  import type { Player } from '../types/game'

  interface Props {
    show: boolean
    description: string
    choiceA: string
    choiceB: string
    player?: Player | null
    rouletteTarget?: Player | null
    trapVariant?: string
  }

  interface Emits {
    (e: 'choose', choice: 'A' | 'B'): void
    (e: 'confirm'): void
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

  const choose = (choice: 'A' | 'B') => {
    if (submitted.value) return
    submitted.value = true
    emit('choose', choice)
  }
  const confirmTrap = () => {
    if (submitted.value) return
    submitted.value = true
    emit('confirm')
  }
</script>

<template>
  <div v-if="show" class="modal-overlay trap-choice-overlay" @click.stop>
    <div class="trap-choice-modal" @click.stop>
      <div class="trap-choice-header">
        <div class="trap-choice-icon">
          <Skull :size="48" />
        </div>
        <h2 class="trap-choice-title">
          {{
            trapVariant === 'roulette'
              ? '命运轮盘！'
              : trapVariant === 'all_players'
                ? '全员机关！'
                : '机关触发！'
          }}
        </h2>
        <p v-if="player" class="trap-choice-player">
          <span class="player-dot" :style="{ backgroundColor: player.color }"></span>
          {{ player.name }}
        </p>
      </div>

      <div class="trap-choice-content">
        <p class="trap-choice-desc">{{ description }}</p>

        <div v-if="rouletteTarget" class="roulette-target">
          <p>命运选中了：</p>
          <div class="target-info">
            <span class="player-dot" :style="{ backgroundColor: rouletteTarget.color }"></span>
            <strong>{{ rouletteTarget.name }}</strong>
          </div>
        </div>

        <div v-if="choiceA && choiceB" class="choice-options">
          <button class="choice-btn choice-a" :disabled="submitted" @click="choose('A')">
            <span class="choice-label">A</span>
            <span class="choice-text">{{ choiceA }}</span>
          </button>
          <span class="choice-or">或</span>
          <button class="choice-btn choice-b" :disabled="submitted" @click="choose('B')">
            <span class="choice-label">B</span>
            <span class="choice-text">{{ choiceB }}</span>
          </button>
        </div>

        <div v-else class="trap-confirm-section">
          <button class="btn trap-confirm-btn" :disabled="submitted" @click="confirmTrap">
            确认执行
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .trap-choice-overlay {
    background: rgba(0, 0, 0, 0.85);
  }

  .trap-choice-modal {
    background: rgba(20, 10, 10, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(220, 38, 38, 0.4);
    border-radius: var(--radius-xl);
    padding: 30px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow:
      var(--glass-shadow-lg),
      var(--glow-md) rgba(220, 38, 38, 0.2);
    animation: slideIn var(--transition-normal) ease-out;
  }

  .trap-choice-header {
    margin-bottom: 20px;
  }

  .trap-choice-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
    color: var(--color-trap);
    animation: pulse 2s infinite;
  }

  .trap-choice-title {
    color: var(--color-trap);
    font-size: 1.8em;
    margin: 0 0 8px 0;
    text-shadow: var(--glow-sm) rgba(220, 38, 38, 0.5);
    font-weight: bold;
  }

  .trap-choice-player {
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

  .trap-choice-content {
    margin-bottom: 10px;
  }

  .trap-choice-desc {
    color: var(--text-secondary);
    font-size: 1.1em;
    margin: 0 0 20px 0;
  }

  .roulette-target {
    background: rgba(220, 38, 38, 0.15);
    border: 1px solid rgba(220, 38, 38, 0.4);
    border-radius: var(--radius-md);
    padding: 15px;
    margin-bottom: 20px;
  }

  .roulette-target p {
    color: var(--text-secondary);
    margin: 0 0 8px 0;
  }

  .target-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.3em;
    color: var(--text-primary);
  }

  .choice-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .choice-or {
    color: var(--text-muted);
    font-size: 1.1em;
    font-weight: bold;
  }

  .choice-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: var(--radius-md);
    border: 2px solid rgba(255, 255, 255, 0.15);
    font-size: 1.05em;
    font-weight: bold;
    color: white;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .choice-a {
    background: linear-gradient(135deg, #7f1d1d, #991b1b);
  }

  .choice-a:hover {
    background: linear-gradient(135deg, #991b1b, #b91c1c);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
  }

  .choice-b {
    background: linear-gradient(135deg, #1e3a5f, #1e40af);
  }

  .choice-b:hover {
    background: linear-gradient(135deg, #1e40af, #2563eb);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
  }

  .choice-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    font-size: 1.2em;
    flex-shrink: 0;
  }

  .choice-text {
    flex: 1;
  }

  .trap-confirm-section {
    margin-top: 20px;
  }

  .trap-confirm-btn {
    background: linear-gradient(135deg, #7f1d1d, var(--color-trap));
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
    padding: 12px 30px;
    font-size: 1.1em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
  }

  .trap-confirm-btn:not(:disabled):hover {
    background: linear-gradient(135deg, var(--color-trap), #ef4444);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
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
    .trap-choice-modal {
      padding: 20px;
      margin: 20px;
    }

    .trap-choice-title {
      font-size: 1.5em;
    }

    .choice-btn {
      padding: 14px 16px;
      font-size: 1em;
    }
  }
</style>
