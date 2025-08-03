// 骰子随机性基准测试工具
import { GameService } from '../services/gameService'

export interface BenchmarkResult {
  totalRolls: number
  distribution: Record<number, number>
  percentages: Record<number, number>
  deviations: Record<number, number>
  isBalanced: boolean
  summary: string
  detailedReport: string
}

export class DiceBenchmark {
  // 执行基准测试
  static runBenchmark(rollCount: number): BenchmarkResult {
    console.log(`🎲 开始基准测试：${rollCount.toLocaleString()}次投掷...`)

    const startTime = performance.now()

    // 初始化分布统计
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    }

    // 执行大量投掷
    for (let i = 0; i < rollCount; i++) {
      const result = GameService.rollDice()
      if (result >= 1 && result <= 6) {
        distribution[result]++
      }
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 计算百分比
    const percentages: Record<number, number> = {}
    const deviations: Record<number, number> = {}
    const expectedPercentage = 100 / 6 // 16.6667%

    for (let i = 1; i <= 6; i++) {
      percentages[i] = (distribution[i] / rollCount) * 100
      deviations[i] = percentages[i] - expectedPercentage
    }

    // 根据统计学原理调整容忍偏差 (使用95%置信区间)
    // 对于骰子，标准偏差约为sqrt(n*p*(1-p)) = sqrt(n*1/6*5/6)
    // 95%置信区间约为 ±1.96*标准偏差/sqrt(n)
    const tolerance =
      rollCount <= 36
        ? 25 // 小样本允许25%偏差
        : rollCount <= 100
          ? 15 // 100次允许15%偏差
          : rollCount <= 216
            ? 10 // 216次允许10%偏差
            : rollCount <= 500
              ? 6 // 500次允许6%偏差
              : 4 // 1000次及以上允许4%偏差
    const isBalanced = Object.values(deviations).every(
      deviation => Math.abs(deviation) <= tolerance
    )

    // 生成简要总结
    const summary = this.generateSummary(rollCount, isBalanced, deviations, duration)

    // 生成详细报告
    const detailedReport = this.generateDetailedReport(
      rollCount,
      distribution,
      percentages,
      deviations,
      isBalanced,
      duration
    )

    console.log(`✅ 基准测试完成，耗时: ${duration.toFixed(2)}ms`)

    return {
      totalRolls: rollCount,
      distribution,
      percentages,
      deviations,
      isBalanced,
      summary,
      detailedReport,
    }
  }

  // 批量测试不同规模
  static runBatchBenchmark(rollCounts: number[] = [6, 36, 100, 216, 500, 1000]): BenchmarkResult[] {
    console.log('🚀 开始批量基准测试...')

    const results: BenchmarkResult[] = []

    for (const count of rollCounts) {
      const result = this.runBenchmark(count)
      results.push(result)
    }

    console.log('📊 批量测试完成！')
    return results
  }

  // 生成简要总结
  private static generateSummary(
    rollCount: number,
    isBalanced: boolean,
    deviations: Record<number, number>,
    duration: number
  ): string {
    const maxDeviation = Math.max(...Object.values(deviations).map(Math.abs))
    // 根据样本量调整问题判断标准
    const problemThreshold =
      rollCount <= 36
        ? 25
        : rollCount <= 100
          ? 15
          : rollCount <= 216
            ? 10
            : rollCount <= 500
              ? 6
              : 4

    const problemNumbers = Object.entries(deviations)
      .filter(([_, deviation]) => Math.abs(deviation) > problemThreshold)
      .map(([num, deviation]) => `${num}点(${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%)`)

    let status = '✅ 正常'
    if (!isBalanced) {
      if (maxDeviation > 3) {
        status = '❌ 严重偏差'
      } else {
        status = '⚠️ 轻微偏差'
      }
    }

    return [
      `投掷次数: ${rollCount.toLocaleString()}`,
      `测试耗时: ${duration.toFixed(2)}ms`,
      `随机性状态: ${status}`,
      `最大偏差: ${maxDeviation.toFixed(2)}%`,
      problemNumbers.length > 0 ? `问题数字: ${problemNumbers.join(', ')}` : '所有数字均正常',
    ].join(' | ')
  }

  // 生成详细报告
  private static generateDetailedReport(
    rollCount: number,
    distribution: Record<number, number>,
    percentages: Record<number, number>,
    deviations: Record<number, number>,
    isBalanced: boolean,
    duration: number
  ): string {
    // 计算当前样本的容忍偏差（基于统计学95%置信区间）
    const currentTolerance =
      rollCount <= 36
        ? 25
        : rollCount <= 100
          ? 15
          : rollCount <= 216
            ? 10
            : rollCount <= 500
              ? 6
              : 4

    const lines = [
      '🎲 骰子随机性基准测试报告',
      '='.repeat(50),
      `测试时间: ${new Date().toLocaleString()}`,
      `投掷次数: ${rollCount.toLocaleString()}`,
      `测试耗时: ${duration.toFixed(2)}ms`,
      `平均速度: ${((rollCount / duration) * 1000).toFixed(0)} 次/秒`,
      '',
      '📊 分布统计:',
      '─'.repeat(50),
      '点数 | 次数      | 百分比   | 偏差     | 状态',
      '─'.repeat(50),
    ]

    for (let i = 1; i <= 6; i++) {
      const count = distribution[i]
      const percentage = percentages[i]
      const deviation = deviations[i]
      const status =
        Math.abs(deviation) <= currentTolerance
          ? '✅ 正常'
          : Math.abs(deviation) <= currentTolerance * 2
            ? '⚠️ 偏差'
            : '❌ 异常'

      lines.push(
        `  ${i}  | ${count.toString().padStart(8)} | ${percentage.toFixed(2).padStart(6)}% | ${deviation > 0 ? '+' : ''}${deviation.toFixed(2).padStart(6)}% | ${status}`
      )
    }

    lines.push(
      '─'.repeat(50),
      '',
      '🎯 标准参考:',
      `期望值: 每个数字 ${(100 / 6).toFixed(2)}% (约${(rollCount / 6).toFixed(1)}次)`,
      `容忍偏差: ±${currentTolerance}%`,
      `测试结果: ${isBalanced ? '✅ 通过' : '❌ 未通过'}`,
      ''
    )

    if (!isBalanced) {
      lines.push(
        '⚠️ 检测到随机性问题:',
        ...Object.entries(deviations)
          .filter(([_, deviation]) => Math.abs(deviation) > 1.5)
          .map(
            ([num, deviation]) =>
              `  • ${num}点: 偏差${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% ${Math.abs(deviation) > 3 ? '(严重)' : '(轻微)'}`
          ),
        '',
        '💡 建议:',
        '  • 如果偏差持续存在，建议升级随机数生成算法',
        '  • 可以尝试使用crypto.getRandomValues()获得更好的随机性',
        '  • 建议进行更大样本量的测试以确认问题'
      )
    } else {
      lines.push(
        '✅ 随机性良好！',
        '  • 所有数字的分布都在正常范围内',
        '  • 当前的随机数算法表现符合预期'
      )
    }

    return lines.join('\n')
  }

  // 比较不同样本量的结果
  static compareBenchmarks(results: BenchmarkResult[]): string {
    const lines = [
      '📈 不同样本量随机性对比分析',
      '='.repeat(60),
      '样本量     | 状态     | 最大偏差 | 问题数字数量',
      '─'.repeat(60),
    ]

    results.forEach(result => {
      const maxDeviation = Math.max(...Object.values(result.deviations).map(Math.abs))
      const problemCount = Object.values(result.deviations).filter(d => Math.abs(d) > 1.5).length
      const status = result.isBalanced ? '✅ 正常' : '❌ 偏差'

      lines.push(
        `${result.totalRolls.toString().padStart(10)} | ${status.padEnd(8)} | ${maxDeviation.toFixed(2).padStart(6)}% | ${problemCount}`
      )
    })

    lines.push(
      '─'.repeat(60),
      '',
      '📊 趋势分析:',
      results.length >= 2 ? this.analyzeTrend(results) : '需要至少2个样本进行趋势分析'
    )

    return lines.join('\n')
  }

  // 分析趋势
  private static analyzeTrend(results: BenchmarkResult[]): string {
    const deviationTrends: string[] = []

    // 分析每个数字的偏差趋势
    for (let num = 1; num <= 6; num++) {
      const deviations = results.map(r => r.deviations[num])
      const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

      if (Math.abs(avgDeviation) > 1) {
        deviationTrends.push(
          `  • ${num}点: 平均偏差${avgDeviation > 0 ? '+' : ''}${avgDeviation.toFixed(2)}% ${Math.abs(avgDeviation) > 2 ? '(持续偏差)' : ''}`
        )
      }
    }

    const lines = []

    if (deviationTrends.length > 0) {
      lines.push('⚠️ 发现持续偏差:')
      lines.push(...deviationTrends)
      lines.push('')
      lines.push('💡 这表明可能存在系统性的随机性问题，建议考虑升级随机数算法')
    } else {
      lines.push('✅ 未发现持续性偏差问题')
      lines.push('  • 随着样本量增加，分布趋向均匀')
      lines.push('  • 当前随机数算法表现良好')
    }

    return lines.join('\n')
  }

  // 快速测试（控制台输出）
  static quickTest(): void {
    console.log('🎲 开始快速基准测试...\n')

    const testSizes = [6, 36, 100, 216, 500, 1000]
    const results = this.runBatchBenchmark(testSizes)

    console.log('\n📊 测试结果总览:')
    results.forEach(result => {
      console.log(result.summary)
    })

    console.log('\n📈 对比分析:')
    console.log(this.compareBenchmarks(results))

    console.log('\n📋 详细报告:')
    results.forEach((result, index) => {
      console.log(`\n[${index + 1}/${results.length}] ${result.totalRolls}次投掷详细报告:`)
      console.log(result.detailedReport)
    })
  }
}

// 导出便捷函数
export const runDiceBenchmark = (rollCount: number) => DiceBenchmark.runBenchmark(rollCount)
export const runBatchBenchmark = () => DiceBenchmark.runBatchBenchmark()
export const quickDiceTest = () => DiceBenchmark.quickTest()
