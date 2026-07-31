<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Link2, Sparkles, Vote } from '@lucide/vue'
  import type { Player } from '../types/game'
  import type { PartyEventCard } from '../services/partyEvents'

  const props = defineProps<{
    card: PartyEventCard | null
    players: readonly Player[]
  }>()
  const emit = defineEmits<{
    (
      event: 'resolve',
      result: { selectedPlayerIndices?: readonly number[]; voteChoice?: string }
    ): void
    (event: 'start-mini-game'): void
  }>()

  const firstPlayerIndex = ref(0)
  const secondPlayerIndex = ref(1)
  const canBind = computed(
    () => firstPlayerIndex.value !== secondPlayerIndex.value && props.players.length >= 2
  )
  const triggerLabel = computed(() => {
    const trigger = props.card?.trigger
    if (!trigger) return ''
    if (trigger.kind === 'every_n_turns') return `每 ${trigger.interval} 回合触发`
    if (trigger.kind === 'consecutive_punishments') return `连续 ${trigger.count} 次惩罚触发`
    return `掷出 ${trigger.value} 点触发`
  })

  watch(
    () => props.card?.id,
    () => {
      firstPlayerIndex.value = 0
      secondPlayerIndex.value = Math.min(1, props.players.length - 1)
    }
  )
</script>

<template>
  <div v-if="card" class="event-overlay" data-testid="party-event-card">
    <section class="event-card" role="dialog" aria-modal="true">
      <p class="kicker">
        <Sparkles :size="18" />
        命运事件 · {{ triggerLabel }}
      </p>
      <h2>{{ card.title }}</h2>
      <p class="description">{{ card.description }}</p>
      <div class="tags">
        <span v-for="tag in card.tags" :key="tag">#{{ tag }}</span>
      </div>

      <div v-if="card.effect.kind === 'bind_players'" class="binding-choice">
        <p>
          <Link2 :size="17" />
          选择两名绑定玩家
        </p>
        <div>
          <select v-model.number="firstPlayerIndex" aria-label="第一名绑定玩家">
            <option v-for="(player, index) in players" :key="player.id" :value="index">
              {{ player.name }}
            </option>
          </select>
          <select v-model.number="secondPlayerIndex" aria-label="第二名绑定玩家">
            <option v-for="(player, index) in players" :key="player.id" :value="index">
              {{ player.name }}
            </option>
          </select>
        </div>
        <button
          type="button"
          :disabled="!canBind"
          @click="emit('resolve', { selectedPlayerIndices: [firstPlayerIndex, secondPlayerIndex] })"
        >
          确认绑定
        </button>
      </div>

      <div v-else-if="card.effect.kind === 'vote'" class="vote-choice">
        <p>
          <Vote :size="17" />
          {{ card.effect.prompt }}
        </p>
        <button
          v-for="option in card.effect.options"
          :key="option"
          type="button"
          @click="emit('resolve', { voteChoice: option })"
        >
          {{ option }}
        </button>
      </div>

      <button
        v-else-if="card.effect.kind === 'mini_game'"
        type="button"
        class="primary-action"
        @click="emit('start-mini-game')"
      >
        开始小游戏
      </button>
      <button v-else type="button" class="primary-action" @click="emit('resolve', {})">
        激活本事件
      </button>
    </section>
  </div>
</template>

<style scoped>
  .event-overlay {
    position: fixed;
    z-index: 2280;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(2 6 23 / 0.82);
    backdrop-filter: blur(9px);
  }

  .event-card {
    width: min(560px, 100%);
    padding: clamp(1.3rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background: radial-gradient(circle at top, rgb(168 85 247 / 0.24), transparent 48%), #111827;
    border: 1px solid rgb(192 132 252 / 0.5);
    border-radius: 26px;
    box-shadow: 0 28px 80px rgb(0 0 0 / 0.48);
  }

  .kicker,
  .binding-choice p,
  .vote-choice p {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  .kicker,
  .tags {
    color: #d8b4fe;
  }

  h2 {
    margin: 0.35rem 0;
    font-size: 1.8rem;
  }

  .description {
    color: #cbd5e1;
    line-height: 1.55;
  }

  .tags {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.78rem;
  }

  .binding-choice,
  .vote-choice {
    display: grid;
    gap: 0.65rem;
    margin-top: 1.2rem;
  }

  .binding-choice > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  select,
  button {
    min-height: 44px;
    padding: 0.65rem 0.8rem;
    color: #f8fafc;
    background: rgb(76 29 149 / 0.76);
    border: 1px solid rgb(192 132 252 / 0.36);
    border-radius: 11px;
    font: inherit;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .primary-action {
    width: 100%;
    margin-top: 1.2rem;
    font-weight: 800;
    background: linear-gradient(135deg, #7c3aed, #c026d3);
  }
</style>
