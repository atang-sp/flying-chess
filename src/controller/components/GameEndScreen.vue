<script setup lang="ts">
  import type { ControllerVictorySettlement } from '../../types/network'

  defineProps<{
    winnerName: string | null
    myName: string | undefined
    settlement: ControllerVictorySettlement | null
  }>()
</script>

<template>
  <div class="game-end-screen">
    <div class="end-card">
      <div class="trophy">🏆</div>
      <h1>{{ $t('ctrl_game_over') }}</h1>
      <p v-if="winnerName" class="winner-text">
        {{
          winnerName === myName
            ? $t('ctrl_congrats_win')
            : $t('ctrl_player_won', { name: winnerName })
        }}
      </p>
      <div v-if="settlement" class="settlement-card">
        <span>{{ $t('ctrl_place_settlement', { place: settlement.place }) }}</span>
        <strong>
          {{ settlement.actionText }} {{ settlement.count }} {{ settlement.countUnit }}
        </strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .game-end-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .end-card {
    text-align: center;
  }

  .trophy {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .end-card h1 {
    font-size: 1.5rem;
    margin: 0 0 0.75rem;
  }

  .winner-text {
    color: var(--color-accent, #e1c27f);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .settlement-card {
    display: grid;
    gap: 0.35rem;
    margin-top: 1rem;
    padding: 1rem;
    color: var(--color-text, #e8e6e3);
    background: rgba(225, 194, 127, 0.1);
    border: 1px solid rgba(225, 194, 127, 0.28);
    border-radius: 12px;
  }

  .settlement-card span {
    color: var(--color-text-muted, #8a8780);
    font-size: 0.8rem;
  }
</style>
