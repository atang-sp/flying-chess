export const PARTY_HEAT_MAX = 100
export const PARTY_HEATING_THRESHOLD = 30
export const PARTY_FINALE_THRESHOLD = 70

export const PARTY_STARTING_TOKENS = 1
export const PARTY_MAX_TOKENS = 3

export type PartyMomentumEvent =
  | Readonly<{
      type: 'successful_reaction'
      playerIndex: number
    }>
  | Readonly<{
      type: 'punishment_completed'
      participantPlayerIndices: readonly number[]
      amplified: boolean
      chain: boolean
      mutual: boolean
    }>

export interface PartyMomentumState {
  readonly playerCount: number
  readonly heat: number
  readonly heatContributionByPlayer: readonly number[]
  readonly heatLimitPending: boolean
  readonly tokensRemaining: readonly number[]
}

function assertMomentumState(state: PartyMomentumState): void {
  if (!Number.isInteger(state.playerCount) || state.playerCount <= 0) {
    throw new Error('Party Momentum 需要至少一名玩家')
  }
  if (!Number.isInteger(state.heat) || state.heat < 0 || state.heat > PARTY_HEAT_MAX) {
    throw new Error('Party heat 必须是 0–100 的整数')
  }
  if (
    typeof state.heatLimitPending !== 'boolean' ||
    state.heatLimitPending !== (state.heat === PARTY_HEAT_MAX)
  ) {
    throw new Error('Party heat 终局等待状态必须与 100 heat 保持一致')
  }
  if (
    state.heatContributionByPlayer.length !== state.playerCount ||
    state.heatContributionByPlayer.some(value => !Number.isInteger(value) || value < 0)
  ) {
    throw new Error('Party heat 贡献必须是与玩家人数一致的非负整数数组')
  }
  if (
    state.tokensRemaining.length !== state.playerCount ||
    state.tokensRemaining.some(
      value => !Number.isInteger(value) || value < 0 || value > PARTY_MAX_TOKENS
    )
  ) {
    throw new Error('Party 筹码必须是与玩家人数一致的有效整数数组')
  }
  if (state.heatContributionByPlayer.reduce((total, value) => total + value, 0) !== state.heat) {
    throw new Error('Party heat 贡献总和必须等于全局 heat')
  }
}

function normalizedParticipants(
  participantPlayerIndices: readonly number[],
  playerCount: number
): readonly number[] {
  if (participantPlayerIndices.length === 0) {
    throw new Error('完成惩罚至少需要一名实际参与玩家')
  }
  if (
    participantPlayerIndices.some(
      playerIndex => !Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= playerCount
    )
  ) {
    throw new Error('Momentum 事件包含无效玩家索引')
  }
  return Object.freeze([...new Set(participantPlayerIndices)].sort((left, right) => left - right))
}

export function recordPartyMomentum<T extends PartyMomentumState>(
  state: T,
  event: PartyMomentumEvent
): T {
  assertMomentumState(state)
  if (
    event.type === 'punishment_completed' &&
    [event.amplified, event.chain, event.mutual].some(value => typeof value !== 'boolean')
  ) {
    throw new Error('惩罚 Momentum 标记必须是布尔值')
  }
  const participants = normalizedParticipants(
    event.type === 'successful_reaction' ? [event.playerIndex] : event.participantPlayerIndices,
    state.playerCount
  )
  const awardedHeat =
    event.type === 'successful_reaction'
      ? 2
      : Math.min(12, 5 + (event.amplified ? 3 : 0) + (event.chain ? 2 : 0) + (event.mutual ? 2 : 0))
  const acceptedHeat = Math.min(awardedHeat, PARTY_HEAT_MAX - state.heat)
  const contributionByPlayer = [...state.heatContributionByPlayer]
  const sharedContribution = Math.floor(acceptedHeat / participants.length)
  let remainder = acceptedHeat % participants.length
  for (const playerIndex of participants) {
    contributionByPlayer[playerIndex] =
      (contributionByPlayer[playerIndex] ?? 0) + sharedContribution + (remainder > 0 ? 1 : 0)
    remainder = Math.max(0, remainder - 1)
  }
  const heat = state.heat + acceptedHeat
  const rewardsTokens =
    event.type === 'successful_reaction' || event.amplified || event.chain || event.mutual
  const tokensRemaining = state.tokensRemaining.map((remaining, playerIndex) =>
    rewardsTokens && participants.includes(playerIndex)
      ? Math.min(PARTY_MAX_TOKENS, remaining + 1)
      : remaining
  )

  return Object.freeze({
    ...state,
    heat,
    heatContributionByPlayer: Object.freeze(contributionByPlayer),
    heatLimitPending: state.heatLimitPending || heat === PARTY_HEAT_MAX,
    tokensRemaining: Object.freeze(tokensRemaining),
  }) as T
}

export function removePartyMomentumPlayer<T extends PartyMomentumState>(
  state: T,
  removedPlayerIndex: number
): T {
  assertMomentumState(state)
  if (state.playerCount <= 1) {
    throw new Error('Party Momentum 至少需要保留一名玩家')
  }
  if (
    !Number.isInteger(removedPlayerIndex) ||
    removedPlayerIndex < 0 ||
    removedPlayerIndex >= state.playerCount
  ) {
    throw new Error('无法移除无效的 Momentum 玩家索引')
  }

  const removedContribution = state.heatContributionByPlayer[removedPlayerIndex] ?? 0
  const heatContributionByPlayer = state.heatContributionByPlayer.filter(
    (_, index) => index !== removedPlayerIndex
  )
  const successorIndex = removedPlayerIndex % heatContributionByPlayer.length
  heatContributionByPlayer[successorIndex] =
    (heatContributionByPlayer[successorIndex] ?? 0) + removedContribution

  return Object.freeze({
    ...state,
    playerCount: state.playerCount - 1,
    heatContributionByPlayer: Object.freeze(heatContributionByPlayer),
    tokensRemaining: Object.freeze(
      state.tokensRemaining.filter((_, index) => index !== removedPlayerIndex)
    ),
  }) as T
}
