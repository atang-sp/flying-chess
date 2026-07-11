import type {
  Player,
  PunishmentAction,
  ResolvedPunishmentResult,
} from '../types/game'

export type PunishmentRuleInput =
  | {
      source: 'board_punishment'
      actorIndex: number
      players: readonly Player[]
      boardAction: PunishmentAction
    }
  | {
      source: 'takeoff_failure'
      actorIndex: number
      players: readonly Player[]
      punishmentAction: PunishmentAction
    }

const copyAction = (action: PunishmentAction): Readonly<PunishmentAction> =>
  Object.freeze({
    ...action,
    tool: Object.freeze({ ...action.tool }),
    bodyPart: Object.freeze({ ...action.bodyPart }),
    position: Object.freeze({
      ...action.position,
      compatibleBodyParts: Object.freeze([...action.position.compatibleBodyParts]),
    }),
  })

export const resolveRule = (input: PunishmentRuleInput): ResolvedPunishmentResult => {
  if (input.actorIndex < 0 || input.actorIndex >= input.players.length) {
    throw new Error('规则解析需要有效的触发玩家索引')
  }

  const action = input.source === 'board_punishment' ? input.boardAction : input.punishmentAction
  const strikes = action.strikes
  if (strikes === undefined) {
    throw new Error('静态惩罚动作需要固定次数')
  }

  return Object.freeze({
    kind: 'punishment',
    source: input.source,
    actorIndex: input.actorIndex,
    targetPlayerIndex: input.actorIndex,
    action: copyAction(action),
    count: Object.freeze({ kind: 'fixed', value: strikes }),
    turnConsequence: Object.freeze({ kind: 'none' }),
  })
}
