<script setup lang="ts">
  import { onBeforeUnmount, ref, watch } from 'vue'
  import { Coins, MoveRight, RotateCcw, Timer } from '@lucide/vue'
  import {
    PARTY_DECISION_TIMEOUT_SECONDS,
    PARTY_DEFAULT_DICE_DECISION,
  } from '../services/partyMode'

  const props = defineProps<{
    visible: boolean
    playerName: string
    diceValue: number
    tokensRemaining: number
    canReroll: boolean
    paused: boolean
  }>()

  const emit = defineEmits<{
    (event: 'reroll'): void
    (event: 'continue'): void
  }>()

  const secondsRemaining = ref(PARTY_DECISION_TIMEOUT_SECONDS)
  let timer: number | undefined
  let submitted = false

  const clearTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  const startTimer = (resetCountdown: boolean) => {
    clearTimer()
    submitted = false
    if (resetCountdown) secondsRemaining.value = PARTY_DECISION_TIMEOUT_SECONDS
    timer = window.setInterval(() => {
      secondsRemaining.value -= 1
      if (secondsRemaining.value <= 0) {
        clearTimer()
        if (submitted) return
        submitted = true
        emit(PARTY_DEFAULT_DICE_DECISION)
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

  const choose = (event: 'reroll' | 'continue') => {
    if (submitted) return
    submitted = true
    clearTimer()
    if (event === 'reroll') emit('reroll')
    else emit('continue')
  }
</script>

<template>
  <div v-if="visible" class="party-dice-overlay" data-testid="party-dice-decision">
    <section class="party-dice-card" role="dialog" aria-modal="true">
      <p class="party-dice-kicker">
        <Coins :size="18" />
        {{ tokensRemaining }} 枚筹码可用
      </p>
      <h2>{{ playerName }} 掷出了 {{ diceValue }}</h2>
      <p>
        <Timer :size="16" />
        {{ secondsRemaining }} 秒后自动继续移动
      </p>
      <div class="party-dice-actions">
        <button
          type="button"
          class="party-dice-action party-dice-action--secondary"
          data-testid="party-continue"
          @click="choose('continue')"
        >
          <MoveRight :size="18" />
          接受并移动
        </button>
        <button
          type="button"
          class="party-dice-action party-dice-action--primary"
          :disabled="!canReroll"
          data-testid="party-reroll"
          @click="choose('reroll')"
        >
          <RotateCcw :size="18" />
          消耗 1 枚重掷
        </button>
      </div>
      <small v-if="!canReroll && tokensRemaining > 0">本次骰点已经改变，不能再次重掷。</small>
    </section>
  </div>
</template>

<style scoped>
  .party-dice-overlay {
    position: fixed;
    inset: 0;
    z-index: 2250;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.72);
    backdrop-filter: blur(7px);
  }

  .party-dice-card {
    width: min(450px, 100%);
    padding: clamp(1.35rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background: rgba(15, 23, 42, 0.97);
    border: 1px solid rgba(129, 140, 248, 0.55);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.55);
  }

  .party-dice-kicker,
  .party-dice-card p {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #c7d2fe;
  }

  .party-dice-card h2 {
    margin: 0.7rem 0;
    font-size: clamp(1.35rem, 5vw, 1.8rem);
  }

  .party-dice-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1.25rem;
  }

  .party-dice-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 52px;
    padding: 0.8rem;
    color: white;
    font-weight: 700;
    border: 1px solid transparent;
    border-radius: 14px;
    cursor: pointer;
  }

  .party-dice-action--secondary {
    background: rgba(51, 65, 85, 0.9);
    border-color: rgba(148, 163, 184, 0.4);
  }

  .party-dice-action--primary {
    background: rgba(79, 70, 229, 0.9);
    border-color: rgba(165, 180, 252, 0.5);
  }

  .party-dice-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  small {
    display: block;
    margin-top: 0.8rem;
    color: #fda4af;
  }

  @media (max-width: 480px) {
    .party-dice-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
