<script setup lang="ts">
  import { computed } from 'vue'
  import type { Player } from '../types/game'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
    totalCells: number
    lastEffect?: string
    turnCount?: number
  }

  const props = defineProps<Props>()

  const rankedPlayers = computed(() => {
    return [...props.players]
      .map((p, idx) => ({ ...p, originalIndex: idx }))
      .sort((a, b) => b.position - a.position)
  })

  const getProgress = (position: number): number => {
    if (props.totalCells === 0) return 0
    return Math.round((position / props.totalCells) * 100)
  }
</script>

<template>
  <div class="score-panel">
    <div class="panel-header">
      <span class="panel-title">排名</span>
      <span v-if="turnCount" class="panel-turn">R{{ turnCount }}</span>
    </div>
    <div class="player-list">
      <div
        v-for="(player, rank) in rankedPlayers"
        :key="player.id"
        class="player-row"
        :class="{ 'is-current': player.originalIndex === currentPlayerIndex }"
      >
        <span class="player-rank">#{{ rank + 1 }}</span>
        <span class="player-avatar" :style="{ backgroundColor: player.color }">
          {{ player.name.charAt(0) }}
        </span>
        <span class="player-name">{{ player.name }}</span>
        <div class="player-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: getProgress(player.position) + '%',
                backgroundColor: player.color,
              }"
            ></div>
          </div>
          <span class="progress-text">{{ player.position }}/{{ totalCells }}</span>
        </div>
      </div>
    </div>
    <div v-if="lastEffect" class="panel-effect">
      {{ lastEffect }}
    </div>
  </div>
</template>

<style scoped>
  .score-panel {
    background: rgba(10, 10, 30, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 0.5rem 0.65rem;
    min-width: 180px;
    max-width: 220px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .panel-title {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .panel-turn {
    font-size: 0.6rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
  }

  .player-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.3rem;
    border-radius: 6px;
    transition: background 0.2s ease;
  }

  .player-row.is-current {
    background: rgba(255, 215, 0, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 215, 0, 0.15);
  }

  .player-rank {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--text-muted);
    width: 18px;
    text-align: center;
    flex-shrink: 0;
  }

  .player-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.45rem;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .player-progress {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .progress-bar {
    width: 36px;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
    opacity: 0.8;
  }

  .progress-text {
    font-size: 0.55rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    width: 32px;
    text-align: right;
  }

  .panel-effect {
    margin-top: 0.4rem;
    padding-top: 0.3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.65rem;
    color: var(--color-accent-light);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
