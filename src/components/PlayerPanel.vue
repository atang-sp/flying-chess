<template>
  <div class="player-panel">
    <h3>玩家状态</h3>
    <div class="players-grid">
      <div 
        v-for="player in players" 
        :key="player.id"
        class="player-card"
        :class="{ 
          'current': currentPlayerIndex === player.id - 1,
          'winner': player.isWinner 
        }"
      >
        <div class="player-header">
          <div 
            class="player-color"
            :style="{ backgroundColor: player.color }"
          ></div>
          <span class="player-name">{{ player.name }}</span>
          <div v-if="player.isWinner" class="winner-badge">🏆</div>
        </div>
        <div class="player-stats">
          <div class="stat">
            <span class="label">位置:</span>
            <span class="value">{{ player.position }}</span>
          </div>
          <div class="stat">
            <span class="label">进度:</span>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ 
                  width: `${Math.min((player.position / 100) * 100, 100)}%`,
                  backgroundColor: player.color 
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '../types/game';

interface Props {
  players: Player[];
  currentPlayerIndex: number;
}

defineProps<Props>();
</script>

<style scoped>
.player-panel {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.player-panel h3 {
  margin: 0 0 1rem 0;
  color: #333;
  text-align: center;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.player-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
  background: #fafafa;
}

.player-card.current {
  border-color: #4ecdc4;
  background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
  transform: translateY(-2px);
}

.player-card.winner {
  border-color: #ffd700;
  background: linear-gradient(135deg, #fff8e1, #fffde7);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.player-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.player-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.player-name {
  font-weight: bold;
  color: #333;
  flex: 1;
}

.winner-badge {
  font-size: 1.2rem;
  animation: bounce 1s infinite;
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.9rem;
  color: #666;
  min-width: 40px;
}

.value {
  font-weight: bold;
  color: #333;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 4px;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-5px); }
  60% { transform: translateY(-3px); }
}

@media (max-width: 768px) {
  .players-grid {
    grid-template-columns: 1fr;
  }
  
  .player-card {
    padding: 0.75rem;
  }
}
</style> 