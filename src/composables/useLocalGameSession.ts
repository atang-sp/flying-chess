import { reactive, ref } from 'vue'
import { createBoardConfig, createPunishmentConfig } from '@flying-chess/game-core/config'
import type { GameMode } from '../config/modes'
import type { GameState, VictoryConfig } from '@flying-chess/game-core/types'

export interface LocalGameSessionOptions {
  readonly selectedMode: GameMode
  readonly victoryConfig: VictoryConfig
}

/** Owns the core local-session lifecycle; overlays remain presentation state in App.vue. */
export function useLocalGameSession(options: LocalGameSessionOptions) {
  const gameState = reactive<GameState>({
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    gameStatus: 'intro',
    winner: null,
    board: [],
    punishmentConfig: createPunishmentConfig(),
    boardConfig: createBoardConfig(),
    pendingEffect: null,
  })
  const gameStarted = ref(false)
  const gameFinished = ref(false)
  const sessionPaused = ref(false)
  const selectedMode = ref<GameMode>(options.selectedMode)
  const activeMode = ref<GameMode | null>(null)
  const victoryConfig = ref<VictoryConfig>(options.victoryConfig)

  return {
    gameState,
    gameStarted,
    gameFinished,
    sessionPaused,
    selectedMode,
    activeMode,
    victoryConfig,
    showIntro(): void {
      gameState.gameStatus = 'intro'
    },
    recoverStalledMovement(): void {
      gameState.gameStatus = 'waiting'
      gameState.diceValue = null
      gameState.pendingEffect = null
      for (const player of gameState.players) player.isMoving = false
    },
  }
}
