/**
 * 🔒 密码学安全随机数生成器
 *
 * 使用拒绝采样 + crypto.getRandomValues() 实现完全均匀分布的随机数生成
 * 完全替代 Math.random()，提供军用级随机性保证
 */

export class SecureRandom {
  /**
   * 生成 [0, 1) 范围内的密码学安全随机浮点数
   * 替代 Math.random()
   */
  static random(): number {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('此环境不支持 crypto.getRandomValues()，无法提供密码学安全的随机数')
    }

    try {
      // 生成两个独立的随机源并混合以增强随机性
      const array1 = new Uint32Array(1)
      const array2 = new Uint32Array(1)
      crypto.getRandomValues(array1)
      crypto.getRandomValues(array2)

      // 使用加法混合，然后转换为 [0, 1) 范围的浮点数
      const mixedValue = (array1[0] + array2[0]) >>> 0
      return mixedValue / (0xffffffff + 1)
    } catch (error) {
      console.error('密码学随机数生成失败:', error)
      throw new Error('无法生成安全的随机数，请确保在现代浏览器环境中运行')
    }
  }

  /**
   * 生成指定范围内的密码学安全随机整数 [min, max]
   * @param min 最小值（包含）
   * @param max 最大值（包含）
   */
  static randomInt(min: number, max: number): number {
    const range = max - min + 1
    const maxValid = Math.floor(0xffffffff / range) * range

    let randomValue: number
    do {
      const array1 = new Uint32Array(1)
      const array2 = new Uint32Array(1)
      crypto.getRandomValues(array1)
      crypto.getRandomValues(array2)
      randomValue = (array1[0] + array2[0]) >>> 0
    } while (randomValue >= maxValid) // 拒绝采样确保均匀分布

    return (randomValue % range) + min
  }

  /**
   * 生成 [0, max) 范围内的随机整数
   * @param max 最大值（不包含）
   */
  static randomIntBelow(max: number): number {
    return this.randomInt(0, max - 1)
  }

  /**
   * 从数组中随机选择一个元素
   * @param array 源数组
   */
  static choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('不能从空数组中选择元素')
    }
    const index = this.randomIntBelow(array.length)
    return array[index]
  }

  /**
   * 随机打乱数组（Fisher-Yates洗牌算法）
   * @param array 要打乱的数组
   * @returns 新的打乱后的数组
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomIntBelow(i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * 生成指定长度的随机字符串
   * @param length 字符串长度
   * @param charset 字符集，默认为字母数字
   */
  static randomString(
    length: number,
    charset: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  ): string {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset[this.randomIntBelow(charset.length)]
    }
    return result
  }

  /**
   * 生成随机ID（类似原来的Math.random().toString(36)）
   * @param length 总长度，默认26
   */
  static randomId(length: number = 26): string {
    // 使用base36字符集 (0-9, a-z)
    const charset = '0123456789abcdefghijklmnopqrstuvwxyz'
    return this.randomString(length, charset)
  }

  /**
   * 根据权重随机选择
   * @param items 项目数组
   * @param weights 对应的权重数组
   */
  static weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('项目数组和权重数组长度必须相同')
    }
    if (items.length === 0) {
      throw new Error('不能从空数组中选择元素')
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    if (totalWeight <= 0) {
      throw new Error('权重总和必须大于0')
    }

    const randomValue = this.random() * totalWeight
    let currentWeight = 0

    for (let i = 0; i < items.length; i++) {
      currentWeight += weights[i]
      if (randomValue < currentWeight) {
        return items[i]
      }
    }

    // 回退到最后一个元素（理论上不应该到达这里）
    return items[items.length - 1]
  }

  /**
   * 生成指定范围内的随机浮点数 [min, max)
   * @param min 最小值（包含）
   * @param max 最大值（不包含）
   */
  static randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min
  }

  /**
   * 生成布尔值（50%概率）
   */
  static randomBoolean(): boolean {
    return this.random() < 0.5
  }

  /**
   * 根据概率生成布尔值
   * @param probability 为true的概率 [0, 1]
   */
  static randomBooleanWithProbability(probability: number): boolean {
    return this.random() < probability
  }
}
