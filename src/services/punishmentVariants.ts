import type { PunishmentVariant, ResolvedPunishmentResult } from '../types/game'
import { scaleResolvedPunishmentCount } from './ruleResolution'

export interface PunishmentVariantPresentation {
  readonly label: string
  readonly instruction: string
  readonly concealsDetails: boolean
}

const PRESENTATIONS: Readonly<Record<PunishmentVariant, PunishmentVariantPresentation>> =
  Object.freeze({
    blindbox: Object.freeze({
      label: '盲盒惩罚',
      instruction: '受罚玩家先不看内容，由执行者确认已准备好后再当场揭晓。',
      concealsDetails: true,
    }),
    conditional: Object.freeze({
      label: '条件惩罚',
      instruction:
        '由其他玩家先提出一个可当场验证的完成条件；完成则惩罚次数减半，未完成则照常执行。',
      concealsDetails: false,
    }),
    deferred: Object.freeze({
      label: '延迟惩罚',
      instruction: '先记下本次完整内容，在受罚玩家的下一个回合开始前再执行并确认。',
      concealsDetails: false,
    }),
    mutual: Object.freeze({
      label: '双向惩罚',
      instruction: '执行者先按本次内容惩罚目标玩家，随后两人交换角色，用相同内容再执行一次。',
      concealsDetails: false,
    }),
    encore: Object.freeze({
      label: '返场惩罚',
      instruction: '完成本次内容后，同一名受罚玩家立即以一半次数返场执行第二次。',
      concealsDetails: false,
    }),
  })

export function getPunishmentVariantPresentation(
  variant: PunishmentVariant
): PunishmentVariantPresentation {
  return PRESENTATIONS[variant]
}

export function resolveConditionalPunishment(
  resolution: ResolvedPunishmentResult,
  conditionMet: boolean
): ResolvedPunishmentResult {
  if (resolution.variant !== 'conditional' || resolution.variantPhase !== undefined) {
    throw new Error('只有尚未判定的条件惩罚可以结算条件')
  }

  const resolved = conditionMet
    ? resolution.count.kind === 'fixed'
      ? scaleResolvedPunishmentCount(resolution, 0.5)
      : Object.freeze({
          ...resolution,
          countMultiplier: (resolution.countMultiplier ?? 1) * 0.5,
        })
    : resolution

  return Object.freeze({ ...resolved, variantPhase: 'conditional_resolved' })
}

export function createDeferredPunishment(
  resolution: ResolvedPunishmentResult
): ResolvedPunishmentResult {
  if (resolution.variant !== 'deferred' || resolution.variantPhase !== undefined) {
    throw new Error('只有首次出现的延迟惩罚可以进入待执行队列')
  }
  if (resolution.count.kind !== 'fixed') {
    throw new Error('延迟前必须先确定惩罚次数')
  }

  return Object.freeze({ ...resolution, variantPhase: 'deferred_execution' })
}

export function createMutualPunishmentReturn(
  resolution: ResolvedPunishmentResult
): ResolvedPunishmentResult {
  if (resolution.variant !== 'mutual' || resolution.variantPhase !== undefined) {
    throw new Error('只有双向惩罚首次执行后可以交换角色')
  }
  if (resolution.executorIndex === undefined) {
    throw new Error('双向惩罚需要另一名玩家作为执行者')
  }

  return Object.freeze({
    ...resolution,
    targetPlayerIndex: resolution.executorIndex,
    executorIndex: resolution.targetPlayerIndex,
    variantPhase: 'mutual_return',
  })
}

export function createEncorePunishmentReturn(
  resolution: ResolvedPunishmentResult
): ResolvedPunishmentResult {
  if (resolution.variant !== 'encore' || resolution.variantPhase !== undefined) {
    throw new Error('只有返场惩罚首次执行后可以进入第二次')
  }
  if (resolution.count.kind !== 'fixed') {
    throw new Error('返场前必须先确定惩罚次数')
  }
  return Object.freeze({
    ...scaleResolvedPunishmentCount(resolution, 0.5),
    variantPhase: 'encore_return',
  })
}
