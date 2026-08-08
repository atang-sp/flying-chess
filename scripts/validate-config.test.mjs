import { describe, expect, it } from 'vitest'
import { validateConfigDocument } from './validate-config.ts'

const createEnvelope = data => ({
  version: '1.0.0',
  exportedAt: '2026-08-07T00:00:00.000Z',
  gameTitle: '飞行棋配置',
  description: '配置校验测试',
  data,
})

describe('配置运行时 contract 校验工具', () => {
  it('拒绝不包含任何可导入配置项的 data 对象', () => {
    const result = validateConfigDocument(createEnvelope({}))

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('data 至少需要包含一个可导入的配置项')
  })
})
