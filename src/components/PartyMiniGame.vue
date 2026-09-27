<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { Brain, Gauge, HelpCircle, Timer } from '@lucide/vue'
  import type { Player } from '@flying-chess/game-core/types'
  import type { PartyMiniGameKind } from '@flying-chess/game-core/party-events'
  import {
    createMemoryChallenge,
    createReactionRace,
    recordReactionPress,
    type PartyMiniGameOutcome,
    type ReactionRaceState,
  } from '@flying-chess/game-core/party-mini-games'
  import { SecureRandom } from '../utils/secureRandom'

  const props = defineProps<{
    visible: boolean
    kind: PartyMiniGameKind | null
    players: readonly Player[]
    actorPlayerIndex: number
    paused: boolean
  }>()
  const emit = defineEmits<{
    (event: 'complete', outcome: PartyMiniGameOutcome): void
  }>()

  const reactionPhase = ref<'ready' | 'waiting' | 'go'>('ready')
  const reactionRace = ref<ReactionRaceState | null>(null)
  const reactionStartedAt = ref(0)
  const memoryChallenge = ref(createMemoryChallenge(3, entries => entries[0]))
  const memoryRevealed = ref(true)
  const memoryAnswer = ref<string[]>([])
  const quizSeconds = ref(8)
  const reactionWaitRemainingMs = ref(0)
  const memoryRevealRemainingMs = ref(0)
  const quizRemainingMs = ref(8_000)
  let timeoutId: number | undefined
  let intervalId: number | undefined
  let timerDeadline = 0
  let pausedAt: number | undefined
  let submitted = false

  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const actor = computed(() => props.players[props.actorPlayerIndex])
  const quizPrompt = computed(() =>
    t('party_mini_quiz_prompt', { name: actor.value?.name ?? t('party_mini_current_player') })
  )

  const clearTimers = () => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    if (intervalId !== undefined) window.clearInterval(intervalId)
    timeoutId = undefined
    intervalId = undefined
  }

  const finish = (outcome: PartyMiniGameOutcome) => {
    if (submitted) return
    submitted = true
    clearTimers()
    emit('complete', outcome)
  }

  const startReactionTimer = () => {
    if (props.paused || reactionPhase.value !== 'waiting') return
    if (reactionWaitRemainingMs.value <= 0) {
      reactionPhase.value = 'go'
      reactionStartedAt.value = performance.now()
      return
    }
    timerDeadline = performance.now() + reactionWaitRemainingMs.value
    timeoutId = window.setTimeout(() => {
      timeoutId = undefined
      reactionWaitRemainingMs.value = 0
      reactionPhase.value = 'go'
      reactionStartedAt.value = performance.now()
    }, reactionWaitRemainingMs.value)
  }

  const startReaction = () => {
    if (props.paused) return
    reactionPhase.value = 'waiting'
    reactionRace.value = createReactionRace(props.players.length)
    reactionWaitRemainingMs.value = SecureRandom.randomInt(700, 1500)
    startReactionTimer()
  }

  const pressReaction = (playerIndex: number) => {
    if (props.paused || reactionPhase.value !== 'go' || !reactionRace.value) return
    const race = recordReactionPress(
      reactionRace.value,
      playerIndex,
      performance.now() - reactionStartedAt.value
    )
    reactionRace.value = race
    const losers = props.players.flatMap((_, index) => (index === playerIndex ? [] : [index]))
    finish({
      winnerPlayerIndices: [playerIndex],
      loserPlayerIndices: losers,
      summary: t('party_mini_reaction_summary', {
        name: props.players[playerIndex]?.name ?? t('party_mini_player'),
        time: race.winningTimeMs,
      }),
    })
  }

  const chooseMemorySymbol = (symbol: string) => {
    if (props.paused || memoryRevealed.value || submitted) return
    memoryAnswer.value.push(symbol)
    if (memoryAnswer.value.length < memoryChallenge.value.sequence.length) return
    const correct = memoryAnswer.value.every(
      (answer, index) => answer === memoryChallenge.value.sequence[index]
    )
    const actorIndex = props.actorPlayerIndex
    finish({
      winnerPlayerIndices: correct ? [actorIndex] : [],
      loserPlayerIndices: correct ? [] : [actorIndex],
      summary: correct
        ? t('party_mini_memory_success', {
            name: actor.value?.name ?? t('party_mini_current_player'),
          })
        : t('party_mini_memory_failed', {
            name: actor.value?.name ?? t('party_mini_current_player'),
          }),
    })
  }

  const finishQuiz = (success: boolean) => {
    if (props.paused) return
    const actorIndex = props.actorPlayerIndex
    finish({
      winnerPlayerIndices: success ? [actorIndex] : [],
      loserPlayerIndices: success ? [] : [actorIndex],
      summary: success
        ? t('party_mini_quiz_success', {
            name: actor.value?.name ?? t('party_mini_current_player'),
          })
        : t('party_mini_quiz_failed', {
            name: actor.value?.name ?? t('party_mini_current_player'),
          }),
    })
  }

  const updateQuizClock = () => {
    const remaining = Math.max(0, timerDeadline - performance.now())
    quizRemainingMs.value = remaining
    quizSeconds.value = Math.ceil(remaining / 1000)
    if (remaining <= 0) finishQuiz(false)
  }

  const startMemoryTimer = () => {
    if (props.paused || !memoryRevealed.value) return
    if (memoryRevealRemainingMs.value <= 0) {
      memoryRevealed.value = false
      return
    }
    timerDeadline = performance.now() + memoryRevealRemainingMs.value
    timeoutId = window.setTimeout(() => {
      timeoutId = undefined
      memoryRevealRemainingMs.value = 0
      memoryRevealed.value = false
    }, memoryRevealRemainingMs.value)
  }

  const startQuizTimer = () => {
    if (props.paused || submitted) return
    if (quizRemainingMs.value <= 0) {
      finishQuiz(false)
      return
    }
    timerDeadline = performance.now() + quizRemainingMs.value
    updateQuizClock()
    intervalId = window.setInterval(updateQuizClock, 100)
  }

  const pauseTimers = () => {
    const now = performance.now()
    pausedAt = now
    if (timerDeadline > 0) {
      const remaining = Math.max(0, timerDeadline - now)
      if (reactionPhase.value === 'waiting') reactionWaitRemainingMs.value = remaining
      if (memoryRevealed.value) memoryRevealRemainingMs.value = remaining
      if (props.kind === 'quick_quiz') {
        quizRemainingMs.value = remaining
        quizSeconds.value = Math.ceil(remaining / 1000)
      }
    }
    clearTimers()
    timerDeadline = 0
  }

  const resumeTimers = () => {
    if (!props.visible || !props.kind || props.paused || submitted) return
    if (props.kind === 'reaction' && reactionPhase.value === 'go' && pausedAt !== undefined) {
      reactionStartedAt.value += performance.now() - pausedAt
    }
    pausedAt = undefined
    if (props.kind === 'reaction') startReactionTimer()
    else if (props.kind === 'memory') startMemoryTimer()
    else startQuizTimer()
  }

  const initialize = () => {
    clearTimers()
    submitted = false
    reactionPhase.value = 'ready'
    reactionRace.value = null
    memoryAnswer.value = []
    quizSeconds.value = 8
    reactionWaitRemainingMs.value = 0
    memoryRevealRemainingMs.value = 0
    quizRemainingMs.value = 8_000
    timerDeadline = 0
    pausedAt = undefined
    if (props.kind === 'memory') {
      memoryChallenge.value = createMemoryChallenge(3, entries => SecureRandom.choice([...entries]))
      memoryRevealed.value = true
      memoryRevealRemainingMs.value = 2_000
      startMemoryTimer()
    } else if (props.kind === 'quick_quiz') {
      startQuizTimer()
    }
  }

  watch(
    () => [props.visible, props.kind] as const,
    ([visible]) => {
      if (visible) initialize()
      else clearTimers()
    },
    { immediate: true }
  )
  watch(
    () => props.paused,
    (paused, wasPaused) => {
      if (!props.visible || paused === wasPaused) return
      if (paused) pauseTimers()
      else resumeTimers()
    }
  )
  onBeforeUnmount(clearTimers)
</script>

<template>
  <div v-if="visible && kind" class="mini-game-overlay" data-testid="party-mini-game">
    <section class="mini-game-card" role="dialog" aria-modal="true">
      <template v-if="kind === 'reaction'">
        <Gauge :size="42" aria-hidden="true" />
        <h2>{{ $t('party_mini_reaction_title') }}</h2>
        <p v-if="reactionPhase === 'ready'">{{ $t('party_mini_reaction_ready') }}</p>
        <p v-else-if="reactionPhase === 'waiting'" class="waiting">
          {{ $t('party_mini_reaction_waiting') }}
        </p>
        <p v-else class="go-signal">{{ $t('party_mini_reaction_go') }}</p>
        <button
          v-if="reactionPhase === 'ready'"
          class="start-button"
          :disabled="paused"
          @click="startReaction"
        >
          {{ $t('party_mini_reaction_all_ready') }}
        </button>
        <div v-else class="reaction-buttons">
          <button
            v-for="(player, index) in players"
            :key="player.id"
            :disabled="paused || reactionPhase !== 'go'"
            :style="{ borderColor: player.color }"
            @click="pressReaction(index)"
          >
            {{ $t('party_mini_reaction_press', { name: player.name }) }}
          </button>
        </div>
      </template>

      <template v-else-if="kind === 'memory'">
        <Brain :size="42" aria-hidden="true" />
        <h2>{{ $t('party_mini_memory_title') }}</h2>
        <p>
          {{
            $t('party_mini_memory_desc', { name: actor?.name ?? $t('party_mini_current_player') })
          }}
        </p>
        <div v-if="memoryRevealed" class="memory-sequence">
          <span v-for="(symbol, index) in memoryChallenge.sequence" :key="index">{{ symbol }}</span>
        </div>
        <div v-else class="memory-options">
          <button
            v-for="symbol in memoryChallenge.options"
            :key="symbol"
            :disabled="paused"
            @click="chooseMemorySymbol(symbol)"
          >
            {{ symbol }}
          </button>
        </div>
        <small v-if="!memoryRevealed">
          {{
            $t('party_mini_memory_progress', {
              current: memoryAnswer.length,
              total: memoryChallenge.sequence.length,
            })
          }}
        </small>
      </template>

      <template v-else>
        <HelpCircle :size="42" aria-hidden="true" />
        <h2>{{ $t('party_mini_quiz_title') }}</h2>
        <p>{{ quizPrompt }}</p>
        <strong class="quiz-timer">
          <Timer :size="19" />
          {{ $t('party_mini_quiz_seconds', { seconds: quizSeconds }) }}
        </strong>
        <div class="quiz-actions">
          <button :disabled="paused" @click="finishQuiz(true)">
            {{ $t('party_mini_quiz_done') }}
          </button>
          <button :disabled="paused" @click="finishQuiz(false)">
            {{ $t('party_mini_quiz_giveup') }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
  .mini-game-overlay {
    position: fixed;
    z-index: 2290;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(2 6 23 / 0.86);
    backdrop-filter: blur(10px);
  }

  .mini-game-card {
    width: min(640px, 100%);
    padding: clamp(1.25rem, 5vw, 2rem);
    color: #f8fafc;
    text-align: center;
    background: radial-gradient(circle at top, rgb(14 165 233 / 0.2), transparent 46%), #0f172a;
    border: 1px solid rgb(56 189 248 / 0.46);
    border-radius: 26px;
  }

  h2 {
    margin: 0.45rem 0;
  }

  p {
    color: #cbd5e1;
  }

  .waiting {
    color: #fbbf24;
  }

  .go-signal {
    color: #4ade80;
    font-size: 1.5rem;
    font-weight: 900;
  }

  .start-button,
  .reaction-buttons button,
  .memory-options button,
  .quiz-actions button {
    min-height: 48px;
    padding: 0.7rem 0.9rem;
    color: #f8fafc;
    background: rgb(3 105 161 / 0.72);
    border: 2px solid rgb(125 211 252 / 0.35);
    border-radius: 12px;
    font: inherit;
    cursor: pointer;
  }

  .reaction-buttons,
  .quiz-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.65rem;
  }

  .reaction-buttons button:disabled {
    opacity: 0.45;
  }

  .memory-sequence,
  .memory-options {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin: 1rem 0;
  }

  .memory-sequence span {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    font-size: 2rem;
    background: rgb(30 41 59 / 0.8);
    border-radius: 14px;
  }

  .memory-options button {
    width: 58px;
    padding: 0;
    font-size: 1.6rem;
  }

  .quiz-timer {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.7rem 0 1rem;
    color: #fde68a;
    font-size: 1.2rem;
  }
</style>
