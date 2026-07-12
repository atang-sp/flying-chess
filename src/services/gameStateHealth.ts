import type { GameState } from '../types/game'

export interface BlockingOverlayState {
  takeoffPunishment: boolean
  trap: boolean
  bounce: boolean
  takeoffRelief: boolean
  doublePunishmentReveal: boolean
  chainPunishmentRoll: boolean
  mercyDecision: boolean
}

export const hasBlockingOverlay = (overlays: BlockingOverlayState): boolean =>
  Object.values(overlays).some(Boolean)

export const shouldRecoverMovingState = (
  gameStatus: GameState['gameStatus'],
  movingDurationMs: number,
  overlays: BlockingOverlayState
): boolean => gameStatus === 'moving' && movingDurationMs > 5000 && !hasBlockingOverlay(overlays)
