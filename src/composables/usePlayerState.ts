import { GameService } from '../services/gameService'
import type { Player } from '../types/game'
import type { PlayerSettings } from '../utils/cache'

export function usePlayerState() {
  const createPlayersFromSettings = (settings?: PlayerSettings | null): Player[] => {
    if (!settings) {
      return GameService.createPlayers()
    }
    return GameService.createCustomPlayers(settings.playerCount, settings.playerNames)
  }

  const createPlayersForReset = (
    currentPlayers: Player[],
    fallbackSettings?: PlayerSettings | null
  ): Player[] => {
    if (currentPlayers.length > 0) {
      const currentNames = currentPlayers.map(player => player.name)
      return GameService.createCustomPlayers(currentPlayers.length, currentNames)
    }
    return createPlayersFromSettings(fallbackSettings)
  }

  return {
    createPlayersFromSettings,
    createPlayersForReset,
  }
}
