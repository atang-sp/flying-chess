import type { Player, ResolvedPunishmentResult } from '../types/game'
import { scaleResolvedPunishmentCount } from './ruleResolution'

export type PartyPunishmentIntervention =
  | Readonly<{
      action: 'transfer'
      playerIndex: number
      targetPlayerIndex: number
    }>
  | Readonly<{
      action: 'amplify'
      playerIndex: number
    }>
  | Readonly<{
      action: 'immunity'
      playerIndex: number
    }>

export interface PartyPunishmentInterventionOutcome {
  readonly action: PartyPunishmentIntervention['action']
  readonly spentByPlayerIndex: number
  readonly resolution: ResolvedPunishmentResult | null
}

export interface PartyPunishmentInterventionOption {
  readonly playerIndex: number
  readonly actions: readonly PartyPunishmentIntervention['action'][]
  readonly transferTargetPlayerIndices: readonly number[]
}

/** Keep private token actions off the shared host screen for phone-controlled players. */
export function projectSharedScreenInterventionOptions(
  options: readonly PartyPunishmentInterventionOption[],
  isRemotePlayer: (playerIndex: number) => boolean
): readonly PartyPunishmentInterventionOption[] {
  return Object.freeze(options.filter(option => !isRemotePlayer(option.playerIndex)))
}

export function getPartyPunishmentInterventionOptions(
  resolution: ResolvedPunishmentResult,
  players: readonly Player[],
  tokensRemaining: readonly number[],
  interventionAlreadyUsed: boolean
): readonly PartyPunishmentInterventionOption[] {
  if (interventionAlreadyUsed) return Object.freeze([])

  return Object.freeze(
    players.flatMap((_, playerIndex) => {
      if ((tokensRemaining[playerIndex] ?? 0) <= 0) return []

      if (playerIndex === resolution.targetPlayerIndex) {
        const transferTargetPlayerIndices = players.flatMap((__, targetPlayerIndex) =>
          targetPlayerIndex === playerIndex ? [] : [targetPlayerIndex]
        )
        const actions: PartyPunishmentIntervention['action'][] = [
          ...(transferTargetPlayerIndices.length > 0 ? (['transfer'] as const) : []),
          'immunity',
        ]
        return [
          Object.freeze({
            playerIndex,
            actions: Object.freeze(actions),
            transferTargetPlayerIndices: Object.freeze(transferTargetPlayerIndices),
          }),
        ]
      }

      return [
        Object.freeze({
          playerIndex,
          actions: Object.freeze(['amplify'] as const),
          transferTargetPlayerIndices: Object.freeze([]),
        }),
      ]
    })
  )
}

export function applyPartyPunishmentIntervention(
  resolution: ResolvedPunishmentResult,
  intervention: PartyPunishmentIntervention,
  playerCount: number
): PartyPunishmentInterventionOutcome {
  if (
    !Number.isInteger(intervention.playerIndex) ||
    intervention.playerIndex < 0 ||
    intervention.playerIndex >= playerCount
  ) {
    throw new Error('惩罚干预需要存在的决策玩家')
  }
  if (intervention.action === 'immunity') {
    if (intervention.playerIndex !== resolution.targetPlayerIndex) {
      throw new Error('只有当前受罚玩家可以免疫惩罚')
    }
    return Object.freeze({
      action: intervention.action,
      spentByPlayerIndex: intervention.playerIndex,
      resolution: null,
    })
  }

  if (intervention.action === 'amplify') {
    if (intervention.playerIndex === resolution.targetPlayerIndex) {
      throw new Error('受罚玩家不能给自己加码')
    }
    return Object.freeze({
      action: intervention.action,
      spentByPlayerIndex: intervention.playerIndex,
      resolution:
        resolution.count.kind === 'fixed'
          ? scaleResolvedPunishmentCount(resolution, 2)
          : Object.freeze({
              ...resolution,
              countMultiplier: (resolution.countMultiplier ?? 1) * 2,
            }),
    })
  }

  if (intervention.playerIndex !== resolution.targetPlayerIndex) {
    throw new Error('只有当前受罚玩家可以转嫁惩罚')
  }
  if (
    !Number.isInteger(intervention.targetPlayerIndex) ||
    intervention.targetPlayerIndex < 0 ||
    intervention.targetPlayerIndex >= playerCount ||
    intervention.targetPlayerIndex === resolution.targetPlayerIndex
  ) {
    throw new Error('转嫁目标必须是存在的其他玩家')
  }

  const executorIndex =
    resolution.executorIndex === intervention.targetPlayerIndex
      ? resolution.targetPlayerIndex
      : resolution.executorIndex

  return Object.freeze({
    action: intervention.action,
    spentByPlayerIndex: intervention.playerIndex,
    resolution: Object.freeze({
      ...resolution,
      targetPlayerIndex: intervention.targetPlayerIndex,
      executorIndex,
    }),
  })
}
