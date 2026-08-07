import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { HostNetworkManager } from '../services/networkService'
import { projectPlayerView } from '../services/syncProtocol'
import type {
  ConnectionStatus,
  ConnectedPlayer,
  ControllerMessage,
  RequiredAction,
  RoomInfo,
} from '../types/network'
import type { GameState, VictoryConfig } from '../types/game'
import type { PartySession } from '../services/partyMode'
import type { PartyPunishmentIntervention } from '../services/partyPunishmentInterventions'
import { devLog } from '../utils/logger'
import { resolveVictorySettlement } from '../services/victorySettlement'

export interface MultiDeviceHostActions {
  handleDiceRoll: () => Promise<void>
  performDiceRoll: (isReroll?: boolean) => Promise<void>
  handlePartyReactionPrediction: (prediction: 'low' | 'high') => Promise<void>
  handlePartyReactionDecision: (decision: 'keep' | 'mirror') => Promise<void>
  handlePartyReroll: () => Promise<void>
  continuePartyMove: () => Promise<void>
  resolvePartyPunishmentChoice: (selectedIndex?: number) => Promise<void>
  resolvePartyPunishmentIntervention: (intervention: PartyPunishmentIntervention) => Promise<void>
  confirmPunishment: () => Promise<void>
  confirmEffect: () => Promise<void>
  handleTrapDismiss: () => void
  handleTrapChoiceDismiss: () => void
  handleQADismiss: () => void
  handleDareDismiss: () => void
  handleBounceConfirm: () => void
  handleTakeoffPunishmentDismiss: () => void
  handleTakeoffReliefDismiss: () => void
  handlePartyTieBreakRoll: (playerIndex: number) => void
}

export interface MultiDeviceOverlayState {
  currentPunishment: boolean
  showTakeoffPunishment: boolean
  showTrap: boolean
  showTrapChoice: boolean
  showQA: boolean
  showDare: boolean
  showBounce: boolean
  showEffect: boolean
  showTakeoffRelief: boolean
}

export interface MultiDeviceHostDeps {
  gameState: GameState
  partySession: ComputedRef<PartySession | null>
  lastEffect: Ref<string>
  gameStarted: Ref<boolean>
  gameFinished: Ref<boolean>
  isPartyGame: ComputedRef<boolean>
  sessionPaused: Ref<boolean>
  canRollDice: ComputedRef<boolean>
  victoryConfig: Ref<VictoryConfig>
  overlayState: () => MultiDeviceOverlayState
  actions: MultiDeviceHostActions
}

export function controllerMessageMatchesRequiredAction(
  message: ControllerMessage,
  requiredAction: RequiredAction | null,
  canRollDice: boolean
): boolean {
  switch (message.type) {
    case 'join':
      return false
    case 'roll_dice':
      return canRollDice && (requiredAction === null || requiredAction.type === 'roll_dice')
    case 'predict':
      return requiredAction?.type === 'predict'
    case 'reaction_decision':
      return requiredAction?.type === 'reaction_decision'
    case 'reroll':
      return requiredAction?.type === 'dice_decision' && requiredAction.canReroll
    case 'continue_move':
      return requiredAction?.type === 'dice_decision'
    case 'select_punishment':
    case 'skip_punishment_choice':
      return requiredAction?.type === 'punishment_choice'
    case 'punishment_intervention':
      return (
        requiredAction?.type === 'punishment_intervention' &&
        requiredAction.actions.includes(message.action) &&
        (message.action !== 'transfer' ||
          requiredAction.transferTargets.some(
            target => target.playerIndex === message.targetPlayerIndex
          ))
      )
    case 'decline_punishment_intervention':
      return requiredAction?.type === 'punishment_intervention'
    case 'acknowledge':
      return requiredAction?.type === 'acknowledge'
    case 'tiebreak_roll':
      return requiredAction?.type === 'tiebreak_roll'
  }
}

export function useMultiDeviceHost(deps: MultiDeviceHostDeps) {
  const enabled = ref(false)
  const hostStatus = ref<ConnectionStatus>('disconnected')
  const roomInfo = ref<RoomInfo | null>(null)
  const connectedPlayers = ref<ConnectedPlayer[]>([])
  const pairingOffer = ref('')
  const pairingError = ref<string | null>(null)

  const peerToPlayerIndex = new Map<string, number>()
  const playerToPeer = new Map<number, string>()
  const pendingActions = ref<Map<number, RequiredAction>>(new Map())

  let network: HostNetworkManager | null = null
  let broadcastTimer: ReturnType<typeof setInterval> | null = null
  let pairingOfferGeneration: Promise<void> | null = null

  const isActive = computed(() => enabled.value && hostStatus.value === 'connected')
  const allPlayersConnected = computed(() => {
    if (!enabled.value) return false
    const needed = deps.gameState.players.length
    return connectedPlayers.value.filter(p => p.status === 'connected').length >= needed
  })

  function isRemotePlayer(playerIndex: number): boolean {
    return enabled.value && playerToPeer.has(playerIndex)
  }

  function getConnectedPlayerCount(): number {
    return connectedPlayers.value.filter(p => p.status === 'connected').length
  }

  function sendPlayerAssignment(peerId: string, playerIndex: number): void {
    const player = deps.gameState.players[playerIndex]
    if (!player) return
    network?.sendTo(peerId, {
      type: 'player_assigned',
      playerIndex,
      player: {
        id: player.id,
        name: player.name,
        color: player.color,
        position: player.position,
        hasTakenOff: player.hasTakenOff ?? false,
        isWinner: player.isWinner,
      },
    })
  }

  function assignPlayerIndex(peerId: string): number {
    const existingIndex = peerToPlayerIndex.get(peerId)
    if (existingIndex !== undefined) {
      sendPlayerAssignment(peerId, existingIndex)
      return existingIndex
    }

    // Check if any previously assigned player slot has a disconnected peer
    // (reconnect scenario with new peerId)
    for (const [oldPeerId, idx] of peerToPlayerIndex) {
      if (!network?.isConnected(oldPeerId)) {
        peerToPlayerIndex.delete(oldPeerId)
        peerToPlayerIndex.set(peerId, idx)
        playerToPeer.set(idx, peerId)
        updateConnectedPlayers()
        sendPlayerAssignment(peerId, idx)
        return idx
      }
    }

    const takenIndices = new Set(peerToPlayerIndex.values())
    for (let i = 0; i < deps.gameState.players.length; i++) {
      if (!takenIndices.has(i)) {
        peerToPlayerIndex.set(peerId, i)
        playerToPeer.set(i, peerId)
        updateConnectedPlayers()
        sendPlayerAssignment(peerId, i)
        return i
      }
    }
    network?.sendTo(peerId, { type: 'error', message: '房间已满' })
    return -1
  }

  function updateConnectedPlayers(): void {
    connectedPlayers.value = [...peerToPlayerIndex.entries()].map(([peerId, playerIndex]) => ({
      playerIndex,
      peerId,
      status: network?.isConnected(peerId) ? 'connected' : 'disconnected',
    }))
  }

  function handlePlayerMessage(peerId: string, msg: ControllerMessage): void {
    const playerIndex = peerToPlayerIndex.get(peerId)

    if (msg.type === 'join') {
      assignPlayerIndex(peerId)
      broadcastStateToAll()
      return
    }

    if (playerIndex === undefined) {
      devLog('[MultiDeviceHost] Message from unassigned peer:', peerId)
      return
    }

    routeControllerAction(playerIndex, msg)
  }

  function routeControllerAction(playerIndex: number, msg: ControllerMessage): void {
    const requiredAction = requiredActionForPlayer(playerIndex)
    const canRollDice = deps.canRollDice.value && deps.gameState.currentPlayerIndex === playerIndex
    if (!controllerMessageMatchesRequiredAction(msg, requiredAction, canRollDice)) return
    if (requiredAction?.type !== 'roll_dice') clearPendingAction(playerIndex)

    switch (msg.type) {
      case 'roll_dice':
        if (deps.gameState.currentPlayerIndex === playerIndex) {
          deps.actions.handleDiceRoll()
        }
        break
      case 'predict':
        deps.actions.handlePartyReactionPrediction(msg.prediction)
        break
      case 'reaction_decision':
        deps.actions.handlePartyReactionDecision(msg.decision)
        break
      case 'reroll':
        deps.actions.handlePartyReroll()
        break
      case 'continue_move':
        deps.actions.continuePartyMove()
        break
      case 'select_punishment':
        deps.actions.resolvePartyPunishmentChoice(msg.index)
        break
      case 'skip_punishment_choice':
        deps.actions.resolvePartyPunishmentChoice()
        break
      case 'punishment_intervention':
        deps.actions.resolvePartyPunishmentIntervention(
          msg.action === 'transfer'
            ? {
                action: msg.action,
                playerIndex,
                targetPlayerIndex: msg.targetPlayerIndex ?? -1,
              }
            : { action: msg.action, playerIndex }
        )
        break
      case 'decline_punishment_intervention':
        clearPendingAction(playerIndex)
        broadcastStateToAll()
        break
      case 'acknowledge':
        handleRemoteAcknowledge(playerIndex)
        break
      case 'tiebreak_roll':
        deps.actions.handlePartyTieBreakRoll(playerIndex)
        break
      default:
        devLog('[MultiDeviceHost] Unknown message type:', msg)
    }
  }

  function handleRemoteAcknowledge(playerIndex: number): void {
    if (deps.gameState.currentPlayerIndex !== playerIndex) return
    const overlays = deps.overlayState()

    if (overlays.currentPunishment) {
      deps.actions.confirmPunishment()
    } else if (overlays.showTakeoffPunishment) {
      deps.actions.handleTakeoffPunishmentDismiss()
    } else if (overlays.showTrap) {
      deps.actions.handleTrapDismiss()
    } else if (overlays.showTrapChoice) {
      deps.actions.handleTrapChoiceDismiss()
    } else if (overlays.showQA) {
      deps.actions.handleQADismiss()
    } else if (overlays.showDare) {
      deps.actions.handleDareDismiss()
    } else if (overlays.showBounce) {
      deps.actions.handleBounceConfirm()
    } else if (overlays.showEffect) {
      deps.actions.confirmEffect()
    } else if (overlays.showTakeoffRelief) {
      deps.actions.handleTakeoffReliefDismiss()
    }
  }

  function broadcastStateToAll(): void {
    if (!network || !enabled.value) return

    for (const [peerId, playerIndex] of peerToPlayerIndex) {
      if (!network.isConnected(peerId)) continue

      const action = requiredActionForPlayer(playerIndex)
      const view = projectPlayerView(
        playerIndex,
        deps.gameState,
        deps.partySession.value,
        action,
        deps.lastEffect.value || null
      )
      network.sendTo(peerId, { type: 'state_update', view })
    }
  }

  function requiredActionForPlayer(playerIndex: number): RequiredAction | null {
    const explicitAction = pendingActions.value.get(playerIndex)
    if (explicitAction) return explicitAction
    if (
      deps.canRollDice.value &&
      deps.gameState.currentPlayerIndex === playerIndex &&
      deps.gameStarted.value &&
      !deps.gameFinished.value
    ) {
      return { type: 'roll_dice' }
    }
    if (
      deps.gameState.currentPlayerIndex === playerIndex &&
      Object.values(deps.overlayState()).some(Boolean)
    ) {
      return { type: 'acknowledge', message: deps.lastEffect.value || '请在主屏查看并确认当前操作' }
    }
    return null
  }

  function requestAction(playerIndex: number, action: RequiredAction): void {
    pendingActions.value.set(playerIndex, action)
    broadcastStateToAll()
  }

  function clearPendingAction(playerIndex: number): void {
    pendingActions.value.delete(playerIndex)
  }

  async function createPairingOffer(): Promise<void> {
    if (!network || pairingOfferGeneration) return pairingOfferGeneration ?? Promise.resolve()
    pairingError.value = null
    pairingOfferGeneration = network
      .createPairingOffer()
      .then(offer => {
        pairingOffer.value = offer
      })
      .catch(error => {
        pairingError.value = error instanceof Error ? error.message : '无法生成局域网配对邀请'
      })
      .finally(() => {
        pairingOfferGeneration = null
      })
    return pairingOfferGeneration
  }

  async function acceptPairingAnswer(answer: string): Promise<boolean> {
    if (!network) return false
    pairingError.value = null
    try {
      await network.acceptPairingAnswer(answer)
      pairingOffer.value = ''
      return true
    } catch (error) {
      pairingError.value = error instanceof Error ? error.message : '无法接受局域网配对应答'
      return false
    }
  }

  async function startHost(): Promise<RoomInfo> {
    enabled.value = true

    network = new HostNetworkManager({
      onPlayerConnected: peerId => {
        devLog('[MultiDeviceHost] Player connected:', peerId)
        updateConnectedPlayers()
        if (network && network.connectedPeerIds.length < deps.gameState.players.length) {
          void createPairingOffer()
        }
      },
      onPlayerDisconnected: peerId => {
        devLog('[MultiDeviceHost] Player disconnected:', peerId)
        updateConnectedPlayers()
      },
      onPlayerMessage: handlePlayerMessage,
    })

    network.onStatusChange(status => {
      hostStatus.value = status
    })

    const roomId = await network.open()
    const gameUrl = `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}controller.html`

    roomInfo.value = {
      roomId,
      hostPeerId: network.hostPeerId,
      gameUrl,
    }

    await createPairingOffer()
    startBroadcastLoop()
    return roomInfo.value
  }

  function startBroadcastLoop(): void {
    if (broadcastTimer) clearInterval(broadcastTimer)
    broadcastTimer = setInterval(() => {
      if (deps.gameStarted.value && !deps.gameFinished.value) {
        broadcastStateToAll()
      }
    }, 2000)
  }

  function stopHost(): void {
    if (broadcastTimer) {
      clearInterval(broadcastTimer)
      broadcastTimer = null
    }
    network?.broadcast({ type: 'room_closed' })
    network?.close()
    network = null
    enabled.value = false
    hostStatus.value = 'disconnected'
    roomInfo.value = null
    pairingOffer.value = ''
    pairingError.value = null
    connectedPlayers.value = []
    peerToPlayerIndex.clear()
    playerToPeer.clear()
    pendingActions.value.clear()
  }

  watch(
    () => [
      deps.gameState.gameStatus,
      deps.gameState.currentPlayerIndex,
      deps.gameState.diceValue,
      deps.gameState.players.map(p => p.position),
      deps.partySession.value?.reaction?.status,
    ],
    () => {
      if (enabled.value) broadcastStateToAll()
    },
    { deep: true }
  )

  watch(
    () => deps.gameFinished.value,
    finished => {
      if (finished && enabled.value && deps.gameState.winner) {
        const winnerPlayerIndex = deps.gameState.players.findIndex(
          player => player.id === deps.gameState.winner?.id
        )
        const settlements = new Map(
          resolveVictorySettlement(
            deps.gameState.players,
            winnerPlayerIndex,
            deps.victoryConfig.value
          ).map(entry => [entry.playerIndex, entry])
        )
        for (const [peerId, playerIndex] of peerToPlayerIndex) {
          const settlement = settlements.get(playerIndex)
          network?.sendTo(peerId, {
            type: 'game_ended',
            winnerName: deps.gameState.winner.name,
            settlement: settlement
              ? {
                  actionText: deps.victoryConfig.value.actionText,
                  count: settlement.count,
                  countUnit: deps.victoryConfig.value.countUnit,
                  place: settlement.place,
                }
              : undefined,
          })
        }
      }
    }
  )

  watch(
    () => deps.sessionPaused.value,
    () => {
      if (enabled.value) broadcastStateToAll()
    }
  )

  onUnmounted(() => {
    stopHost()
  })

  return {
    enabled,
    isActive,
    hostStatus,
    roomInfo,
    connectedPlayers,
    pairingOffer,
    pairingError,
    allPlayersConnected,
    isRemotePlayer,
    getConnectedPlayerCount,
    requestAction,
    clearPendingAction,
    broadcastStateToAll,
    createPairingOffer,
    acceptPairingAnswer,
    startHost,
    stopHost,
  }
}
