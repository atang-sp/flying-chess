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
  let timeoutId: number | undefined
  let intervalId: number | undefined
  let submitted = false

  const actor = computed(() => props.players[props.actorPlayerIndex])
  const quizPrompt = computed(
    () => `请 ${actor.value?.name ?? '当前玩家'} 在倒计时内说出三个棋盘上的格子类型。`
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

  const startReaction = () => {
    reactionPhase.value = 'waiting'
    reactionRace.value = createReactionRace(props.players.length)
    const delay = SecureRandom.randomInt(700, 1500)
    timeoutId = window.setTimeout(() => {
      reactionPhase.value = 'go'
      reactionStartedAt.value = performance.now()
    }, delay)
  }

  const pressReaction = (playerIndex: number) => {
    if (reactionPhase.value !== 'go' || !reactionRace.value) return
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
      summary: `${props.players[playerIndex]?.name ?? '玩家'} 以 ${race.winningTimeMs}ms 赢得反应赛并获得一次免罚`,
    })
  }

  const chooseMemorySymbol = (symbol: string) => {
    if (memoryRevealed.value || submitted) return
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
        ? `${actor.value?.name ?? '当前玩家'} 记忆挑战成功`
        : `${actor.value?.name ?? '当前玩家'} 记忆挑战失败，下一次惩罚加倍`,
    })
  }

  const finishQuiz = (success: boolean) => {
    const actorIndex = props.actorPlayerIndex
    finish({
      winnerPlayerIndices: success ? [actorIndex] : [],
      loserPlayerIndices: success ? [] : [actorIndex],
      summary: success
        ? `${actor.value?.name ?? '当前玩家'} 在倒计时内完成快速问答`
        : `${actor.value?.name ?? '当前玩家'} 快速问答超时，下一次惩罚加倍`,
    })
  }

  const initialize = () => {
    clearTimers()
    submitted = false
    reactionPhase.value = 'ready'
    reactionRace.value = null
    memoryAnswer.value = []
    quizSeconds.value = 8
    if (props.kind === 'memory') {
      memoryChallenge.value = createMemoryChallenge(3, entries => SecureRandom.choice([...entries]))
      memoryRevealed.value = true
      timeoutId = window.setTimeout(() => {
        memoryRevealed.value = false
      }, 2000)
    } else if (props.kind === 'quick_quiz') {
      intervalId = window.setInterval(() => {
        quizSeconds.value -= 1
        if (quizSeconds.value <= 0) finishQuiz(false)
      }, 1000)
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
  onBeforeUnmount(clearTimers)
</script>

<template>
  <div v-if="visible && kind" class="mini-game-overlay" data-testid="party-mini-game">
    <section class="mini-game-card" role="dialog" aria-modal="true">
      <template v-if="kind === 'reaction'">
        <Gauge :size="42" aria-hidden="true" />
        <h2>反应速度测试</h2>
        <p v-if="reactionPhase === 'ready'">设备放在所有人都够得到的位置，准备抢按。</p>
        <p v-else-if="reactionPhase === 'waiting'" class="waiting">等待绿色信号……提前按无效</p>
        <p v-else class="go-signal">现在按！</p>
        <button v-if="reactionPhase === 'ready'" class="start-button" @click="startReaction">
          全员准备好了
        </button>
        <div v-else class="reaction-buttons">
          <button
            v-for="(player, index) in players"
            :key="player.id"
            :disabled="reactionPhase !== 'go'"
            :style="{ borderColor: player.color }"
            @click="pressReaction(index)"
          >
            {{ player.name }} 抢按
          </button>
        </div>
      </template>

      <template v-else-if="kind === 'memory'">
        <Brain :size="42" aria-hidden="true" />
        <h2>记忆翻牌</h2>
        <p>{{ actor?.name ?? '当前玩家' }} 记住顺序；失败后下一次惩罚加倍。</p>
        <div v-if="memoryRevealed" class="memory-sequence">
          <span v-for="(symbol, index) in memoryChallenge.sequence" :key="index">{{ symbol }}</span>
        </div>
        <div v-else class="memory-options">
          <button
            v-for="symbol in memoryChallenge.options"
            :key="symbol"
            @click="chooseMemorySymbol(symbol)"
          >
            {{ symbol }}
          </button>
        </div>
        <small v-if="!memoryRevealed">
          已选 {{ memoryAnswer.length }} / {{ memoryChallenge.sequence.length }}
        </small>
      </template>

      <template v-else>
        <HelpCircle :size="42" aria-hidden="true" />
        <h2>快速问答</h2>
        <p>{{ quizPrompt }}</p>
        <strong class="quiz-timer">
          <Timer :size="19" />
          {{ quizSeconds }} 秒
        </strong>
        <div class="quiz-actions">
          <button @click="finishQuiz(true)">已完成</button>
          <button @click="finishQuiz(false)">放弃 / 判定失败</button>
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
