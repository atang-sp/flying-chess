<script setup lang="ts">
  import { computed } from 'vue'
  import { Flame, MapPin } from '@lucide/vue'
  import type { Player } from '@flying-chess/game-core/types'
  import PlayerMeeple from './PlayerMeeple.vue'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
    totalCells: number
    partyActLabel?: string
    partyRound?: number
    partyRulesetVersion?: string
    tokensRemaining?: readonly number[]
  }

  const props = defineProps<Props>()
  const isParty = computed(() => props.partyRound !== undefined)

  const progress = (position: number) => {
    if (props.totalCells <= 0) return 0
    return Math.min(100, Math.max(0, (position / props.totalCells) * 100))
  }
</script>

<template>
  <section
    class="game-roster"
    :class="{ 'is-party': isParty }"
    :data-testid="isParty ? 'party-status' : 'game-roster'"
    aria-label="玩家进度"
  >
    <div v-if="isParty" class="party-context">
      <Flame :size="17" aria-hidden="true" />
      <span>
        <strong>升温局 · {{ partyActLabel }}</strong>
        <small>
          第 {{ partyRound }} 轮
          <span v-if="partyRulesetVersion">· {{ partyRulesetVersion }}</span>
        </small>
      </span>
    </div>

    <div class="roster-scroll">
      <article
        v-for="(player, index) in players"
        :key="player.id"
        class="roster-player"
        :class="{ 'is-current': index === currentPlayerIndex, 'is-winner': player.isWinner }"
        :data-testid="`roster-player-${index}`"
      >
        <PlayerMeeple
          class="roster-token"
          :color="player.color"
          :number="index + 1"
          :name="player.name"
          size="small"
        />
        <span class="roster-copy">
          <strong>{{ player.name }}</strong>
          <small>
            <MapPin :size="11" aria-hidden="true" />
            {{ player.position === 0 ? '起飞区' : `${player.position}/${totalCells}` }}
          </small>
        </span>
        <span
          v-if="tokensRemaining"
          class="token-count"
          :aria-label="`${player.name}剩余${tokensRemaining[index] ?? 0}枚干预筹码`"
        >
          <span class="token-player-name">{{ player.name }}</span>
          {{ tokensRemaining[index] ?? 0 }} 枚
        </span>
        <span class="roster-progress" aria-hidden="true">
          <span
            :style="{
              width: `${progress(player.position)}%`,
              backgroundColor: player.color,
            }"
          ></span>
        </span>
      </article>
    </div>
  </section>
</template>

<style scoped>
  .game-roster {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0.55rem;
  }

  .party-context {
    flex: 0 0 auto;
    min-width: 128px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid rgba(218, 162, 96, 0.32);
    border-radius: 13px;
    color: #f2d5ae;
    background: linear-gradient(135deg, rgba(132, 59, 48, 0.38), rgba(59, 78, 62, 0.38));
  }

  .party-context svg {
    color: #e2a058;
  }

  .party-context span {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .party-context strong {
    font-size: 0.7rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .party-context small {
    margin-top: 0.12rem;
    color: #bfc8bf;
    font-size: 0.58rem;
    font-weight: 700;
  }

  .roster-scroll {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0.42rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .roster-scroll::-webkit-scrollbar {
    display: none;
  }

  .roster-player {
    position: relative;
    min-width: 116px;
    max-width: 168px;
    flex: 1 0 116px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.42rem;
    padding: 0.42rem 0.55rem 0.52rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 13px;
    color: #e6eee8;
    background: rgba(9, 24, 20, 0.38);
    transition:
      border-color 160ms ease,
      background 160ms ease;
  }

  .roster-player.is-current {
    border-color: rgba(226, 190, 120, 0.66);
    background: rgba(70, 81, 55, 0.5);
    box-shadow: inset 0 0 0 1px rgba(250, 221, 160, 0.14);
  }

  .roster-player.is-winner {
    border-color: rgba(234, 194, 89, 0.72);
  }

  .roster-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .roster-copy strong {
    overflow: hidden;
    color: #fffaf0;
    font-size: 0.72rem;
    font-weight: 760;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .roster-copy small {
    display: inline-flex;
    align-items: center;
    gap: 0.16rem;
    margin-top: 0.16rem;
    color: #aebdb3;
    font-size: 0.58rem;
    font-weight: 650;
  }

  .token-count {
    grid-column: 1 / -1;
    overflow: hidden;
    color: #e7c990;
    font-size: 0.54rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .roster-progress {
    position: absolute;
    left: 0.5rem;
    right: 0.5rem;
    bottom: 0.28rem;
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
  }

  .roster-progress > span {
    display: block;
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
  }

  @media (max-width: 768px) {
    .game-roster {
      flex: 1 1 auto;
      min-width: 148px;
      height: 44px;
    }

    .party-context {
      min-width: 106px;
      padding: 0.3rem 0.5rem;
      border-radius: 10px;
    }

    .party-context strong {
      font-size: 0.62rem;
    }

    .party-context small {
      font-size: 0.53rem;
    }

    .roster-player {
      min-width: 100px;
      flex-basis: 100px;
      padding: 0.3rem 0.42rem 0.42rem;
      border-radius: 10px;
    }

    .roster-copy strong {
      font-size: 0.64rem;
    }

    .token-count {
      position: absolute;
      right: 0.35rem;
      bottom: 0.34rem;
      max-width: 58px;
      font-size: 0.48rem;
    }

    .token-player-name {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .roster-player {
      transition: none;
    }
  }
</style>
