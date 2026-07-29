<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Dices, Trophy } from '@lucide/vue'
  import { SecureRandom } from '../utils/secureRandom'
  import type { Player } from '../types/game'

  const props = defineProps<{
    visible: boolean
    players: Player[]
    candidateIndices: readonly number[]
  }>()

  const emit = defineEmits<{
    (event: 'winner', playerIndex: number): void
  }>()

  const candidates = ref<number[]>([])
  const rolls = ref<Record<number, number>>({})
  const currentCandidateOffset = ref(0)
  const tieRound = ref(1)

  const currentPlayerIndex = computed(() => candidates.value[currentCandidateOffset.value])
  const currentPlayer = computed(() => props.players[currentPlayerIndex.value] ?? null)

  const reset = () => {
    candidates.value = [...props.candidateIndices]
    rolls.value = {}
    currentCandidateOffset.value = 0
    tieRound.value = 1
  }

  watch(
    () => [props.visible, props.candidateIndices] as const,
    ([visible]) => {
      if (visible) reset()
    },
    { immediate: true, deep: true }
  )

  const roll = () => {
    const playerIndex = currentPlayerIndex.value
    if (playerIndex === undefined) return
    rolls.value = {
      ...rolls.value,
      [playerIndex]: SecureRandom.randomInt(1, 6),
    }

    if (currentCandidateOffset.value < candidates.value.length - 1) {
      currentCandidateOffset.value += 1
      return
    }

    const highestRoll = Math.max(...candidates.value.map(index => rolls.value[index] ?? 0))
    const leaders = candidates.value.filter(index => rolls.value[index] === highestRoll)
    if (leaders.length === 1) {
      emit('winner', leaders[0])
      return
    }

    candidates.value = leaders
    rolls.value = {}
    currentCandidateOffset.value = 0
    tieRound.value += 1
  }
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

      <button type="button" class="tie-roll-button" data-testid="party-tie-roll" @click="roll">
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
