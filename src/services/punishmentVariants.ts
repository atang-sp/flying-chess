import type { PunishmentVariant } from '../types/game'

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
  })

export function getPunishmentVariantPresentation(
  variant: PunishmentVariant
): PunishmentVariantPresentation {
  return PRESENTATIONS[variant]
}
