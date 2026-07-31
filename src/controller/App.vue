<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMultiDeviceController } from '../composables/useMultiDeviceController'
import type { ControllerMessage } from '../types/network'
import ConnectionScreen from './components/ConnectionScreen.vue'
import ControllerMain from './components/ControllerMain.vue'
import GameEndScreen from './components/GameEndScreen.vue'

const controller = useMultiDeviceController()

function sendAction(action: { type: string; [key: string]: unknown }): void {
  controller.send(action as ControllerMessage)
}

const showGame = computed(
  () => controller.isReady.value && !controller.gameEnded.value
)

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const roomParam = params.get('room')
  if (roomParam) {
    controller.connect(roomParam)
  }
})
</script>

<template>
  <div class="controller-root">
    <ConnectionScreen
      v-if="!controller.isReady.value && !controller.gameEnded.value"
      :status="controller.status.value"
      :error="controller.errorMessage.value"
      :room-id="controller.status.value === 'connected' ? '' : ''"
      @connect="controller.connect"
    />
    <ControllerMain
      v-else-if="showGame"
      :view="controller.playerView.value!"
      @action="sendAction"
    />
    <GameEndScreen
      v-else-if="controller.gameEnded.value"
      :winner-name="controller.winnerName.value"
      :my-name="controller.assignedPlayer.value?.name"
      :settlement="controller.victorySettlement.value"
    />
  </div>
</template>

<style scoped>
.controller-root {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-background, #0a0a1a);
  color: var(--color-text, #e8e6e3);
  display: flex;
  flex-direction: column;
}
</style>
