<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Dices, Trophy } from '@lucide/vue'
  import { SecureRandom } from '../utils/secureRandom'
  import type { Player } from '../types/game'
  import {
    createPartyTieBreakState,
    rollPartyTieBreak,
    type PartyTieBreakState,
  } from '../services/partyMode'

  const props = defineProps<{
    visible: boolean
    players: Player[]
    candidateIndices: readonly number[]
  }>()

  const emit = defineEmits<{
    (event: 'winner', playerIndex: number): void
    (event: 'turn', playerIndex: number): void
  }>()

  const state = ref<PartyTieBreakState | null>(null)

  const candidates = computed(() => state.value?.candidatePlayerIndices ?? [])
  const rolls = computed(() => state.value?.rolls ?? {})
  const currentPlayerIndex = computed(
    () => candidates.value[state.value?.currentCandidateOffset ?? 0]
  )
  const currentPlayer = computed(() => props.players[currentPlayerIndex.value] ?? null)
  const tieRound = computed(() => state.value?.roundNumber ?? 1)

  const reset = () => {
    state.value = createPartyTieBreakState(props.candidateIndices)
    const playerIndex = currentPlayerIndex.value
    if (playerIndex !== undefined) emit('turn', playerIndex)
  }

  watch(
    () => [props.visible, props.candidateIndices] as const,
    ([visible]) => {
      if (visible) reset()
    },
    { immediate: true, deep: true }
  )

  const resolved = ref(false)

  watch(
    () => props.visible,
    visible => {
      if (visible) resolved.value = false
    }
  )

  const roll = () => {
    if (resolved.value) return
    const currentState = state.value
    const playerIndex = currentPlayerIndex.value
    if (!currentState || playerIndex === undefined) return
    const result = rollPartyTieBreak(currentState, playerIndex, SecureRandom.randomInt(1, 6))
    state.value = result.state
    if (result.winnerPlayerIndex !== undefined) {
      resolved.value = true
      emit('winner', result.winnerPlayerIndex)
      return
    }
    const nextPlayerIndex = currentPlayerIndex.value
    if (nextPlayerIndex !== undefined) emit('turn', nextPlayerIndex)
  }

  defineExpose({ roll })
</script>

<template>
  <div v-if="visible" class="tie-overlay" data-testid="party-tie-break">
    <section class="tie-card" role="dialog" aria-modal="true">
      <p class="tie-kicker">
        <Trophy :size="18" />
        终局同位置 · 第 {{ tieRound }} 轮决胜
      </p>
      <h2>{{ currentPlayer?.name }} 点击掷骰</h2>
      <p>所有并列玩家各掷一次，最高点获胜；再次并列就继续。</p>

      <div class="tie-rolls">
        <div v-for="playerIndex in candidates" :key="playerIndex" class="tie-roll">
          <span>{{ players[playerIndex]?.name }}</span>
          <strong>{{ rolls[playerIndex] ?? '—' }}</strong>
        </div>
      </div>

      <button
        type="button"
        class="tie-roll-button"
        :disabled="resolved"
        data-testid="party-tie-roll"
        @click="roll"
      >
        <Dices :size="20" />
        掷骰
      </button>
    </section>
  </div>
</template>

<style scoped>
  .tie-overlay {
    position: fixed;
    inset: 0;
    z-index: 2350;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(2, 6, 23, 0.82);
    backdrop-filter: blur(9px);
  }

  .tie-card {
    width: min(480px, 100%);
    padding: clamp(1.4rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(250, 204, 21, 0.52);
    border-radius: 24px;
  }

  .tie-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #fde68a;
  }

  .tie-card h2 {
    margin: 0.8rem 0 0.4rem;
  }

  .tie-card > p:not(.tie-kicker) {
    color: #cbd5e1;
  }

  .tie-rolls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.65rem;
    margin: 1.2rem 0;
  }

  .tie-roll {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.75rem;
    background: rgba(51, 65, 85, 0.72);
    border-radius: 12px;
  }

  .tie-roll strong {
    color: #fde68a;
    font-size: 1.4rem;
  }

  .tie-roll-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-width: 160px;
    min-height: 52px;
    color: #111827;
    font-weight: 800;
    background: #facc15;
    border: 0;
    border-radius: 14px;
    cursor: pointer;
  }
</style>
