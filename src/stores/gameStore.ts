import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useLocalGameSession } from '../composables/useLocalGameSession'
import { usePartyMode } from '../composables/usePartyMode'
import { loadGameMode, loadVictoryConfig } from '../utils/cache'
import { createLocalPartyMomentumCompletion } from '../services/localPartyMomentum'
import type { PartyEventState, PartyEventCard, PartyMiniGameKind } from '@flying-chess/game-core/party-events'
import type { PunishmentAction, ResolvedPunishmentResult, Player } from '@flying-chess/game-core/types'
import type { PartyPunishmentInterventionOption } from '@flying-chess/game-core/party-interventions'

export const useGameStore = defineStore('game', () => {
  // 1. Core Session State
  const localGameSession = useLocalGameSession({
    selectedMode: loadGameMode(),
    victoryConfig: loadVictoryConfig(),
  })
  
  const partyMode = usePartyMode()
  const localPartyMomentum = createLocalPartyMomentumCompletion()
  
  const isPartyGame = computed(() => localGameSession.activeMode.value === 'party' && partyMode.isActive.value)
  
  // 2. Overlay & UI State
  const audioEnabled = ref(true)
  const isMobileView = ref(false)
  const cellInspectorOpen = ref(false)
  const selectedCellPosition = ref<number | null>(null)
  const turnCount = ref(0)
  const lastEffect = ref<string>('')
  
  // 3. Modals and Interactions State
  const currentPunishment = ref<PunishmentAction | null>(null)
  const currentPunishmentExecutor = ref<Player | null>(null)
  const currentPunishmentTarget = ref<Player | null>(null)
  const currentPunishmentVariant = ref<any>(null)
  
  const partyDiceDecisionVisible = ref(false)
  const partyPunishmentChoices = ref<readonly PunishmentAction[]>([])
  const partyPunishmentInterventionResolution = ref<ResolvedPunishmentResult | null>(null)
  const partyPunishmentInterventionOptions = ref<readonly PartyPunishmentInterventionOption[]>([])
  
  const deferredPartyPunishments = ref<any[]>([])
  const boundPartyPunishments = ref<ResolvedPunishmentResult[]>([])
  
  const partyEventState = ref<PartyEventState | null>(null)
  const currentPartyEvent = ref<PartyEventCard | null>(null)
  const currentPartyMiniGameKind = ref<PartyMiniGameKind | null>(null)
  const partyTieCandidates = ref<readonly number[]>([])
  
  const sessionPaused = localGameSession.sessionPaused

  return {
    localGameSession,
    partyMode,
    localPartyMomentum,
    isPartyGame,
    
    // UI
    audioEnabled,
    isMobileView,
    cellInspectorOpen,
    selectedCellPosition,
    turnCount,
    lastEffect,
    
    // Modals
    currentPunishment,
    currentPunishmentExecutor,
    currentPunishmentTarget,
    currentPunishmentVariant,
    partyDiceDecisionVisible,
    partyPunishmentChoices,
    partyPunishmentInterventionResolution,
    partyPunishmentInterventionOptions,
    deferredPartyPunishments,
    boundPartyPunishments,
    partyEventState,
    currentPartyEvent,
    currentPartyMiniGameKind,
    partyTieCandidates,
    
    sessionPaused,
  }
})
