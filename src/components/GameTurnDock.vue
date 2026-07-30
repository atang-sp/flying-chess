<script setup lang="ts">
  import { computed } from 'vue'
  import { Footprints, Sparkles } from '@lucide/vue'
  import type { Player } from '../types/game'
  import { vibrate } from '../utils/haptics'
  import CoolDice from './CoolDice.vue'
  import PlayerMeeple from './PlayerMeeple.vue'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
    totalCells: number
    canRoll: boolean
    diceValue: number | null
    lastEffect?: string
    turnCount?: number
    mobile: boolean
  }

  interface Emits {
    (event: 'roll'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
  const currentPlayer = computed(() => props.players[props.currentPlayerIndex])
  const progress = computed(() => {
    if (!currentPlayer.value || props.totalCells <= 0) return 0
    return Math.min(100, Math.max(0, (currentPlayer.value.position / props.totalCells) * 100))
  })

  const handleRoll = () => {
    vibrate(15)
    emit('roll')
  }
</script>

<template>
  <section class="turn-dock" :class="{ 'is-mobile': mobile }" aria-label="当前回合">
    <div v-if="currentPlayer" class="turn-player">
      <span class="turn-kicker">CURRENT TURN</span>
      <div class="player-line">
        <PlayerMeeple
          :color="currentPlayer.color"
          :number="currentPlayerIndex + 1"
          :name="currentPlayer.name"
        />
        <div class="player-copy">
          <strong>{{ currentPlayer.name }}</strong>
          <span>
            <Footprints :size="14" />
            {{
              currentPlayer.position === 0
                ? '等待起飞'
                : `${currentPlayer.position} / ${totalCells}`
            }}
          </span>
        </div>
        <span v-if="turnCount" class="round-chip">R{{ turnCount }}</span>
      </div>
      <div class="turn-progress" aria-hidden="true">
        <span :style="{ width: `${progress}%`, backgroundColor: currentPlayer.color }"></span>
      </div>
    </div>

    <div class="dice-area">
      <CoolDice :can-roll="canRoll" :value="diceValue" @roll="handleRoll" />
      <span class="dice-caption">{{ canRoll ? '轮到你掷骰' : '等待回合处理' }}</span>
    </div>

    <div class="effect-line" :class="{ 'has-effect': lastEffect }" aria-live="polite">
      <Sparkles :size="15" />
      <span>{{ lastEffect || '落地效果会显示在这里' }}</span>
    </div>
  </section>
</template>

<style scoped>
  .turn-dock {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.8rem;
    padding: 1rem;
    border: 1px solid rgba(208, 176, 113, 0.32);
    border-radius: 20px;
    color: #f8f1e4;
    background:
      radial-gradient(circle at 85% 8%, rgba(209, 172, 101, 0.13), transparent 32%),
      linear-gradient(145deg, #1a2823, #101b18);
    box-shadow:
      0 16px 42px rgba(4, 12, 10, 0.3),
      inset 0 0 0 4px rgba(255, 255, 255, 0.02);
  }

  .turn-player {
    min-width: 0;
  }

  .turn-kicker {
    display: block;
    margin-bottom: 0.55rem;
    color: #c5a469;
    font-size: 0.58rem;
    font-weight: 850;
    letter-spacing: 0.16em;
  }

  .player-line {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .player-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .player-copy strong {
    overflow: hidden;
    color: #fffaf0;
    font-size: 0.96rem;
    font-weight: 820;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-copy span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.12rem;
    color: #b9c8be;
    font-size: 0.68rem;
    font-weight: 650;
  }

  .round-chip {
    margin-left: auto;
    padding: 0.22rem 0.42rem;
    border: 1px solid rgba(211, 177, 110, 0.28);
    border-radius: 8px;
    color: #e7d3aa;
    background: rgba(207, 172, 102, 0.08);
    font-size: 0.62rem;
    font-weight: 800;
  }

  .turn-progress {
    height: 5px;
    margin-top: 0.8rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .turn-progress span {
    display: block;
    height: 100%;
    min-width: 3px;
    border-radius: inherit;
    transition: width 300ms ease;
  }

  .dice-area {
    min-width: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .dice-area :deep(.cool-dice-container) {
    min-width: 82px;
    transform: scale(0.76);
    transform-origin: center;
    margin: -16px -8px -15px;
  }

  .dice-area :deep(.dice-cube) {
    filter: sepia(0.12) saturate(0.82);
  }

  .dice-area :deep(.desktop-status),
  .dice-area :deep(.result-display) {
    display: none;
  }

  .dice-caption {
    color: #d8c49e;
    font-size: 0.62rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .effect-line {
    grid-column: 1 / -1;
    min-width: 0;
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.6rem;
    border: 1px dashed rgba(207, 177, 118, 0.14);
    border-radius: 10px;
    color: rgba(220, 226, 220, 0.54);
    background: rgba(0, 0, 0, 0.12);
    font-size: 0.68rem;
  }

  .effect-line span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .effect-line.has-effect {
    color: #f6deb0;
    border-style: solid;
    border-color: rgba(222, 184, 107, 0.3);
    background: rgba(185, 134, 56, 0.1);
  }

  @media (max-width: 768px) {
    .turn-dock.is-mobile {
      position: fixed;
      z-index: 900;
      left: 0.45rem;
      right: 0.45rem;
      bottom: max(0.45rem, env(safe-area-inset-bottom));
      height: 88px;
      grid-template-columns: minmax(0, 1fr) 92px;
      gap: 0.35rem;
      padding: 0.62rem 0.7rem;
      border-radius: 18px;
    }

    .turn-kicker {
      display: none;
    }

    .player-line {
      padding-top: 0.18rem;
    }

    .player-copy strong {
      font-size: 0.84rem;
    }

    .turn-progress {
      margin-top: 0.42rem;
    }

    .dice-area {
      grid-column: 2;
      grid-row: 1 / span 2;
    }

    .dice-area :deep(.cool-dice-container) {
      transform: scale(0.76);
      margin: -18px -9px -18px;
    }

    .dice-caption {
      font-size: 0.58rem;
    }

    .effect-line {
      grid-column: 1;
      min-height: 24px;
      padding: 0.2rem 0.4rem;
      border: 0;
      background: transparent;
      font-size: 0.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .turn-progress span {
      transition: none;
    }
  }
</style>
