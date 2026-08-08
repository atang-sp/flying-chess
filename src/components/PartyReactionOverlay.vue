<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { Eye, RefreshCw, Timer } from '@lucide/vue'
  import {
    PARTY_DECISION_TIMEOUT_SECONDS,
    PARTY_DEFAULT_REACTION_DECISION,
    type PartyPrediction,
    type PartyReaction,
    type PartyReactionDecision,
  } from '@flying-chess/game-core/party-mode'
  import type { Player } from '@flying-chess/game-core/types'

  const props = defineProps<{
    reaction: PartyReaction | null
    players: Player[]
    paused: boolean
  }>()

  const emit = defineEmits<{
    (event: 'predict', prediction: PartyPrediction): void
    (event: 'decide', decision: PartyReactionDecision): void
  }>()

  const secondsRemaining = ref(PARTY_DECISION_TIMEOUT_SECONDS)
  let activeTimer: number | undefined
  let submitted = false

  const reactorName = computed(
    () => props.players[props.reaction?.reactorPlayerIndex ?? -1]?.name ?? '反应者'
  )
  const targetName = computed(
    () => props.players[props.reaction?.targetPlayerIndex ?? -1]?.name ?? '当前玩家'
  )

  const clearActiveTimer = () => {
    if (activeTimer !== undefined) {
      window.clearInterval(activeTimer)
      activeTimer = undefined
    }
  }

  const startTimer = (resetCountdown: boolean) => {
    clearActiveTimer()
    submitted = false
    if (resetCountdown) secondsRemaining.value = PARTY_DECISION_TIMEOUT_SECONDS
    activeTimer = window.setInterval(() => {
      secondsRemaining.value -= 1
      if (secondsRemaining.value <= 0) {
        clearActiveTimer()
        if (submitted) return
        submitted = true
        emit('decide', PARTY_DEFAULT_REACTION_DECISION)
      }
    }, 1000)
  }

  const startPredictionTimer = (resetCountdown: boolean) => {
    clearActiveTimer()
    submitted = false
    if (resetCountdown) secondsRemaining.value = PARTY_DECISION_TIMEOUT_SECONDS
    activeTimer = window.setInterval(() => {
      secondsRemaining.value -= 1
      if (secondsRemaining.value <= 0) {
        clearActiveTimer()
        if (submitted) return
        submitted = true
        emit('predict', 'low')
      }
    }, 1000)
  }

  watch(
    () => [props.reaction?.status, props.paused] as const,
    ([status, paused], previous) => {
      if (paused) {
        clearActiveTimer()
        return
      }
      if (status === 'awaiting_prediction') {
        startPredictionTimer(previous?.[0] !== 'awaiting_prediction')
      } else if (status === 'awaiting_decision') {
        startTimer(previous?.[0] !== 'awaiting_decision')
      } else {
        clearActiveTimer()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(clearActiveTimer)

  const predict = (prediction: PartyPrediction) => {
    if (submitted) return
    submitted = true
    clearActiveTimer()
    emit('predict', prediction)
  }

  const decide = (decision: PartyReactionDecision) => {
    if (submitted) return
    submitted = true
    clearActiveTimer()
    emit('decide', decision)
  }
</script>

<template>
  <div
    v-if="
      reaction &&
      (reaction.status === 'awaiting_prediction' || reaction.status === 'awaiting_decision')
    "
    class="party-reaction-overlay"
    data-testid="party-reaction-overlay"
  >
    <section class="party-reaction-card" role="dialog" aria-modal="true">
      <div class="party-reaction-kicker">
        <Eye :size="18" />
        本轮反应机会
      </div>

      <template v-if="reaction.status === 'awaiting_prediction'">
        <h2>{{ reactorName }}，预测 {{ targetName }} 的骰子范围</h2>
        <p class="party-countdown">
          <Timer :size="16" />
          {{ secondsRemaining }} 秒后自动预测 1–3
        </p>
        <div class="party-reaction-actions">
          <button
            type="button"
            class="party-action party-action--low"
            data-testid="predict-low"
            @click="predict('low')"
          >
            预测 1–3
          </button>
          <button
            type="button"
            class="party-action party-action--high"
            data-testid="predict-high"
            @click="predict('high')"
          >
            预测 4–6
          </button>
        </div>
      </template>

      <template v-else>
        <h2>预测成功：骰子是 {{ reaction.rolledValue }}</h2>
        <p class="party-countdown">
          <Timer :size="16" />
          {{ secondsRemaining }} 秒后默认保留
        </p>
        <div class="party-reaction-actions">
          <button
            type="button"
            class="party-action party-action--keep"
            data-testid="reaction-keep"
            :disabled="submitted"
            @click="decide('keep')"
          >
            保留 {{ reaction.rolledValue }}
          </button>
          <button
            type="button"
            class="party-action party-action--mirror"
            data-testid="reaction-mirror"
            :disabled="submitted"
            @click="decide('mirror')"
          >
            <RefreshCw :size="17" />
            镜像为 {{ 7 - (reaction.rolledValue ?? 0) }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
  .party-reaction-overlay {
    position: fixed;
    inset: 0;
    z-index: 2300;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.76);
    backdrop-filter: blur(8px);
  }

  .party-reaction-card {
    width: min(460px, 100%);
    padding: clamp(1.4rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background:
      radial-gradient(circle at top, rgba(244, 63, 94, 0.2), transparent 52%),
      rgba(15, 23, 42, 0.97);
    border: 1px solid rgba(251, 113, 133, 0.52);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgba(76, 5, 25, 0.45);
  }

  .party-reaction-kicker,
  .party-countdown {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: #fda4af;
  }

  h2 {
    margin: 1rem 0 0.65rem;
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  p {
    color: #cbd5e1;
    line-height: 1.55;
  }

  .party-reaction-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1.4rem;
  }

  .party-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 52px;
    padding: 0.8rem 1rem;
    color: white;
    font-weight: 700;
    border: 1px solid transparent;
    border-radius: 14px;
    cursor: pointer;
  }

  .party-action--low,
  .party-action--keep {
    background: rgba(79, 70, 229, 0.86);
    border-color: rgba(165, 180, 252, 0.5);
  }

  .party-action--high,
  .party-action--mirror {
    background: rgba(225, 29, 72, 0.86);
    border-color: rgba(253, 164, 175, 0.5);
  }

  @media (max-width: 480px) {
    .party-reaction-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
