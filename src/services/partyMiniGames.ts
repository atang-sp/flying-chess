import type { Player, ResolvedPunishmentResult } from '../types/game'
import { scaleResolvedPunishmentCount } from './ruleResolution'

export interface ReactionRaceState {
  readonly playerCount: number
  readonly winnerPlayerIndex?: number
  readonly winningTimeMs?: number
}

export interface MemoryChallenge {
  readonly sequence: readonly string[]
  readonly options: readonly string[]
}

export interface ConsumedPartyMiniGameModifier {
  readonly resolution: ResolvedPunishmentResult
  readonly player: Player
}

export interface PartyMiniGameOutcome {
  readonly winnerPlayerIndices: readonly number[]
  readonly loserPlayerIndices: readonly number[]
  readonly summary: string
}

const MEMORY_SYMBOLS = Object.freeze(['✈️', '🎲', '⚡', '🔥', '🎯', '🪄'])

export function createReactionRace(playerCount: number): ReactionRaceState {
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    throw new Error('反应速度测试至少需要两名玩家')
  }
  return Object.freeze({ playerCount })
}

export function recordReactionPress(
  state: ReactionRaceState,
  playerIndex: number,
  elapsedMs: number
): ReactionRaceState {
  if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= state.playerCount) {
    throw new Error('反应玩家不存在')
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('反应时间无效')
  if (state.winnerPlayerIndex !== undefined) return state
  return Object.freeze({
    ...state,
    winnerPlayerIndex: playerIndex,
    winningTimeMs: Math.round(elapsedMs),
  })
}

export function createMemoryChallenge(
  length: number,
  choice: (entries: readonly string[]) => string
): MemoryChallenge {
  if (!Number.isInteger(length) || length < 2 || length > 8) {
    throw new Error('记忆序列长度必须为 2–8')
  }
  return Object.freeze({
    sequence: Object.freeze(Array.from({ length }, () => choice(MEMORY_SYMBOLS))),
    options: MEMORY_SYMBOLS,
  })
}

export function consumePartyMiniGameModifier(
  resolution: ResolvedPunishmentResult,
  player: Player
): ConsumedPartyMiniGameModifier {
  if (player.pendingMiniGameImmunity) {
    const action = Object.freeze({
      ...resolution.action,
      strikes: 0,
      description: '小游戏免罚：本次惩罚次数为 0',
    })
    return Object.freeze({
      resolution: Object.freeze({
        ...resolution,
        action,
        count: Object.freeze({ kind: 'fixed' as const, value: 0 }),
        countMultiplier: undefined,
      }),
      player: { ...player, pendingMiniGameImmunity: undefined },
    })
  }

  const multiplier = player.pendingMiniGameMultiplier
  if (multiplier && multiplier > 0) {
    const amplified =
      resolution.count.kind === 'fixed'
        ? scaleResolvedPunishmentCount(resolution, multiplier)
        : Object.freeze({
            ...resolution,
            countMultiplier: (resolution.countMultiplier ?? 1) * multiplier,
          })
    return Object.freeze({
      resolution: amplified,
      player: { ...player, pendingMiniGameMultiplier: undefined },
    })
  }

  return Object.freeze({ resolution, player })
}
