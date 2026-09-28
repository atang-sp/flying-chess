<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Hand, Link2, Sparkles, Vote } from '@lucide/vue'
  import type { Player } from '@flying-chess/game-core/types'
  import {
    resolvePartyRockPaperScissors,
    tallyPartyVotes,
    type PartyEventCard,
    type PartyRockPaperScissorsChoice,
  } from '@flying-chess/game-core/party-events'

  const { t, te, locale } = useI18n()

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

  const cardKey = computed(() => props.card?.id?.replace(/-/g, '_') ?? '')

  const localizedTitle = computed(() => {
    if (!props.card) return ''
    if (props.card.title_i18n?.[locale.value]) return props.card.title_i18n[locale.value]
    const short = locale.value.split('-')[0]
    if (props.card.title_i18n?.[short]) return props.card.title_i18n[short]
    const i18nKey = `party_event_card_${cardKey.value}_title`
    if (te(i18nKey)) return t(i18nKey)
    return props.card.title
  })

  const localizedDescription = computed(() => {
    if (!props.card) return ''
    if (props.card.description_i18n?.[locale.value])
      return props.card.description_i18n[locale.value]
    const short = locale.value.split('-')[0]
    if (props.card.description_i18n?.[short]) return props.card.description_i18n[short]
    const i18nKey = `party_event_card_${cardKey.value}_desc`
    if (te(i18nKey)) return t(i18nKey)
    return props.card.description
  })

  const localizedTags = computed(() => {
    if (!props.card) return []
    if (props.card.tags_i18n?.[locale.value]) return props.card.tags_i18n[locale.value]
    const short = locale.value.split('-')[0]
    if (props.card.tags_i18n?.[short]) return props.card.tags_i18n[short]
    return props.card.tags
  })

  const localizedPrompt = computed(() => {
    if (!props.card || props.card.effect.kind !== 'vote') return ''
    const i18nKey = `party_event_card_${cardKey.value}_prompt`
    if (te(i18nKey)) return t(i18nKey)
    return props.card.effect.prompt
  })

  const getLocalizedOption = (optionIndex: number, fallback: string) => {
    const i18nKey = `party_event_card_${cardKey.value}_opt${optionIndex + 1}`
    if (te(i18nKey)) return t(i18nKey)
    return fallback
  }
  const triggerLabel = computed(() => {
    const trigger = props.card?.trigger
    if (!trigger) return ''
    if (trigger.kind === 'every_n_turns')
      return t('party_event_trigger_turns', { interval: trigger.interval })
    if (trigger.kind === 'consecutive_punishments')
      return t('party_event_trigger_punishments', { count: trigger.count })
    return t('party_event_trigger_dice', { value: trigger.value })
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
  const rpsLabels = computed<Readonly<Record<PartyRockPaperScissorsChoice, string>>>(() => ({
    rock: t('party_event_rps_rock'),
    paper: t('party_event_rps_paper'),
    scissors: t('party_event_rps_scissors'),
  }))

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
        {{ t('party_event_kicker', { trigger: triggerLabel }) }}
      </p>
      <h2>{{ localizedTitle }}</h2>
      <p class="description">{{ localizedDescription }}</p>
      <div class="tags">
        <span v-for="tag in localizedTags" :key="tag">#{{ tag }}</span>
      </div>

      <div v-if="card.effect.kind === 'bind_players'" class="binding-choice">
        <p>
          <Link2 :size="17" />
          {{ t('party_event_bind_players') }}
        </p>
        <div>
          <select v-model.number="firstPlayerIndex" :aria-label="t('party_event_bind_first_aria')">
            <option v-for="(player, index) in players" :key="player.id" :value="index">
              {{ player.name }}
            </option>
          </select>
          <select
            v-model.number="secondPlayerIndex"
            :aria-label="t('party_event_bind_second_aria')"
          >
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
          {{ t('party_event_bind_confirm') }}
        </button>
      </div>

      <div v-else-if="card.effect.kind === 'vote'" class="vote-choice">
        <p>
          <Vote :size="17" />
          {{ localizedPrompt }}
        </p>
        <template v-if="!voteResult">
          <strong>
            {{
              t('party_event_vote_please', {
                name: currentVotePlayer?.name ?? t('party_event_player'),
              })
            }}
          </strong>
          <small>{{ t('party_event_vote_hint') }}</small>
          <button
            v-for="(option, optionIndex) in card.effect.options"
            :key="option"
            type="button"
            @click="castVote(optionIndex)"
          >
            {{ getLocalizedOption(optionIndex, option) }}
          </button>
        </template>
        <template v-else>
          <p v-for="(option, optionIndex) in card.effect.options" :key="option" class="vote-result">
            {{
              t('party_event_vote_count', {
                option: getLocalizedOption(optionIndex, option),
                count: voteResult.counts[optionIndex],
              })
            }}
          </p>
          <button type="button" class="primary-action" @click="confirmVote">
            {{ t('party_event_vote_confirm') }}
          </button>
        </template>
      </div>

      <div v-else-if="card.effect.kind === 'rock_paper_scissors'" class="vote-choice">
        <p>
          <Hand :size="17" />
          {{ t('party_event_rps_title') }}
        </p>
        <template v-if="!rpsResult">
          <strong>
            {{
              t('party_event_rps_please', {
                name: currentRpsPlayer?.name ?? t('party_event_player'),
              })
            }}
          </strong>
          <small>{{ t('party_event_rps_hint') }}</small>
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
                ? t('party_event_rps_win', {
                    choice: rpsLabels[rpsResult.winningChoice],
                    winners: rpsResult.winnerPlayerIndices
                      .map(index => players[index]?.name)
                      .join('、'),
                  })
                : t('party_event_rps_tie')
            }}
          </p>
          <button type="button" class="primary-action" @click="confirmRps">
            {{ t('party_event_rps_confirm') }}
          </button>
        </template>
      </div>

      <button
        v-else-if="card.effect.kind === 'mini_game'"
        type="button"
        class="primary-action"
        @click="emit('start-mini-game')"
      >
        {{ t('party_event_start_mini') }}
      </button>
      <button v-else type="button" class="primary-action" @click="emit('resolve', {})">
        {{ t('party_event_activate') }}
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
