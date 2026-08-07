<script setup lang="ts">
  import { onBeforeUnmount, ref, watch } from 'vue'
  import { Coins, Flame, Timer } from '@lucide/vue'
  import type { PunishmentAction } from '@flying-chess/game-core/types'
  import {
    PARTY_DECISION_TIMEOUT_SECONDS,
    PARTY_DEFAULT_PUNISHMENT_DECISION,
  } from '@flying-chess/game-core/party-mode'

  const props = defineProps<{
    visible: boolean
    choices: readonly PunishmentAction[]
    tokensRemaining: number
    paused: boolean
  }>()

  const emit = defineEmits<{
    (event: 'select', index: number): void
    (event: 'skip'): void
  }>()

  const secondsRemaining = ref(PARTY_DECISION_TIMEOUT_SECONDS)
  let timer: number | undefined

  const clearTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  const startTimer = (resetCountdown: boolean) => {
    clearTimer()
    if (resetCountdown) secondsRemaining.value = PARTY_DECISION_TIMEOUT_SECONDS
    timer = window.setInterval(() => {
      secondsRemaining.value -= 1
      if (secondsRemaining.value <= 0) {
        clearTimer()
        emit(PARTY_DEFAULT_PUNISHMENT_DECISION)
      }
    }, 1000)
  }

  watch(
    () => [props.visible, props.paused] as const,
    ([visible, paused], previous) => {
      if (!visible || paused) {
        clearTimer()
        return
      }
      startTimer(previous?.[0] !== true)
    },
    { immediate: true }
  )
  onBeforeUnmount(clearTimer)

  const select = (index: number) => {
    clearTimer()
    emit('select', index)
  }
</script>

<template>
  <div v-if="visible" class="party-choice-overlay" data-testid="party-punishment-choice">
    <section class="party-choice-card" role="dialog" aria-modal="true">
      <p class="party-choice-kicker">
        <Flame :size="18" />
        随机二选一 ·
        <Coins :size="16" />
        {{ tokensRemaining }} 枚
      </p>
      <h2>要消耗一枚筹码选择结果吗？</h2>
      <p class="party-choice-countdown">
        <Timer :size="15" />
        {{ secondsRemaining }} 秒后沿用原结果
      </p>
      <div class="party-choice-grid">
        <button
          v-for="(choice, index) in choices"
          :key="`${choice.description}-${index}`"
          type="button"
          class="party-choice-option"
          :data-testid="`party-choice-${index}`"
          @click="select(index)"
        >
          <span>选项 {{ index + 1 }}</span>
          <strong>{{ choice.description }}</strong>
        </button>
      </div>
      <button
        type="button"
        class="party-choice-skip"
        data-testid="party-choice-skip"
        @click="emit('skip')"
      >
        不使用筹码，沿用原结果
      </button>
    </section>
  </div>
</template>

<style scoped>
  .party-choice-overlay {
    position: fixed;
    inset: 0;
    z-index: 2280;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.76);
    backdrop-filter: blur(8px);
  }

  .party-choice-card {
    width: min(620px, 100%);
    padding: clamp(1.3rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background:
      radial-gradient(circle at top, rgba(245, 158, 11, 0.15), transparent 48%),
      rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(251, 191, 36, 0.48);
    border-radius: 24px;
  }

  .party-choice-kicker,
  .party-choice-countdown {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #fde68a;
  }

  .party-choice-card h2 {
    margin: 0.8rem 0 0.25rem;
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .party-choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1.2rem;
  }

  .party-choice-option {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-height: 120px;
    padding: 1rem;
    color: #f8fafc;
    text-align: left;
    background: rgba(51, 65, 85, 0.78);
    border: 1px solid rgba(251, 191, 36, 0.35);
    border-radius: 16px;
    cursor: pointer;
  }

  .party-choice-option span {
    color: #fde68a;
    font-size: 0.78rem;
  }

  .party-choice-option strong {
    line-height: 1.5;
  }

  .party-choice-skip {
    margin-top: 1rem;
    padding: 0.65rem 1rem;
    color: #cbd5e1;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 560px) {
    .party-choice-grid {
      grid-template-columns: 1fr;
    }

    .party-choice-option {
      min-height: 92px;
    }
  }
</style>
