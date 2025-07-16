<script setup lang="ts">
  import { computed } from 'vue'
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
  <div class="game-controls">
    <div class="control-buttons">
      <button v-if="!gameStarted" class="btn btn-primary" @click="startGame">🎮 开始游戏</button>
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
      <h3>🎉 游戏结束！</h3>
      <p v-if="winner">{{ winner.name }} 获胜！</p>
      <button class="btn btn-primary" @click="resetGame">🎮 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
  .game-controls {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
  }

  .btn {
    padding: clamp(0.6rem, 2vw, 0.75rem) clamp(1.2rem, 3vw, 1.5rem);
    border: none;
    border-radius: clamp(4px, 1vw, 6px);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: clamp(0.4rem, 1vw, 0.5rem);
    min-height: clamp(36px, 8vw, 44px);
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-primary {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
    color: white;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
  }

  .btn-danger {
    background: linear-gradient(135deg, #ffa726, #ff9800);
    color: white;
  }

  .game-status {
    display: flex;
    justify-content: space-around;
    gap: clamp(1rem, 4vw, 2rem);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    background: #f8f9fa;
    border-radius: clamp(4px, 1vw, 6px);
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(0.2rem, 0.5vw, 0.25rem);
  }

  .label {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: #666;
  }

  .value {
    font-weight: bold;
    font-size: clamp(1rem, 3vw, 1.1rem);
  }

  .status-waiting {
    color: #4ecdc4;
  }

  .status-rolling {
    color: #ff6b6b;
    animation: pulse 1s infinite;
  }

  .status-moving {
    color: #45b7d1;
  }

  .status-showing_effect {
    color: #ab47bc;
    animation: pulse 1s infinite;
  }

  .status-finished {
    color: #96ceb4;
  }

  /* 当前玩家信息样式 */
  .current-player-info {
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(69, 183, 209, 0.1));
    border-radius: clamp(4px, 1vw, 6px);
    padding: clamp(0.5rem, 1.5vw, 0.8rem);
    border: 1px solid rgba(78, 205, 196, 0.3);
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
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .player-name {
    font-weight: bold;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: #333;
  }

  .game-over {
    text-align: center;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: linear-gradient(135deg, #fff8e1, #fffde7);
    border-radius: clamp(6px, 1.5vw, 8px);
    border: 2px solid #ffd700;
  }

  .game-over h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: clamp(1.2rem, 3.5vw, 1.5rem);
  }

  .game-over p {
    margin: 0 0 1rem 0;
    color: #666;
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
      border-radius: 6px;
    }

    .control-buttons {
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .btn {
      padding: clamp(0.5rem, 2vw, 0.6rem) clamp(1rem, 3vw, 1.2rem);
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      border-radius: 4px;
      min-height: clamp(36px, 8vw, 40px);
      gap: clamp(0.3rem, 1vw, 0.4rem);
    }

    .game-status {
      gap: clamp(0.5rem, 2vw, 1rem);
      padding: clamp(0.5rem, 2vw, 0.8rem);
      border-radius: 4px;
    }

    .status-item {
      gap: clamp(0.15rem, 0.5vw, 0.2rem);
    }

    .label {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .value {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .game-over {
      padding: clamp(1rem, 3vw, 1.5rem);
      border-radius: 6px;
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

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .game-controls {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .control-buttons {
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .btn {
      padding: clamp(0.4rem, 1.8vw, 0.5rem) clamp(0.8rem, 2.5vw, 1rem);
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      min-height: clamp(32px, 7vw, 36px);
      gap: clamp(0.25rem, 0.8vw, 0.3rem);
    }

    .game-status {
      gap: clamp(0.4rem, 1.5vw, 0.5rem);
      padding: clamp(0.4rem, 1.5vw, 0.5rem);
    }

    .status-item {
      gap: clamp(0.1rem, 0.4vw, 0.15rem);
    }

    .label {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .value {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .game-over {
      padding: clamp(0.75rem, 2.5vw, 1rem);
    }

    .game-over h3 {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
      margin-bottom: 0.3rem;
    }

    .game-over p {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      margin-bottom: 0.5rem;
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .game-controls {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .control-buttons {
      gap: 0.3rem;
      margin-bottom: 0.4rem;
    }

    .btn {
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      min-height: clamp(28px, 6vw, 32px);
      gap: clamp(0.2rem, 0.6vw, 0.25rem);
    }

    .game-status {
      gap: clamp(0.3rem, 1.2vw, 0.4rem);
      padding: clamp(0.3rem, 1.2vw, 0.4rem);
    }

    .status-item {
      gap: clamp(0.08rem, 0.3vw, 0.1rem);
    }

    .label {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .value {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .game-over {
      padding: clamp(0.6rem, 2vw, 0.75rem);
    }

    .game-over h3 {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      margin-bottom: 0.25rem;
    }

    .game-over p {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      margin-bottom: 0.4rem;
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .game-controls {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .control-buttons {
      gap: 0.3rem;
      margin-bottom: 0.4rem;
    }

    .btn {
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      min-height: clamp(28px, 6vw, 32px);
    }

    .game-status {
      gap: clamp(0.3rem, 1.2vw, 0.4rem);
      padding: clamp(0.3rem, 1.2vw, 0.4rem);
    }

    .status-item {
      gap: clamp(0.08rem, 0.3vw, 0.1rem);
    }

    .label {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .value {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .game-over {
      padding: clamp(0.6rem, 2vw, 0.75rem);
    }

    .game-over h3 {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      margin-bottom: 0.25rem;
    }

    .game-over p {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      margin-bottom: 0.4rem;
    }
  }
</style>
