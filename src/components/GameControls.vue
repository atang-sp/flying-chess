<script setup lang="ts">
  import { computed } from 'vue'
  import { Gamepad2, Trophy } from '@lucide/vue'
  import type { Player } from '../types/game'

  interface Props {
    gameStarted: boolean
    gameFinished: boolean
    gameStatus:
      | 'waiting'
      | 'rolling'
      | 'moving'
      | 'showing_effect'
      | 'finished'
      | 'configuring'
      | 'intro'
      | 'board_settings'
      | 'settings'
    turnCount: number
    winner: Player | null
    players: Player[]
    currentPlayerIndex: number
  }

  interface Emits {
    (e: 'start'): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const currentPlayer = computed(() => {
    return props.players[props.currentPlayerIndex] || null
  })

  const gameStatusText = computed(() => {
    switch (props.gameStatus) {
      case 'waiting':
        return '等待玩家操作'
      case 'rolling':
        return '骰子滚动中'
      case 'moving':
        return '棋子移动中'
      case 'showing_effect':
        return '显示效果中'
      case 'finished':
        return '游戏结束'
      case 'configuring':
        return '配置中'
      case 'intro':
        return '开始页面'
      case 'board_settings':
        return '棋盘设置'
      case 'settings':
        return '惩罚设置'
      default:
        return '未知状态'
    }
  })

  const gameStatusClass = computed(() => {
    return `status-${props.gameStatus}`
  })

  const startGame = () => {
    emit('start')
  }

  const resetGame = () => {
    emit('reset')
  }
</script>

<template>
  <div class="game-controls glass-card">
    <div class="control-buttons">
      <button v-if="!gameStarted" class="btn btn-primary" @click="startGame">
        <Gamepad2 :size="20" />
        开始游戏
      </button>
    </div>

    <div v-if="gameStarted" class="game-status">
      <div class="status-item">
        <span class="label">游戏状态:</span>
        <span class="value" :class="gameStatusClass">{{ gameStatusText }}</span>
      </div>
      <div class="status-item">
        <span class="label">回合数:</span>
        <span class="value">{{ turnCount }}</span>
      </div>
      <div v-if="currentPlayer" class="status-item current-player-info">
        <span class="label">当前玩家:</span>
        <div class="player-info">
          <div class="player-avatar" :style="{ backgroundColor: currentPlayer.color }"></div>
          <span class="player-name">{{ currentPlayer.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="gameFinished" class="game-over">
      <h3>
        <Trophy :size="24" />
        游戏结束！
      </h3>
      <p v-if="winner">{{ winner.name }} 获胜！</p>
      <button class="btn btn-primary" @click="resetGame">
        <Gamepad2 :size="20" />
        再来一局
      </button>
    </div>
  </div>
</template>

<style scoped>
  .game-controls {
    margin-bottom: 1rem;
    padding: 1.5rem;
  }

  .control-buttons {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .game-status {
    display: flex;
    justify-content: space-around;
    gap: clamp(1rem, 4vw, 2rem);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    background: var(--bg-surface);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(0.2rem, 0.5vw, 0.25rem);
  }

  .label {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: var(--text-muted);
  }

  .value {
    font-weight: bold;
    font-size: clamp(1rem, 3vw, 1.1rem);
    color: var(--text-primary);
  }

  .status-waiting {
    color: var(--player-2);
  }

  .status-rolling {
    color: var(--player-1);
    animation: pulse 1s infinite;
  }

  .status-moving {
    color: var(--player-3);
  }

  .status-showing_effect {
    color: var(--color-restart);
    animation: pulse 1s infinite;
  }

  .status-finished {
    color: var(--player-8);
  }

  .current-player-info {
    background: rgba(102, 126, 234, 0.1);
    border-radius: var(--radius-sm);
    padding: clamp(0.5rem, 1.5vw, 0.8rem);
    border: 1px solid rgba(102, 126, 234, 0.25);
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
  }

  .player-avatar {
    width: clamp(20px, 5vw, 24px);
    height: clamp(20px, 5vw, 24px);
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .player-name {
    font-weight: bold;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: var(--text-primary);
  }

  .game-over {
    text-align: center;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: rgba(245, 158, 11, 0.08);
    border-radius: var(--radius-md);
    border: 1px solid rgba(245, 158, 11, 0.25);
    margin-top: 1rem;
  }

  .game-over h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-warning);
    font-size: clamp(1.2rem, 3.5vw, 1.5rem);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .game-over p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .game-controls {
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .control-buttons {
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .game-status {
      gap: clamp(0.5rem, 2vw, 1rem);
      padding: clamp(0.5rem, 2vw, 0.8rem);
    }

    .game-over {
      padding: clamp(1rem, 3vw, 1.5rem);
    }

    .game-over h3 {
      font-size: clamp(1rem, 3vw, 1.2rem);
      margin-bottom: 0.4rem;
    }

    .game-over p {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      margin-bottom: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .game-controls {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .control-buttons {
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .game-status {
      gap: clamp(0.4rem, 1.5vw, 0.5rem);
      padding: clamp(0.4rem, 1.5vw, 0.5rem);
    }

    .game-over {
      padding: clamp(0.75rem, 2.5vw, 1rem);
    }
  }

  @media (max-width: 360px) {
    .game-controls {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .game-status {
      gap: clamp(0.3rem, 1.2vw, 0.4rem);
      padding: clamp(0.3rem, 1.2vw, 0.4rem);
    }
  }

  @media (max-width: 767px) and (orientation: landscape) {
    .game-controls {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .game-status {
      gap: clamp(0.3rem, 1.2vw, 0.4rem);
      padding: clamp(0.3rem, 1.2vw, 0.4rem);
    }

    .game-over {
      padding: clamp(0.6rem, 2vw, 0.75rem);
    }
  }
</style>
