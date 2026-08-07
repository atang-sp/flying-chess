import type { Player } from './domainTypes'

export const DEFAULT_PLAYER_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
] as const

export interface PlayerRosterInput {
  readonly count: number
  readonly names: readonly string[]
  readonly colors: readonly string[]
}

/** Creates the complete initial state for a local or online player roster. */
export function createPlayerRoster({ count, names, colors }: PlayerRosterInput): Player[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('玩家数量必须是非负整数')
  }
  if (colors.length === 0) {
    throw new Error('至少需要一种玩家颜色')
  }

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: names[index] || `玩家${index + 1}`,
    color: colors[index % colors.length] as string,
    position: 0,
    isWinner: false,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }))
}

export function hasPlayerWon(player: Pick<Player, 'position'>, boardSize = 40): boolean {
  return player.position >= boardSize
}

export function nextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  if (!Number.isInteger(totalPlayers) || totalPlayers <= 0) {
    throw new Error('玩家总数必须是正整数')
  }
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= totalPlayers) {
    throw new Error('当前玩家索引超出范围')
  }
  return (currentIndex + 1) % totalPlayers
}
