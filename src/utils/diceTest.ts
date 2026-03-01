// 骰子随机数分布测试工具
import { GAME_CONFIG } from '../config/gameConfig'
import { SecureRandom } from './secureRandom'
import { devLog } from './logger'

export interface DiceTestResult {
  totalRolls: number
  distribution: Record<number, number>
  percentages: Record<number, number>
  isBalanced: boolean
  report: string
}

export class DiceTestUtility {
  // 复制原始的随机数生成算法（仅用于测试对比，不推荐实际使用）
  static rollDice(): number {
    return (
      Math.floor(Math.random() * (GAME_CONFIG.DICE.MAX_VALUE - GAME_CONFIG.DICE.MIN_VALUE + 1)) +
      GAME_CONFIG.DICE.MIN_VALUE
    )
  }

  // 替代的随机数生成算法（更好的随机性）
  static rollDiceImproved(): number {
    // 使用crypto API获得更好的随机性（如果可用）
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      return (array[0] % 6) + 1
    }

    // fallback到标准算法
    return this.rollDice()
  }

  // 使用时间种子的随机数生成器
  static rollDiceWithTimeSeed(): number {
    // 使用当前时间戳和SecureRandom组合作为种子
    const timeSeed = Date.now() % 1000000
    const random = (Math.sin(timeSeed * SecureRandom.random()) + 1) / 2
    return Math.floor(random * 6) + 1
  }

  // 使用密码学安全随机数生成器（推荐）
  static rollDiceSecure(): number {
    return SecureRandom.randomInt(GAME_CONFIG.DICE.MIN_VALUE, GAME_CONFIG.DICE.MAX_VALUE)
  }

  // 执行大量测试并分析分布
  static testDistribution(
    rolls: number = 10000,
    method: 'original' | 'improved' | 'timeSeed' | 'secure' = 'secure'
  ): DiceTestResult {
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    }

    // 选择测试方法
    const rollMethod = {
      original: this.rollDice,
      improved: this.rollDiceImproved,
      timeSeed: this.rollDiceWithTimeSeed,
      secure: this.rollDiceSecure,
    }[method]

    // 执行大量骰子投掷
    for (let i = 0; i < rolls; i++) {
      const result = rollMethod()
      if (result >= 1 && result <= 6) {
        distribution[result]++
      }
    }

    // 计算百分比
    const percentages: Record<number, number> = {}
    for (let i = 1; i <= 6; i++) {
      percentages[i] = (distribution[i] / rolls) * 100
    }

    // 检查是否平衡（每个数字应该在15%-18%之间，允许2%的偏差）
    const expectedPercentage = 100 / 6 // 16.67%
    const tolerance = 2 // 允许2%的偏差
    const isBalanced = Object.values(percentages).every(
      percentage => Math.abs(percentage - expectedPercentage) <= tolerance
    )

    // 生成报告
    const report = this.generateReport(distribution, percentages, rolls, isBalanced, method)

    return {
      totalRolls: rolls,
      distribution,
      percentages,
      isBalanced,
      report,
    }
  }

  private static generateReport(
    distribution: Record<number, number>,
    percentages: Record<number, number>,
    totalRolls: number,
    isBalanced: boolean,
    method: string
  ): string {
    const lines = [
      `🎲 骰子随机性测试报告 (${method}方法)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `总投掷次数: ${totalRolls.toLocaleString()}`,
      '',
      '📊 分布统计:',
      ...Object.entries(distribution).map(
        ([num, count]) =>
          `  ${num}点: ${count.toLocaleString()}次 (${percentages[parseInt(num)].toFixed(2)}%)`
      ),
      '',
      '🎯 期望值: 每个数字 16.67% (允许偏差: ±2%)',
      `${isBalanced ? '✅ 分布平衡' : '❌ 分布不平衡'}`,
      '',
      '📈 详细分析:',
    ]

    // 分析每个数字的偏差
    const expectedPercentage = 100 / 6
    for (let i = 1; i <= 6; i++) {
      const deviation = percentages[i] - expectedPercentage
      const status = Math.abs(deviation) <= 2 ? '✅' : '⚠️'
      lines.push(`  ${i}点: ${status} 偏差 ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`)
    }

    if (!isBalanced) {
      lines.push('')
      lines.push('🔧 建议解决方案:')
      lines.push('  1. 使用crypto.getRandomValues()获得更好的随机性')
      lines.push('  2. 添加时间种子提高随机性')
      lines.push('  3. 增加随机数预处理步骤')
    }

    return lines.join('\n')
  }

  // 快速测试（在控制台输出结果）
  static quickTest(): void {
    devLog('🎲 开始骰子随机性快速测试...\n')

    const methods: Array<'original' | 'improved' | 'timeSeed' | 'secure'> = [
      'secure',
      'original',
      'improved',
      'timeSeed',
    ]

    methods.forEach(method => {
      const result = this.testDistribution(6000, method)
      devLog(result.report)
      devLog(`\n${'='.repeat(50)}\n`)
    })
  }

  // 连续小批量测试，模拟真实游戏场景
  static realGameSimulation(sessions: number = 100, rollsPerSession: number = 20): string {
    const results = []

    for (let session = 0; session < sessions; session++) {
      const sessionResults = []
      for (let roll = 0; roll < rollsPerSession; roll++) {
        sessionResults.push(this.rollDiceSecure())
      }

      // 统计这个session中6出现的次数
      const sixCount = sessionResults.filter(r => r === 6).length
      const sixPercentage = (sixCount / rollsPerSession) * 100

      results.push({
        session: session + 1,
        sixCount,
        sixPercentage,
        results: sessionResults,
      })
    }

    // 分析所有session
    const totalSixes = results.reduce((sum, r) => sum + r.sixCount, 0)
    const totalRolls = sessions * rollsPerSession
    const overallSixPercentage = (totalSixes / totalRolls) * 100

    const sessionsWithNoSix = results.filter(r => r.sixCount === 0).length
    const sessionsWithManySix = results.filter(r => r.sixCount >= 5).length

    return [
      '🎮 真实游戏场景模拟报告',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `游戏场次: ${sessions}`,
      `每场投掷次数: ${rollsPerSession}`,
      `总投掷次数: ${totalRolls}`,
      '',
      `📊 6点统计:`,
      `  总出现次数: ${totalSixes}`,
      `  总体概率: ${overallSixPercentage.toFixed(2)}% (期望: 16.67%)`,
      `  无6点场次: ${sessionsWithNoSix} (${((sessionsWithNoSix / sessions) * 100).toFixed(1)}%)`,
      `  高频6点场次: ${sessionsWithManySix} (${((sessionsWithManySix / sessions) * 100).toFixed(1)}%)`,
      '',
      `${Math.abs(overallSixPercentage - 16.67) <= 2 ? '✅ 在正常范围内' : '❌ 偏差过大'}`,
      '',
      '💡 如果6点出现频率明显低于16.67%，建议使用改进的随机数算法',
    ].join('\n')
  }
}

// 导出便捷测试函数
export const testDiceRandomness = () => DiceTestUtility.quickTest()
export const simulateRealGame = () => devLog(DiceTestUtility.realGameSimulation())
