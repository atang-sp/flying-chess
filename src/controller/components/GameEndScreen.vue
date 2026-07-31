<script setup lang="ts">
defineProps<{
  winnerName: string | null
  myName: string | undefined
}>()
</script>

<template>
  <div class="game-end-screen">
    <div class="end-card">
      <div class="trophy">🏆</div>
      <h1>游戏结束</h1>
      <p v-if="winnerName" class="winner-text">
        {{ winnerName === myName ? '恭喜你获胜！' : `${winnerName} 获得了胜利` }}
      </p>
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
</style>
