import { describe, expect, it } from 'vitest'
import { getPunishmentVariantPresentation } from '../services/punishmentVariants'

describe('升温局惩罚变体', () => {
  it.each([
    ['blindbox', '盲盒惩罚', true],
    ['conditional', '条件惩罚', false],
    ['deferred', '延迟惩罚', false],
    ['mutual', '双向惩罚', false],
  ] as const)('为 %s 提供稳定的名称和现场执行契约', (variant, label, concealsDetails) => {
    const presentation = getPunishmentVariantPresentation(variant)

    expect(presentation).toMatchObject({ label, concealsDetails })
    expect(presentation.instruction.length).toBeGreaterThan(10)
  })
})
