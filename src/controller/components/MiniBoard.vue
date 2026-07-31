<script setup lang="ts">
import { computed } from 'vue'
import type { PublicPlayerInfo } from '../../types/network'

const props = defineProps<{
  players: readonly PublicPlayerInfo[]
  myIndex: number
  boardSize: number
}>()

const playerMarkers = computed(() =>
  props.players.map((player, index) => ({
    ...player,
    index,
    isMe: index === props.myIndex,
    percent: props.boardSize > 0 ? (player.position / props.boardSize) * 100 : 0,
  }))
)
</script>

<template>
  <div class="mini-board">
    <div class="track">
      <div class="track-fill" />
      <div
        v-for="marker in playerMarkers"
        :key="marker.id"
        class="player-marker"
        :class="{ me: marker.isMe }"
        :style="{
          left: `${marker.percent}%`,
          background: marker.color,
          zIndex: marker.isMe ? 10 : 1,
        }"
        :title="`${marker.name}: ${marker.position}/${boardSize}`"
      >
        <span class="marker-label">{{ marker.name[0] }}</span>
      </div>
      <div class="track-start">起</div>
      <div class="track-end">终</div>
    </div>
    <div class="position-labels">
      <span
        v-for="marker in playerMarkers"
        :key="marker.id"
        class="pos-label"
        :class="{ me: marker.isMe }"
        :style="{ color: marker.color }"
      >
        {{ marker.name }}: {{ marker.position }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.mini-board {
  padding: 0.75rem 0.5rem;
}

.track {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  margin: 1.5rem 1rem 0.75rem;
}

.track-fill {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(225, 194, 127, 0.1), rgba(225, 194, 127, 0.05));
}

.player-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: left 0.5s ease;
  border: 2px solid rgba(0, 0, 0, 0.2);
}

.player-marker.me {
  width: 30px;
  height: 30px;
  font-size: 0.8rem;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 8px rgba(225, 194, 127, 0.4);
}

.track-start,
.track-end {
  position: absolute;
  top: -6px;
  font-size: 0.65rem;
  color: var(--color-text-muted, #8a8780);
}

.track-start {
  left: -1rem;
}

.track-end {
  right: -1rem;
}

.position-labels {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.pos-label {
  opacity: 0.6;
}

.pos-label.me {
  opacity: 1;
  font-weight: 600;
}
</style>
