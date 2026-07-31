<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Hand, Link2, Sparkles, Vote } from '@lucide/vue'
  import type { Player } from '../types/game'
  import {
    resolvePartyRockPaperScissors,
    tallyPartyVotes,
    type PartyEventCard,
    type PartyRockPaperScissorsChoice,
  } from '../services/partyEvents'

  const props = defineProps<{
    card: PartyEventCard | null
    players: readonly Player[]
  }>()
  const emit = defineEmits<{
    (
      event: 'resolve',
      result: {
        selectedPlayerIndices?: readonly number[]
        voteChoice?: string
        voteCounts?: readonly number[]
        rpsWinnerPlayerIndices?: readonly number[]
      }
    ): void
    (event: 'start-mini-game'): void
  }>()

  const firstPlayerIndex = ref(0)
  const secondPlayerIndex = ref(1)
  const votes = ref<number[]>([])
  const rpsChoices = ref<PartyRockPaperScissorsChoice[]>([])
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
  const currentVotePlayer = computed(() => props.players[votes.value.length])
  const voteResult = computed(() => {
    if (props.card?.effect.kind !== 'vote' || votes.value.length < props.players.length) return null
    return tallyPartyVotes(props.card.effect.options, votes.value)
  })
  const currentRpsPlayer = computed(() => props.players[rpsChoices.value.length])
  const rpsResult = computed(() =>
    rpsChoices.value.length >= props.players.length && props.players.length >= 2
      ? resolvePartyRockPaperScissors(rpsChoices.value)
      : null
  )
  const rpsLabels: Readonly<Record<PartyRockPaperScissorsChoice, string>> = {
    rock: '石头',
    paper: '布',
    scissors: '剪刀',
  }

  const castVote = (optionIndex: number) => {
    if (!currentVotePlayer.value) return
    votes.value = [...votes.value, optionIndex]
  }

  const confirmVote = () => {
    if (props.card?.effect.kind !== 'vote' || !voteResult.value) return
    const winningOptions = voteResult.value.winningOptionIndices.map(optionIndex =>
      props.card?.effect.kind === 'vote' ? props.card.effect.options[optionIndex] : ''
    )
    emit('resolve', {
      voteChoice: winningOptions.join(' / '),
      voteCounts: voteResult.value.counts,
    })
  }

  const chooseRps = (choice: PartyRockPaperScissorsChoice) => {
    if (!currentRpsPlayer.value) return
    rpsChoices.value = [...rpsChoices.value, choice]
  }

  const confirmRps = () => {
    if (!rpsResult.value) return
    emit('resolve', { rpsWinnerPlayerIndices: rpsResult.value.winnerPlayerIndices })
  }

  watch(
    () => props.card?.id,
    () => {
      firstPlayerIndex.value = 0
      secondPlayerIndex.value = Math.min(1, props.players.length - 1)
      votes.value = []
      rpsChoices.value = []
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
        <template v-if="!voteResult">
          <strong>{{ currentVotePlayer?.name ?? '玩家' }} 请投票</strong>
          <small>选择后暂不展示结果，再把设备交给下一位。</small>
          <button
            v-for="(option, optionIndex) in card.effect.options"
            :key="option"
            type="button"
            @click="castVote(optionIndex)"
          >
            {{ option }}
          </button>
        </template>
        <template v-else>
          <p v-for="(option, optionIndex) in card.effect.options" :key="option" class="vote-result">
            {{ option }} {{ voteResult.counts[optionIndex] }} 票
          </p>
          <button type="button" class="primary-action" @click="confirmVote">确认投票结果</button>
        </template>
      </div>

      <div v-else-if="card.effect.kind === 'rock_paper_scissors'" class="vote-choice">
        <p>
          <Hand :size="17" />
          全员秘密猜拳
        </p>
        <template v-if="!rpsResult">
          <strong>{{ currentRpsPlayer?.name ?? '玩家' }} 请出拳</strong>
          <small>选择后把设备交给下一位，全部完成后统一揭晓。</small>
          <button
            v-for="(label, choice) in rpsLabels"
            :key="choice"
            type="button"
            @click="chooseRps(choice)"
          >
            {{ label }}
          </button>
        </template>
        <template v-else>
          <p class="vote-result">
            {{
              rpsResult.winningChoice
                ? `${rpsLabels[rpsResult.winningChoice]}获胜：${rpsResult.winnerPlayerIndices.map(index => players[index]?.name).join('、')}`
                : '本轮平局，全员并列'
            }}
          </p>
          <button type="button" class="primary-action" @click="confirmRps">确认猜拳结果</button>
        </template>
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

  .vote-choice small {
    color: #cbd5e1;
  }

  .vote-result {
    margin: 0;
    padding: 0.55rem;
    background: rgb(76 29 149 / 0.42);
    border-radius: 10px;
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
