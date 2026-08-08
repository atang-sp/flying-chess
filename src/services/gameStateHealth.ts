import type { GameState } from '@flying-chess/game-core/types'

export interface BlockingOverlayState {
  takeoffPunishment: boolean
  trap: boolean
  bounce: boolean
  takeoffRelief: boolean
  doublePunishmentReveal: boolean
  chainPunishmentRoll: boolean
  mercyDecision: boolean
  sessionPaused: boolean
  partyInteraction: boolean
}

export const hasBlockingOverlay = (overlays: BlockingOverlayState): boolean =>
  Object.values(overlays).some(Boolean)

export const shouldRecoverMovingState = (
  gameStatus: GameState['gameStatus'],
  movingDurationMs: number,
  overlays: BlockingOverlayState
): boolean => gameStatus === 'moving' && movingDurationMs > 5000 && !hasBlockingOverlay(overlays)
