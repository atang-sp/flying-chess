import type { Player, VictoryConfig } from '../types/game'

export const DEFAULT_VICTORY_CONFIG: Readonly<VictoryConfig> = Object.freeze({
  actionText: '用手掌打屁股',
  baseCount: 5,
  countUnit: '下',
  loserGradientEnabled: false,
  gradientStep: 5,
})

export function normalizeVictoryConfig(value: unknown): VictoryConfig {
  if (!value || typeof value !== 'object') return { ...DEFAULT_VICTORY_CONFIG }
  const candidate = value as Partial<VictoryConfig>
  const actionText = typeof candidate.actionText === 'string' ? candidate.actionText.trim() : ''
  const countUnit = typeof candidate.countUnit === 'string' ? candidate.countUnit.trim() : ''

  return {
    actionText: actionText.slice(0, 80) || DEFAULT_VICTORY_CONFIG.actionText,
    baseCount:
      Number.isInteger(candidate.baseCount) && (candidate.baseCount ?? -1) >= 0
        ? Math.min(candidate.baseCount ?? 0, 999)
        : DEFAULT_VICTORY_CONFIG.baseCount,
    countUnit: countUnit.slice(0, 8) || DEFAULT_VICTORY_CONFIG.countUnit,
    loserGradientEnabled:
      typeof candidate.loserGradientEnabled === 'boolean'
        ? candidate.loserGradientEnabled
        : DEFAULT_VICTORY_CONFIG.loserGradientEnabled,
    gradientStep:
      Number.isInteger(candidate.gradientStep) && (candidate.gradientStep ?? -1) >= 0
        ? Math.min(candidate.gradientStep ?? 0, 999)
        : DEFAULT_VICTORY_CONFIG.gradientStep,
  }
}

export interface VictorySettlementEntry {
  readonly playerIndex: number
  readonly place: number
  readonly count: number
}

export function resolveVictorySettlement(
  players: readonly Player[],
  winnerPlayerIndex: number,
  config: VictoryConfig
): readonly VictorySettlementEntry[] {
  if (
    !Number.isInteger(winnerPlayerIndex) ||
    winnerPlayerIndex < 0 ||
    winnerPlayerIndex >= players.length
  ) {
    throw new Error('终局结算需要有效的获胜玩家')
  }
  if (
    !Number.isInteger(config.baseCount) ||
    config.baseCount < 0 ||
    !Number.isInteger(config.gradientStep) ||
    config.gradientStep < 0
  ) {
    throw new Error('终局奖惩次数必须是非负整数')
  }

  const loserPositions = [
    ...new Set(
      players.flatMap((player, index) => (index === winnerPlayerIndex ? [] : [player.position]))
    ),
  ].sort((left, right) => right - left)

  return Object.freeze(
    players.flatMap((player, playerIndex) => {
      if (playerIndex === winnerPlayerIndex) return []
      const positionTier = loserPositions.indexOf(player.position)
      const place = positionTier + 2
      const count =
        config.baseCount + (config.loserGradientEnabled ? positionTier * config.gradientStep : 0)
      return [Object.freeze({ playerIndex, place, count })]
    })
  )
}
