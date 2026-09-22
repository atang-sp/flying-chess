import { describe, expect, it } from 'vitest'
import { SecureRandom } from '../utils/secureRandom'

describe('SecureRandom 密码学随机数测试', () => {
  it('random() 生成 [0, 1) 范围内的浮点数', () => {
    for (let i = 0; i < 1000; i++) {
      const val = SecureRandom.random()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('randomInt(min, max) 严格落在 [min, max] 闭区间内', () => {
    const min = 1
    const max = 6
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const val = SecureRandom.randomInt(min, max)
      expect(val).toBeGreaterThanOrEqual(min)
      expect(val).toBeLessThanOrEqual(max)
      expect(Number.isInteger(val)).toBe(true)
      seen.add(val)
    }
    // 掷1000次必然覆盖1到6的所有点数
    expect(seen.size).toBe(6)
  })

  it('randomInt 当 min === max 时确定性返回该值', () => {
    for (let i = 0; i < 50; i++) {
      expect(SecureRandom.randomInt(42, 42)).toBe(42)
    }
  })

  it('randomInt 当 min > max 时抛出 RangeError', () => {
    expect(() => SecureRandom.randomInt(5, 3)).toThrow(RangeError)
  })

  it('randomIntBelow 拒绝非正数', () => {
    expect(() => SecureRandom.randomIntBelow(0)).toThrow(RangeError)
    expect(() => SecureRandom.randomIntBelow(-1)).toThrow(RangeError)
  })

  it('randomIntBelow(max) 返回 [0, max - 1]', () => {
    for (let i = 0; i < 200; i++) {
      const val = SecureRandom.randomIntBelow(5)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(4)
    }
  })

  it('choice 从非空数组中选择元素，空数组抛出异常', () => {
    expect(() => SecureRandom.choice([])).toThrow()
    const items = ['apple', 'banana', 'cherry']
    const picked = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const choice = SecureRandom.choice(items)
      expect(items).toContain(choice)
      picked.add(choice)
    }
    expect(picked.size).toBe(3)
  })

  it('shuffle 实现不改变原始数组并保留所有元素', () => {
    const original = [1, 2, 3, 4, 5]
    const copy = [...original]
    const shuffled = SecureRandom.shuffle(original)
    expect(original).toEqual(copy) // 原始数组未变
    expect(shuffled).toHaveLength(original.length)
    expect(shuffled.slice().sort()).toEqual(copy.slice().sort())
  })

  it('randomBooleanWithProbability 在 0 与 1 边界表现确定性', () => {
    for (let i = 0; i < 50; i++) {
      expect(SecureRandom.randomBooleanWithProbability(0)).toBe(false)
      expect(SecureRandom.randomBooleanWithProbability(1)).toBe(true)
    }
  })

  it('weightedChoice 按权重分配', () => {
    const items = ['rare', 'common']
    const weights = [1, 99]
    let rareCount = 0
    const total = 5000
    for (let i = 0; i < total; i++) {
      if (SecureRandom.weightedChoice(items, weights) === 'rare') {
        rareCount++
      }
    }
    // 期望 1% (约 50 次)，容差 3σ (约 ±21) -> [10, 100]
    expect(rareCount).toBeGreaterThan(10)
    expect(rareCount).toBeLessThan(120)
  })
})
