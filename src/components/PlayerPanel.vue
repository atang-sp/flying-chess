<script setup lang="ts">
  import type { Player } from '../types/game'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
    collapsed?: boolean
  }

  const props = defineProps<Props>()

  defineEmits<{
    (e: 'toggle'): void
  }>()

  const currentPlayer = computed(() => props.players[props.currentPlayerIndex])

  import { computed } from 'vue'
</script>

<template>
  <div class="player-panel-wrapper" :class="{ 'is-collapsed': collapsed }">
    <!-- Collapsed: show current player avatar as toggle -->
    <button
      v-if="collapsed"
      class="collapsed-toggle"
      :style="{ backgroundColor: currentPlayer?.color }"
      @click="$emit('toggle')"
    >
      {{ currentPlayer?.name?.charAt(0) || '?' }}
    </button>

    <!-- Expanded: full pill list -->
    <div v-else class="player-pills">
      <div
        v-for="(player, index) in players"
        :key="player.id"
        class="player-pill"
        :class="{
          current: currentPlayerIndex === index,
          winner: player.isWinner,
        }"
      >
        <div class="pill-color" :style="{ backgroundColor: player.color }"></div>
        <span class="pill-name">{{ player.name }}</span>
        <span class="pill-pos">{{ player.position === 0 ? '起点' : player.position }}</span>
        <span
          v-if="player.pendingMercyMultiplier && player.pendingMercyMultiplier > 1"
          class="pill-mercy"
        >
          ×{{ player.pendingMercyMultiplier }}
        </span>
        <span v-if="player.isWinner" class="pill-trophy">🏆</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .player-panel-wrapper {
    display: flex;
    align-items: center;
  }

  .collapsed-toggle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
    transition: transform 0.2s ease;
  }

  .collapsed-toggle:hover {
    transform: scale(1.1);
  }

  .player-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .player-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    font-size: 0.8rem;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .player-pill.current {
    border-color: rgba(102, 126, 234, 0.6);
    background: rgba(102, 126, 234, 0.15);
    box-shadow: 0 0 8px rgba(102, 126, 234, 0.25);
  }

  .player-pill.winner {
    border-color: rgba(254, 202, 87, 0.5);
    background: rgba(254, 202, 87, 0.1);
  }

  .pill-color {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pill-name {
    font-weight: 600;
    color: var(--text-primary);
    max-width: 5em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pill-pos {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .pill-mercy {
    font-size: 0.65rem;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    padding: 0.05rem 0.3rem;
    border-radius: 999px;
    line-height: 1.2;
  }

  .pill-trophy {
    font-size: 0.75rem;
  }

  @media (max-width: 768px) {
    .player-pills {
      gap: 0.3rem;
      overflow-x: auto;
      flex-wrap: nowrap;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .player-pills::-webkit-scrollbar {
      display: none;
    }

    .player-pill {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      gap: 0.25rem;
    }

    .pill-color {
      width: 8px;
      height: 8px;
    }

    .pill-pos {
      font-size: 0.7rem;
    }
  }
</style>
