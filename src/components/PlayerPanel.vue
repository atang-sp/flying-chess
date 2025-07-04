<script setup lang="ts">
  import type { Player } from '../types/game'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
  }

  defineProps<Props>()
</script>

<template>
  <div class="player-panel">
    <h3>玩家状态</h3>
    <div class="players-grid">
      <div
        v-for="player in players"
        :key="player.id"
        class="player-card"
        :class="{
          current: currentPlayerIndex === player.id - 1,
          winner: player.isWinner,
        }"
      >
        <div class="player-header">
          <div class="player-color" :style="{ backgroundColor: player.color }"></div>
          <span class="player-name">{{ player.name }}</span>
          <div v-if="player.isWinner" class="winner-badge">🏆</div>
        </div>
        <div class="player-stats">
          <div class="stat">
            <span class="label">位置:</span>
            <span class="value">{{ player.position }}</span>
          </div>
          <div class="stat">
            <span class="label">状态:</span>
            <span class="value" :class="{ 'not-taken-off': !player.hasTakenOff }">
              {{ player.hasTakenOff ? '已起飞' : '未起飞' }}
            </span>
          </div>
          <div class="stat">
            <span class="label">进度:</span>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: `${Math.min((player.position / 100) * 100, 100)}%`,
                  backgroundColor: player.color,
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .player-panel {
    background: white;
    border-radius: clamp(6px, 1.5vw, 8px);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: clamp(0.8rem, 2.5vw, 1rem);
  }

  .player-panel h3 {
    margin: 0 0 clamp(0.8rem, 2.5vw, 1rem) 0;
    color: #333;
    text-align: center;
    font-size: clamp(1.1rem, 3vw, 1.3rem);
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 80vw), 1fr));
    gap: clamp(0.8rem, 2.5vw, 1rem);
  }

  .player-card {
    border: 2px solid #e0e0e0;
    border-radius: clamp(6px, 1.5vw, 8px);
    padding: clamp(0.8rem, 2.5vw, 1rem);
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
    gap: clamp(0.4rem, 1vw, 0.5rem);
    margin-bottom: clamp(0.4rem, 1vw, 0.5rem);
  }

  .player-color {
    width: clamp(16px, 4vw, 20px);
    height: clamp(16px, 4vw, 20px);
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .player-name {
    font-weight: bold;
    color: #333;
    flex: 1;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
  }

  .winner-badge {
    font-size: clamp(1rem, 3vw, 1.2rem);
    animation: bounce 1s infinite;
  }

  .player-stats {
    display: flex;
    flex-direction: column;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }

  .label {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: #666;
    min-width: clamp(35px, 8vw, 40px);
  }

  .value {
    font-weight: bold;
    color: #333;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .value.not-taken-off {
    color: #ff6b6b;
    font-weight: bold;
  }

  .progress-bar {
    flex: 1;
    height: clamp(6px, 1.5vw, 8px);
    background: #e0e0e0;
    border-radius: clamp(3px, 0.8vw, 4px);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.5s ease;
    border-radius: clamp(3px, 0.8vw, 4px);
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
    60% {
      transform: translateY(-3px);
    }
  }

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .players-grid {
      grid-template-columns: 1fr;
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .player-panel {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .player-panel h3 {
      margin: 0 0 0.5rem 0;
      font-size: clamp(1rem, 2.5vw, 1.1rem);
    }

    .players-grid {
      gap: 0.5rem;
    }

    .player-card {
      padding: 0.5rem;
      border-width: 1px;
    }

    .player-header {
      gap: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-color {
      width: clamp(12px, 3vw, 16px);
      height: clamp(12px, 3vw, 16px);
      border-width: 1px;
    }

    .player-name {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .winner-badge {
      font-size: clamp(0.8rem, 2.5vw, 1rem);
    }

    .player-stats {
      gap: 0.3rem;
    }

    .stat {
      gap: 0.3rem;
    }

    .label {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
      min-width: clamp(30px, 7vw, 35px);
    }

    .value {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .progress-bar {
      height: clamp(4px, 1vw, 6px);
    }
  }

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .player-panel {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .player-panel h3 {
      margin: 0 0 0.4rem 0;
      font-size: clamp(0.9rem, 2.2vw, 1rem);
    }

    .players-grid {
      gap: 0.4rem;
    }

    .player-card {
      padding: 0.4rem;
    }

    .player-header {
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .player-color {
      width: clamp(10px, 2.5vw, 12px);
      height: clamp(10px, 2.5vw, 12px);
    }

    .player-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .winner-badge {
      font-size: clamp(0.7rem, 2.2vw, 0.8rem);
    }

    .player-stats {
      gap: 0.25rem;
    }

    .stat {
      gap: 0.25rem;
    }

    .label {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
      min-width: clamp(25px, 6vw, 30px);
    }

    .value {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .progress-bar {
      height: clamp(3px, 0.8vw, 4px);
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .player-panel {
      padding: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-panel h3 {
      margin: 0 0 0.3rem 0;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
    }

    .players-grid {
      gap: 0.3rem;
    }

    .player-card {
      padding: 0.3rem;
    }

    .player-header {
      gap: 0.2rem;
      margin-bottom: 0.2rem;
    }

    .player-color {
      width: clamp(8px, 2vw, 10px);
      height: clamp(8px, 2vw, 10px);
    }

    .player-name {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
    }

    .winner-badge {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .player-stats {
      gap: 0.2rem;
    }

    .stat {
      gap: 0.2rem;
    }

    .label {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
      min-width: clamp(20px, 5vw, 25px);
    }

    .value {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .progress-bar {
      height: clamp(2px, 0.6vw, 3px);
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .player-panel {
      padding: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-panel h3 {
      margin: 0 0 0.3rem 0;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
    }

    .players-grid {
      gap: 0.3rem;
    }

    .player-card {
      padding: 0.3rem;
    }

    .player-header {
      gap: 0.2rem;
      margin-bottom: 0.2rem;
    }

    .player-color {
      width: clamp(10px, 2.5vw, 12px);
      height: clamp(10px, 2.5vw, 12px);
    }

    .player-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .player-stats {
      gap: 0.2rem;
    }

    .stat {
      gap: 0.2rem;
    }

    .label {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
      min-width: clamp(25px, 6vw, 30px);
    }

    .value {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }
</style>
