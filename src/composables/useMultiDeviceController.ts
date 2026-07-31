import { ref, computed, onUnmounted } from 'vue'
import { ControllerNetworkManager } from '../services/networkService'
import type {
  ConnectionStatus,
  HostMessage,
  ControllerMessage,
  PlayerView,
  PublicPlayerInfo,
  ControllerVictorySettlement,
} from '../types/network'
import { devLog } from '../utils/logger'

export function useMultiDeviceController() {
  const status = ref<ConnectionStatus>('disconnected')
  const playerView = ref<PlayerView | null>(null)
  const assignedPlayerIndex = ref<number | null>(null)
  const assignedPlayer = ref<PublicPlayerInfo | null>(null)
  const errorMessage = ref<string | null>(null)
  const gameEnded = ref(false)
  const winnerName = ref<string | null>(null)
  const victorySettlement = ref<ControllerVictorySettlement | null>(null)

  let network: ControllerNetworkManager | null = null

  const isConnected = computed(() => status.value === 'connected')
  const isReady = computed(
    () => isConnected.value && assignedPlayerIndex.value !== null && playerView.value !== null
  )

  function handleMessage(msg: HostMessage): void {
    switch (msg.type) {
      case 'player_assigned':
        assignedPlayerIndex.value = msg.playerIndex
        assignedPlayer.value = msg.player
        devLog('[Controller] Assigned as player', msg.playerIndex, msg.player.name)
        break
      case 'state_update':
        playerView.value = msg.view
        break
      case 'game_ended':
        gameEnded.value = true
        winnerName.value = msg.winnerName
        victorySettlement.value = msg.settlement ?? null
        break
      case 'room_closed':
        errorMessage.value = '房间已关闭'
        playerView.value = null
        assignedPlayerIndex.value = null
        break
      case 'error':
        errorMessage.value = msg.message
        break
    }
  }

  async function connect(roomId: string): Promise<void> {
    errorMessage.value = null
    gameEnded.value = false
    winnerName.value = null
    victorySettlement.value = null

    network = new ControllerNetworkManager({
      onConnected: () => {
        status.value = 'connected'
        network?.send({ type: 'join' })
      },
      onDisconnected: () => {
        status.value = 'disconnected'
      },
      onMessage: handleMessage,
    })

    network.onStatusChange((s) => {
      status.value = s
    })

    try {
      await network.connect(roomId)
    } catch {
      errorMessage.value = '无法连接到房间，请检查房间码是否正确'
      status.value = 'disconnected'
    }
  }

  function send(message: ControllerMessage): void {
    network?.send(message)
  }

  function disconnect(): void {
    network?.close()
    network = null
    status.value = 'disconnected'
    playerView.value = null
    assignedPlayerIndex.value = null
    assignedPlayer.value = null
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    status,
    playerView,
    assignedPlayerIndex,
    assignedPlayer,
    errorMessage,
    gameEnded,
    winnerName,
    victorySettlement,
    isConnected,
    isReady,
    connect,
    send,
    disconnect,
  }
}
