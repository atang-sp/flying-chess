<script setup lang="ts">
  import { computed } from 'vue'
  import type { PlayerView } from '../../types/network'
  import MiniBoard from './MiniBoard.vue'
  import ActionPanel from './ActionPanel.vue'
  import ControllerDice from './ControllerDice.vue'
  import ConnectionStatus from './ConnectionStatus.vue'

  const props = defineProps<{
    view: PlayerView
  }>()

  const emit = defineEmits<{
    action: [payload: { type: string; [key: string]: unknown }]
  }>()

  const myPlayer = computed(() => props.view.allPlayers[props.view.myIndex])

  const actLabel = computed(() => {
    const map: Record<string, string> = { warmup: '暖场', heating: '升温', finale: '终局' }
    return map[props.view.currentAct] ?? props.view.currentAct
  })

  const showDice = computed(
    () => props.view.isMyTurn && !props.view.pendingAction && props.view.gameStatus === 'waiting'
  )

  const hasPendingAction = computed(() => props.view.pendingAction !== null)

  function handleAction(payload: { type: string; [key: string]: unknown }): void {
    emit('action', payload)
  }
</script>

<template>
  <div class="controller-main">
    <header class="controller-header">
      <div class="player-identity">
        <span class="player-dot" :style="{ background: myPlayer?.color ?? '#888' }" />
        <span class="player-name">{{ myPlayer?.name ?? '玩家' }}</span>
        <ConnectionStatus status="connected" />
      </div>
      <div class="game-meta">
        <span class="act-badge">{{ actLabel }}</span>
        <span class="round-label">R{{ view.roundNumber }}</span>
        <span class="token-badge" title="干预筹码">🎫 {{ view.tokensRemaining }}</span>
      </div>
    </header>

    <MiniBoard :players="view.allPlayers" :my-index="view.myIndex" :board-size="view.boardSize" />

    <div class="turn-indicator" :class="{ active: view.isMyTurn }">
      {{ view.isMyTurn ? '你的回合' : '等待其他玩家...' }}
    </div>

    <!-- Dice area when it's my turn and no pending action -->
    <div v-if="showDice" class="dice-section">
      <ControllerDice
        :disabled="false"
        :dice-value="view.diceValue"
        @roll="handleAction({ type: 'roll_dice' })"
      />
    </div>

    <!-- Pending action panel -->
    <ActionPanel v-if="hasPendingAction" :view="view" @action="handleAction" />

    <!-- Dice result display when not my turn -->
    <div v-if="!view.isMyTurn && view.diceValue" class="dice-result">
      <span class="dice-result-value">🎲 {{ view.diceValue }}</span>
    </div>

    <div v-if="view.lastEffect" class="last-effect">
      {{ view.lastEffect }}
    </div>

    <!-- Waiting state -->
    <div v-if="!view.isMyTurn && !hasPendingAction && !view.lastEffect" class="waiting-idle">
      <ControllerDice :disabled="true" :dice-value="view.diceValue" @roll="() => {}" />
    </div>
  </div>
</template>

<style scoped>
  .controller-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
  }

  .controller-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .player-identity {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.1rem;
  }

  .player-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .game-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--color-text-muted, #8a8780);
  }

  .act-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    font-weight: 600;
  }

  .token-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    background: rgba(225, 194, 127, 0.1);
    font-weight: 600;
  }

  .turn-indicator {
    text-align: center;
    padding: 0.4rem;
    border-radius: var(--radius-md, 8px);
    font-weight: 600;
    font-size: 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-muted, #8a8780);
    transition: all 0.3s;
  }

  .turn-indicator.active {
    background: rgba(225, 194, 127, 0.15);
    color: var(--color-accent, #e1c27f);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(225, 194, 127, 0);
    }
    50% {
      box-shadow: 0 0 12px 2px rgba(225, 194, 127, 0.2);
    }
  }

  .dice-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dice-result {
    text-align: center;
    padding: 0.75rem;
  }

  .dice-result-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .last-effect {
    text-align: center;
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    color: var(--color-text-muted, #8a8780);
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md, 8px);
  }

  .waiting-idle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }
</style>
