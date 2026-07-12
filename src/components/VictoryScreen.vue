<script setup lang="ts">
  import { computed } from 'vue'
  import { Trophy, Gamepad2 } from '@lucide/vue'
  import type { Player } from '../types/game'

  interface Props {
    show: boolean
    winner: Player | null
    allPlayers: Player[]
  }

  interface Emits {
    (e: 'play-again'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const otherPlayers = computed(() => {
    if (!props.winner) return []
    return props.allPlayers.filter(player => player.id !== props.winner!.id)
  })

  const handlePlayAgain = () => {
    emit('play-again')
  }
</script>

<template>
  <div v-if="show && winner" class="victory-screen-overlay">
    <div class="victory-screen">
      <div class="victory-header">
        <h1 class="victory-title">
          <Trophy :size="32" />
          游戏胜利！
        </h1>
        <div class="winner-info">
          <div class="winner-avatar" :style="{ backgroundColor: winner.color }"></div>
          <span class="winner-name">{{ winner.name }}</span>
        </div>
      </div>

      <div class="victory-content">
        <div class="reward-section">
          <h2 class="reward-title">
            <Trophy :size="24" />
            胜利奖励
          </h2>
          <div class="reward-description">
            <p>恭喜 {{ winner.name }} 获得胜利！</p>
            <p class="reward-action">
              作为奖励，{{ winner.name }} 可以用手对所有其他玩家打屁股5下：
            </p>
          </div>

          <div class="other-players-list">
            <h3>其他玩家列表：</h3>
            <div class="players-grid">
              <div v-for="player in otherPlayers" :key="player.id" class="player-item">
                <div class="player-avatar" :style="{ backgroundColor: player.color }"></div>
                <span class="player-name">{{ player.name }}</span>
                <div class="punishment-count">5下</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="victory-actions">
        <button class="btn btn-primary" @click="handlePlayAgain">
          <Gamepad2 :size="18" />
          再来一局
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .victory-screen-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }

  .victory-screen {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    max-width: 90vw;
    width: 500px;
    text-align: center;
    box-shadow:
      var(--glass-shadow-lg),
      var(--glow-md) rgba(102, 126, 234, 0.3);
    animation: victorySlideIn 0.5s ease-out;
  }

  @keyframes victorySlideIn {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .victory-header {
    margin-bottom: 2rem;
  }

  .victory-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-primary);
    font-size: 2rem;
    font-weight: bold;
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .victory-title :deep(svg) {
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .winner-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .winner-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .winner-name {
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: bold;
  }

  .victory-content {
    margin-bottom: 2rem;
  }

  .reward-section {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .reward-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-primary);
    font-size: 1.3rem;
    margin: 0 0 1rem 0;
  }

  .reward-title :deep(svg) {
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .reward-description {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .reward-description p {
    margin: 0.5rem 0;
    font-size: 1rem;
  }

  .reward-action {
    font-weight: bold;
    color: var(--color-warning);
  }

  .other-players-list h3 {
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .player-item {
    background: var(--bg-glass);
    border-radius: var(--radius-sm);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    border: var(--glass-border);
    transition:
      transform var(--transition-fast),
      background var(--transition-fast);
  }

  .player-item:hover {
    transform: translateY(-2px);
    background: var(--bg-glass-hover);
  }

  .player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .player-name {
    color: var(--text-primary);
    font-weight: bold;
    font-size: 0.9rem;
  }

  .punishment-count {
    background: #ff6b6b;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: bold;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .victory-actions {
    display: flex;
    justify-content: center;
  }

  .btn {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all var(--transition-normal);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 120px;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--color-accent), #764ba2);
    color: white;
    box-shadow:
      0 4px 15px rgba(102, 126, 234, 0.4),
      var(--glow-sm) rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(102, 126, 234, 0.5),
      var(--glow-md) rgba(102, 126, 234, 0.4);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .victory-screen {
      padding: 1.5rem;
      margin: 1rem;
    }

    .victory-title {
      font-size: 1.5rem;
    }

    .winner-name {
      font-size: 1.2rem;
    }

    .players-grid {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.75rem;
    }

    .player-item {
      padding: 0.75rem;
    }

    .player-avatar {
      width: 35px;
      height: 35px;
    }

    .player-name {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .victory-screen {
      padding: 1rem;
    }

    .victory-title {
      font-size: 1.3rem;
    }

    .winner-avatar {
      width: 50px;
      height: 50px;
    }

    .players-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
